import { NextResponse } from "next/server";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import { spawn } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIT_ROOT = path.resolve(process.cwd(), "..");
const OUTPUT = path.join(AUDIT_ROOT, "output");
const RUNS_ROOT = path.join(OUTPUT, "_runs");
const UPLOADS_ROOT = path.join(RUNS_ROOT, "_uploads");
const CACHE_ROOT = path.join(RUNS_ROOT, "_cache");

const LOCK_PATH = path.join(RUNS_ROOT, "_active.lock");
const LOCK_TTL_MS = 30 * 60 * 1000;

const IEPS_DIR = path.join(AUDIT_ROOT, "ieps");
const CANON_DIR = path.join(AUDIT_ROOT, "input", "_CANONICAL");

const PIPELINE_BASE: string[][] = [
  ["scripts/11_merge_reference_testhound_exports.py"],
  ["scripts/10_build_id_crosswalk.py"],
  ["scripts/01_normalize_testhound.py"],
  ["scripts/02_extract_ieps.py"],
  ["scripts/03_build_audit.py"],
  // scripts/06_required_output.py appended dynamically
];

type Scope = "all" | "case_manager";
type ManifestStatus = "running" | "done" | "error";
type Module = "accommodations" | "goals" | "plaafp";

type RunSelection = {
  module?: Module;
  scope: Scope;
  caseManagerKey?: string;
  caseManagerName?: string;
  uploadBatchId?: string;
  cacheHit?: boolean;
};

type RunManifestOutputs = {
  primaryXlsx?: string; // relative to OUTPUT
  pdf?: string; // relative to OUTPUT
  xlsxList?: string[]; // relative to OUTPUT
  gsheetUrl?: string;
  gformUrl?: string;
};

type RunManifest = {
  ok: true;
  runId: string;
  startedAt: string;
  finishedAt?: string;
  status: ManifestStatus;
  selection?: RunSelection;
  outputs: RunManifestOutputs;
};

type FoundFile = {
  abs: string;
  relToOutput: string;
  mtimeMs: number;
};

function safeId(id: string): boolean {
  return /^[a-zA-Z0-9._-]{6,200}$/.test(id);
}

function makeRunId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function toScope(x: unknown): Scope {
  return x === "case_manager" ? "case_manager" : "all";
}

function normString(x: unknown): string {
  return typeof x === "string" ? x.trim() : "";
}

function keyFromName(name: string): string {
  const cleaned = name
    .trim()
    .replaceAll(",", "")
    .replaceAll(" ", "_")
    .replace(/[^A-Za-z0-9_]+/g, "");
  return cleaned || "BLANK_CASE_MANAGER";
}

function buildPipeline(selection?: RunSelection): string[][] {
  const steps: string[][] = [...PIPELINE_BASE];

  if (selection?.scope === "case_manager") {
    const cmNameRaw = normString(selection.caseManagerName);
    const cmName =
      cmNameRaw.length > 0 ? cmNameRaw : normString(selection.caseManagerKey).replaceAll("_", " ");

    if (cmName.length > 0) steps.push(["scripts/06_required_output.py", "--case-manager", cmName]);
    else steps.push(["scripts/06_required_output.py"]);
  } else {
    steps.push(["scripts/06_required_output.py"]);
  }

  return steps;
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function listDirSafe(dir: string): Promise<Dirent[]> {
  try {
    return await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function copyDir(src: string, dst: string): Promise<void> {
  await ensureDir(dst);
  const entries = await listDirSafe(src);
  for (const ent of entries) {
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) {
      await copyDir(s, d);
    } else if (ent.isFile()) {
      await fs.copyFile(s, d).catch(() => {});
    }
  }
}

async function removeDirContents(dir: string): Promise<void> {
  const entries = await listDirSafe(dir);
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    await fs.rm(p, { recursive: true, force: true }).catch(() => {});
  }
}

async function walkFiles(
  rootAbs: string,
  opts?: { maxDepth?: number; ignoreDirs?: Set<string> }
): Promise<FoundFile[]> {
  const maxDepth = opts?.maxDepth ?? 6;
  const ignoreDirs = opts?.ignoreDirs ?? new Set<string>(["_runs"]);
  const out: FoundFile[] = [];

  async function rec(dirAbs: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    let entries: Dirent[];
    try {
      entries = await fs.readdir(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }

    for (const ent of entries) {
      const abs = path.join(dirAbs, ent.name);

      if (ent.isDirectory()) {
        if (ignoreDirs.has(ent.name)) continue;
        await rec(abs, depth + 1);
        continue;
      }

      if (!ent.isFile()) continue;

      try {
        const st = await fs.stat(abs);
        out.push({
          abs,
          relToOutput: path.relative(OUTPUT, abs).replaceAll("\\", "/"),
          mtimeMs: st.mtimeMs,
        });
      } catch {
        // ignore
      }
    }
  }

  await rec(rootAbs, 0);
  return out;
}

function pickNewestByExt(files: FoundFile[], ext: string, sinceMs: number): string | undefined {
  const wanted = files
    .filter((f) => f.relToOutput.toLowerCase().endsWith(ext))
    .filter((f) => f.mtimeMs >= sinceMs)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return wanted[0]?.relToOutput;
}

function pickPreferredXlsx(files: FoundFile[], sinceMs: number, selection?: RunSelection): string | undefined {
  const xlsxFiles = files
    .filter((f) => f.relToOutput.toLowerCase().endsWith(".xlsx"))
    .filter((f) => f.mtimeMs >= sinceMs);

  if (xlsxFiles.length === 0) return undefined;

  if (selection?.scope === "case_manager" && selection.caseManagerKey) {
    const wanted = `required_audit_table__${selection.caseManagerKey}.xlsx`.toLowerCase();
    const hit = xlsxFiles.find((f) => path.basename(f.relToOutput).toLowerCase() === wanted);
    if (hit) return hit.relToOutput;
  }

  const priorityNames = [
    "FINAL_STAAR_IEP_TestHound_Audit.xlsx",
    "REQUIRED_AUDIT_TABLE__ALL_CASE_MANAGERS.xlsx",
    "REQUIRED_AUDIT_TABLE.xlsx",
    "Mismatch_Report.xlsx",
    "Mismatch_DeepDive.xlsx",
  ].map((s) => s.toLowerCase());

  for (const p of priorityNames) {
    const hit = xlsxFiles.find((f) => path.basename(f.relToOutput).toLowerCase() === p);
    if (hit) return hit.relToOutput;
  }

  xlsxFiles.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return xlsxFiles[0]?.relToOutput;
}

async function latestUploadBatchId(): Promise<string | null> {
  const entries = await listDirSafe(UPLOADS_ROOT);
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (dirs.length === 0) return null;

  let best: { id: string; mtime: number } | null = null;
  for (const id of dirs) {
    const mf = path.join(UPLOADS_ROOT, id, "uploads.manifest.json");
    try {
      const st = await fs.stat(mf);
      if (!best || st.mtimeMs > best.mtime) best = { id, mtime: st.mtimeMs };
    } catch {
      // ignore
    }
  }

  return best?.id ?? (dirs.sort().slice(-1)[0] ?? null);
}

async function attachUploadBatchToFixedPaths(
  runWorkDir: string,
  uploadBatchId: string,
  appendLog: (s: string) => Promise<void>
): Promise<void> {
  const batchRoot = path.join(UPLOADS_ROOT, uploadBatchId);
  const mfPath = path.join(batchRoot, "uploads.manifest.json");

  if (!(await fileExists(mfPath))) {
    throw new Error(`Upload batch not found: ${uploadBatchId}`);
  }

  await appendLog(`[UPLOAD_BATCH] ${uploadBatchId}\n`);
  await appendLog(`[UPLOAD_BATCH_ROOT] ${batchRoot}\n`);

  const backupDir = path.join(runWorkDir, "backup");
  const backupIeps = path.join(backupDir, "ieps_prev");
  const backupCanon = path.join(backupDir, "canon_prev");

  await ensureDir(backupDir);

  if (await fileExists(IEPS_DIR)) {
    await ensureDir(backupIeps);
    await copyDir(IEPS_DIR, backupIeps);
    await appendLog(`[BACKUP] ieps -> ${backupIeps}\n`);
    await removeDirContents(IEPS_DIR);
  } else {
    await ensureDir(IEPS_DIR);
  }

  if (await fileExists(CANON_DIR)) {
    await ensureDir(backupCanon);
    await copyDir(CANON_DIR, backupCanon);
    await appendLog(`[BACKUP] input/_CANONICAL -> ${backupCanon}\n`);
    await removeDirContents(CANON_DIR);
  } else {
    await ensureDir(CANON_DIR);
  }

  const stagedIeps = path.join(batchRoot, "ieps");
  const stagedCanon = path.join(batchRoot, "canon");
  const stagedOther = path.join(batchRoot, "other");

  if (await fileExists(stagedIeps)) {
    await copyDir(stagedIeps, IEPS_DIR);
    await appendLog(`[ATTACH] staged ieps -> ${IEPS_DIR}\n`);
  }
  if (await fileExists(stagedCanon)) {
    await copyDir(stagedCanon, CANON_DIR);
    await appendLog(`[ATTACH] staged canon -> ${CANON_DIR}\n`);
  }
  if (await fileExists(stagedOther)) {
    const otherDest = path.join(runWorkDir, "other_uploads");
    await copyDir(stagedOther, otherDest);
    await appendLog(`[ATTACH] staged other -> ${otherDest}\n`);
  }
}

function cacheKeyFor(batchId: string, scope: Scope, cmKey: string): string {
  const safe = `${batchId}__${scope}__${cmKey || "ALL"}`.replace(/[^a-zA-Z0-9._-]+/g, "_");
  return safe.slice(0, 180);
}

async function tryCacheHit(
  cacheKey: string,
  runArtifactsDir: string,
  appendLog: (s: string) => Promise<void>
): Promise<RunManifest | null> {
  const cacheDir = path.join(CACHE_ROOT, cacheKey);
  const cacheManifestPath = path.join(cacheDir, "cache.manifest.json");
  const cacheArtifactsDir = path.join(cacheDir, "artifacts");

  if (!(await fileExists(cacheManifestPath))) return null;
  if (!(await fileExists(cacheArtifactsDir))) return null;

  const cached = await readJson<RunManifest>(cacheManifestPath);
  if (!cached || cached.ok !== true) return null;

  await ensureDir(runArtifactsDir);
  await copyDir(cacheArtifactsDir, runArtifactsDir);

  await appendLog(`[CACHE HIT] key=${cacheKey}\n`);
  return cached;
}

async function writeCache(cacheKey: string, manifest: RunManifest, runArtifactsDir: string): Promise<void> {
  const cacheDir = path.join(CACHE_ROOT, cacheKey);
  const cacheArtifactsDir = path.join(cacheDir, "artifacts");
  const cacheManifestPath = path.join(cacheDir, "cache.manifest.json");

  await ensureDir(cacheDir);
  await ensureDir(cacheArtifactsDir);

  await copyDir(runArtifactsDir, cacheArtifactsDir);
  await writeJson(cacheManifestPath, manifest);
}

async function releaseLock(): Promise<void> {
  try {
    await fs.unlink(LOCK_PATH);
  } catch {
    // ok
  }
}

async function acquireLockOrFail(runIdValue: string): Promise<NextResponse | null> {
  try {
    const st = await fs.stat(LOCK_PATH);
    const age = Date.now() - st.mtimeMs;
    if (age < LOCK_TTL_MS) {
      return NextResponse.json(
        { ok: false, error: "A pipeline run is already in progress. Please refresh logs." },
        { status: 409 }
      );
    }
    await fs.unlink(LOCK_PATH);
  } catch {
    // ok
  }

  await fs.writeFile(LOCK_PATH, `runId=${runIdValue}\nstarted=${new Date().toISOString()}\n`);
  return null;
}

export async function POST(req: Request): Promise<NextResponse> {
  const id = makeRunId();
  if (!safeId(id)) {
    return NextResponse.json({ ok: false, error: "Invalid run id." }, { status: 500 });
  }

  const runDir = path.join(RUNS_ROOT, id);
  const logPath = path.join(runDir, "run.log");
  const manifestPath = path.join(runDir, "manifest.json");
  const artifactsDir = path.join(runDir, "artifacts");
  const workDir = path.join(runDir, "work");

  let selection: RunSelection | undefined;

  // helpers that must exist for catch
  let appendLog: ((chunk: string | Buffer) => Promise<void>) | null = null;

  const writeManifestSafe = async (m: RunManifest) => {
    try {
      await writeJson(manifestPath, m);
    } catch {
      // ignore
    }
  };

  const stampError = async (message: string) => {
    try {
      if (appendLog) {
        await appendLog(`\n[RUN ERROR] ${new Date().toISOString()}\n`);
        await appendLog(`${message}\n`);
      }
    } catch {
      // ignore
    }
  };

  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const body: unknown = await req.json();
      if (isObject(body)) {
        const moduleRaw = normString(body.module);
        const module: Module =
          moduleRaw === "goals" || moduleRaw === "plaafp" || moduleRaw === "accommodations"
            ? moduleRaw
            : "accommodations";

        const scope = toScope(body.scope);
        const cmKey = normString(body.caseManagerKey);
        const cmName = normString(body.caseManagerName);
        const uploadBatchId = normString(body.uploadBatchId);

        if (scope === "case_manager") {
          const key = cmKey.length > 0 ? cmKey : cmName.length > 0 ? keyFromName(cmName) : "";
          selection = { module, scope };
          if (key.length > 0) selection.caseManagerKey = key;
          if (cmName.length > 0) selection.caseManagerName = cmName;
          if (uploadBatchId.length > 0) selection.uploadBatchId = uploadBatchId;
        } else {
          selection = { module, scope: "all" };
          if (uploadBatchId.length > 0) selection.uploadBatchId = uploadBatchId;
        }
      }
    }
  } catch {
    // ignore body parse failures
  }

  let lockAcquired = false;

  const startedAt = new Date();
  const startedAtMs = Date.now();

  try {
    await ensureDir(RUNS_ROOT);
    await ensureDir(CACHE_ROOT);
    await ensureDir(runDir);
    await ensureDir(artifactsDir);
    await ensureDir(workDir);

    // define appendLog after runDir exists
    appendLog = async (chunk: string | Buffer) => {
      await fs.appendFile(logPath, chunk);
    };

    const lockResp = await acquireLockOrFail(id);
    if (lockResp) return lockResp;
    lockAcquired = true;

    const venvPython = path.join(AUDIT_ROOT, ".venv", "bin", "python");
    let pythonCmd = venvPython;
    try {
      await fs.access(venvPython);
    } catch {
      pythonCmd = "python3";
    }

    await appendLog(`[RUN START] ${startedAt.toISOString()}\n`);
    await appendLog(`[AUDIT_ROOT] ${AUDIT_ROOT}\n`);
    await appendLog(`[PYTHON] ${pythonCmd}\n`);

    const batchId = selection?.uploadBatchId?.trim() || (await latestUploadBatchId());
    if (!batchId) throw new Error("No upload batch found. Upload files first.");

    const baseSel: RunSelection = selection ?? { scope: "all" };
    const sel: RunSelection = { ...baseSel, uploadBatchId: batchId };

    if (sel.module && sel.module !== "accommodations") {
      const msg =
        sel.module === "goals"
          ? "Goals Galexii pipeline is not wired yet. Next: add goals extraction scripts + artifacts."
          : "PLAAFP Galexii pipeline is not wired yet. Next: add PLAAFP extraction scripts + artifacts.";

      await stampError(msg);

      const fail: RunManifest = {
        ok: true,
        runId: id,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
        status: "error",
        selection: sel,
        outputs: {},
      };
      await writeManifestSafe(fail);

      return NextResponse.json({ ok: false, error: msg }, { status: 501 });
    }

    const cmKeyForCache =
      sel.scope === "case_manager"
        ? sel.caseManagerKey?.trim() || (sel.caseManagerName ? keyFromName(sel.caseManagerName) : "")
        : "ALL";

    const cacheKey = cacheKeyFor(batchId, sel.scope, cmKeyForCache);

    const seed: RunManifest = {
      ok: true,
      runId: id,
      startedAt: startedAt.toISOString(),
      status: "running",
      selection: sel,
      outputs: {},
    };

    await writeJson(manifestPath, seed);

    const cached = await tryCacheHit(cacheKey, artifactsDir, appendLog);
    if (cached) {
      const finishedAt = new Date();

      const producedEntries = await listDirSafe(artifactsDir);
      const xlsx = producedEntries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".xlsx"))
        .map((e) => e.name);

      const pdfs = producedEntries
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".pdf"))
        .map((e) => e.name);

      let primaryBase: string | undefined;
      if (sel.scope === "case_manager") {
        const expected = `REQUIRED_AUDIT_TABLE__${cmKeyForCache}.xlsx`.toLowerCase();
        primaryBase = xlsx.find((n) => n.toLowerCase() === expected) ?? xlsx[0];
      } else {
        primaryBase =
          xlsx.find((n) => n.toLowerCase() === "required_audit_table__all_case_managers.xlsx") ?? xlsx[0];
      }

      const xlsxListRun = xlsx.map((base) => `_runs/${id}/artifacts/${base}`);

      const outputs: RunManifestOutputs = {};
      if (primaryBase) outputs.primaryXlsx = `_runs/${id}/artifacts/${primaryBase}`;
      if (xlsxListRun.length > 0) outputs.xlsxList = xlsxListRun;
      if (pdfs[0]) outputs.pdf = `_runs/${id}/artifacts/${pdfs[0]}`;
      if (cached.outputs.gsheetUrl) outputs.gsheetUrl = cached.outputs.gsheetUrl;
      if (cached.outputs.gformUrl) outputs.gformUrl = cached.outputs.gformUrl;

      const done: RunManifest = {
        ok: true,
        runId: id,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        status: "done",
        selection: { ...sel, cacheHit: true },
        outputs,
      };

      await appendLog(`[RUN DONE] ${finishedAt.toISOString()} (cache)\n`);
      await writeJson(manifestPath, done);

      return NextResponse.json({ ok: true, runId: id });
    }

    await attachUploadBatchToFixedPaths(workDir, batchId, appendLog);

    await appendLog(
      `[SCOPE] ${sel.scope}` +
        (sel.caseManagerKey ? ` key=${sel.caseManagerKey}` : "") +
        (sel.caseManagerName ? ` name="${sel.caseManagerName}"` : "") +
        `\n\n`
    );

    const pipeline = buildPipeline(sel);

    for (const args of pipeline) {
      await appendLog(`\n[STEP] ${pythonCmd} ${args.join(" ")}\n`);

      await new Promise<void>((resolve, reject) => {
        const p = spawn(pythonCmd, args, { cwd: AUDIT_ROOT });
        p.stdout.on("data", (d) => void appendLog!(d));
        p.stderr.on("data", (d) => void appendLog!(d));
        p.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Exit code ${String(code)} for: ${args.join(" ")}`));
        });
      });
    }

    const finishedAt = new Date();
    await appendLog(`\n[RUN DONE] ${finishedAt.toISOString()}\n`);

    const files = await walkFiles(OUTPUT, { maxDepth: 6, ignoreDirs: new Set(["_runs"]) });

    const xlsxProduced = files
      .filter((f) => f.relToOutput.toLowerCase().endsWith(".xlsx"))
      .filter((f) => f.mtimeMs >= startedAtMs - 2000);

    const pdfRel = pickNewestByExt(files, ".pdf", startedAtMs - 2000);
    const primaryRel = pickPreferredXlsx(files, startedAtMs - 2000, sel);

    const xlsxListRun: string[] = [];
    for (const f of xlsxProduced) {
      const base = path.basename(f.relToOutput);
      const destAbs = path.join(artifactsDir, base);
      try {
        await fs.copyFile(f.abs, destAbs);
        xlsxListRun.push(`_runs/${id}/artifacts/${base}`.replaceAll("\\", "/"));
      } catch {
        // ignore
      }
    }

    let primaryRun: string | undefined;
    if (sel.scope === "case_manager") {
      const key = sel.caseManagerKey || (sel.caseManagerName ? keyFromName(sel.caseManagerName) : "");
      if (key) {
        const expectedBase = `REQUIRED_AUDIT_TABLE__${key}.xlsx`;
        const expectedRel = `_runs/${id}/artifacts/${expectedBase}`.replaceAll("\\", "/");
        if (xlsxListRun.includes(expectedRel)) primaryRun = expectedRel;
      }
    }

    if (!primaryRun && primaryRel) {
      const base = path.basename(primaryRel);
      const candidate = `_runs/${id}/artifacts/${base}`.replaceAll("\\", "/");
      if (xlsxListRun.includes(candidate)) primaryRun = candidate;
    }

    if (!primaryRun && xlsxListRun.length > 0) primaryRun = xlsxListRun[0];

    let pdfRun: string | undefined;
    if (pdfRel) {
      const pdfAbs = path.join(OUTPUT, pdfRel);
      const base = path.basename(pdfRel);
      const destAbs = path.join(artifactsDir, base);
      try {
        await fs.copyFile(pdfAbs, destAbs);
        pdfRun = `_runs/${id}/artifacts/${base}`.replaceAll("\\", "/");
      } catch {
        // ignore
      }
    }

    await appendLog(`[ARTIFACTS] primaryXlsx=${primaryRun ?? "none"} pdf=${pdfRun ?? "none"}\n`);

    const outputs: RunManifestOutputs = {};
    if (primaryRun) outputs.primaryXlsx = primaryRun;
    if (pdfRun) outputs.pdf = pdfRun;
    if (xlsxListRun.length > 0) outputs.xlsxList = xlsxListRun;

    const done: RunManifest = {
      ok: true,
      runId: id,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      status: "done",
      selection: sel,
      outputs,
    };

    await writeJson(manifestPath, done);
    await writeCache(cacheKey, done, artifactsDir);

    return NextResponse.json({ ok: true, runId: id });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    await stampError(message || "Run failed.");

    const fail: RunManifest = {
      ok: true,
      runId: id,
      startedAt: startedAt.toISOString(),
      finishedAt: new Date().toISOString(),
      status: "error",
      selection,
      outputs: {},
    };
    await writeManifestSafe(fail);

    return NextResponse.json({ ok: false, error: message || "Run failed." }, { status: 500 });
  } finally {
    if (lockAcquired) {
      await releaseLock();
    }
  }
}
