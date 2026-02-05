import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import type { ReadStream } from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIT_ROOT = path.resolve(process.cwd(), "..");
const OUTPUT = path.join(AUDIT_ROOT, "output");
const OUTPUT_REAL = path.resolve(OUTPUT);
const RUNS_ROOT = path.join(OUTPUT, "_runs");
const RUNS_ROOT_REAL = path.resolve(RUNS_ROOT);

type ArtifactFormat = "xlsx" | "pdf" | "html" | "gsheet" | "gform";

type ManifestOutputs = {
  primaryXlsx?: string; // relative to OUTPUT (often _runs/<id>/artifacts/...)
  xlsxList?: string[];
  pdf?: string;
  gsheetUrl?: string;
  gformUrl?: string;

  // NEW: matches /api/run manifest fields
  deliberationsHtml?: string;
  deliberationsDocx?: string;
  deliberationsPdf?: string;
};

type Manifest = {
  ok?: boolean;
  status?: string;
  outputs?: ManifestOutputs;
};

// ✅ Next route ctx params are Promise-wrapped in your Next version
type RouteCtx = { params: Promise<{ runID: string }> };

function safeId(id: string) {
  return /^[a-zA-Z0-9._-]{6,200}$/.test(id);
}

function isFormat(x: string | null): x is ArtifactFormat {
  return x === "xlsx" || x === "pdf" || x === "html" || x === "gsheet" || x === "gform";
}

function contentTypeFor(format: ArtifactFormat) {
  switch (format) {
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "pdf":
      return "application/pdf";
    case "html":
      return "text/html; charset=utf-8";
    default:
      return "application/json; charset=utf-8";
  }
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function isHttpUrl(x: unknown): x is string {
  return typeof x === "string" && /^https?:\/\//i.test(x);
}

function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

function getStringArray(obj: Record<string, unknown>, key: string): string[] | undefined {
  const v = obj[key];
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((item): item is string => typeof item === "string");
  return out.length > 0 ? out : undefined;
}

function parseManifest(x: unknown): Manifest | null {
  if (!isObject(x)) return null;

  const outputsRaw: Record<string, unknown> | undefined = isObject((x as any).outputs)
    ? ((x as any).outputs as Record<string, unknown>)
    : undefined;

  const primaryXlsx = outputsRaw ? getString(outputsRaw, "primaryXlsx") : undefined;
  const xlsxList = outputsRaw ? getStringArray(outputsRaw, "xlsxList") : undefined;
  const pdf = outputsRaw ? getString(outputsRaw, "pdf") : undefined;
  const gsheetUrl = outputsRaw ? getString(outputsRaw, "gsheetUrl") : undefined;
  const gformUrl = outputsRaw ? getString(outputsRaw, "gformUrl") : undefined;

  const deliberationsHtml = outputsRaw ? getString(outputsRaw, "deliberationsHtml") : undefined;
  const deliberationsDocx = outputsRaw ? getString(outputsRaw, "deliberationsDocx") : undefined;
  const deliberationsPdf = outputsRaw ? getString(outputsRaw, "deliberationsPdf") : undefined;

  const outputs: ManifestOutputs | undefined = outputsRaw
    ? {
        ...(primaryXlsx ? { primaryXlsx } : {}),
        ...(xlsxList ? { xlsxList } : {}),
        ...(pdf ? { pdf } : {}),
        ...(gsheetUrl ? { gsheetUrl } : {}),
        ...(gformUrl ? { gformUrl } : {}),
        ...(deliberationsHtml ? { deliberationsHtml } : {}),
        ...(deliberationsDocx ? { deliberationsDocx } : {}),
        ...(deliberationsPdf ? { deliberationsPdf } : {}),
      }
    : undefined;

  const ok = typeof (x as any).ok === "boolean" ? ((x as any).ok as boolean) : undefined;
  const status = typeof (x as any).status === "string" ? ((x as any).status as string) : undefined;

  return {
    ...(ok !== undefined ? { ok } : {}),
    ...(status ? { status } : {}),
    ...(outputs ? { outputs } : {}),
  };
}

function isSafeRelPath(rel: string) {
  if (!rel || rel.length > 800) return false;
  if (rel.includes("\\") || rel.startsWith("/") || rel.startsWith("..")) return false;
  if (rel.includes("../")) return false;
  return /^[a-zA-Z0-9._/\- ]+$/.test(rel);
}

async function resolveInsideOutput(relPath: string) {
  if (!isSafeRelPath(relPath)) return null;

  const abs = path.resolve(OUTPUT, relPath);
  if (!abs.startsWith(OUTPUT_REAL + path.sep)) return null;

  try {
    const realAbs = await fs.realpath(abs);
    if (!realAbs.startsWith(OUTPUT_REAL + path.sep)) return null;
    return realAbs;
  } catch {
    return null;
  }
}

async function readJsonIfExists(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function fileExists(filePath: string) {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function sanitizeFilename(name: string) {
  const base = path.basename(name);
  return base.replace(/[\r\n"]/g, "_");
}

function contentDisposition(filename: string, mode: "attachment" | "inline") {
  return `${mode}; filename="${sanitizeFilename(filename)}"`;
}

/**
 * Reliable Node stream -> Web ReadableStream adapter (no Readable.toWeb dependency)
 */
function nodeStreamToWeb(stream: ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      stream.on("data", (chunk) => {
        const u8 =
          typeof chunk === "string"
            ? new TextEncoder().encode(chunk)
            : chunk instanceof Uint8Array
              ? chunk
              : new Uint8Array(chunk);
        controller.enqueue(u8);
      });
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
    cancel() {
      try {
        stream.destroy();
      } catch {}
    },
  });
}

async function pickFromRunArtifacts(runId: string, fmt: "xlsx" | "pdf", wantedBase?: string | null) {
  const dir = path.join(RUNS_ROOT, runId, "artifacts");
  const dirAbs = path.resolve(dir);
  if (!dirAbs.startsWith(RUNS_ROOT_REAL + path.sep)) return null;

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((n) => n.toLowerCase().endsWith(`.${fmt}`));

    if (wantedBase) {
      const wantedLower = wantedBase.toLowerCase();
      const hit = files.find((n) => n.toLowerCase() === wantedLower);
      if (hit) return path.join(dir, hit);
    }

    if (files.length === 0) return null;

    let best: { name: string; mtimeMs: number } | null = null;
    for (const name of files) {
      const p = path.join(dir, name);
      try {
        const st = await fs.stat(p);
        if (!best || st.mtimeMs > best.mtimeMs) best = { name, mtimeMs: st.mtimeMs };
      } catch {}
    }
    return best ? path.join(dir, best.name) : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const { runID } = await ctx.params;
  const runId = (runID ?? "").trim();

  if (!safeId(runId)) {
    return NextResponse.json({ ok: false, error: "Invalid run id." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const url = new URL(req.url);
  const fmt = url.searchParams.get("format");

  if (!isFormat(fmt)) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid format. Use format=xlsx|pdf|html|gsheet|gform." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const runManifestPath = path.join(RUNS_ROOT, runId, "manifest.json");
  const legacyManifestPath = path.join(RUNS_ROOT, `${runId}.json`);

  const parsed = (await readJsonIfExists(runManifestPath)) ?? (await readJsonIfExists(legacyManifestPath));
  const manifest = parseManifest(parsed) ?? null;
  const status = manifest?.status ?? "unknown";
  const outputs = manifest?.outputs;

  if (fmt === "gsheet") {
    const dest = outputs?.gsheetUrl;
    if (isHttpUrl(dest)) return NextResponse.redirect(dest, 302);
    return NextResponse.json({ ok: false, error: "Google Sheet export is not configured yet.", status }, { status: 501, headers: { "Cache-Control": "no-store" } });
  }

  if (fmt === "gform") {
    const dest = outputs?.gformUrl;
    if (isHttpUrl(dest)) return NextResponse.redirect(dest, 302);
    return NextResponse.json({ ok: false, error: "Google Form export is not configured yet.", status }, { status: 501, headers: { "Cache-Control": "no-store" } });
  }

  const wantedFileParam = url.searchParams.get("file");
  const wantedBase = wantedFileParam ? path.basename(wantedFileParam) : null;

  // Prefer artifacts folder for xlsx/pdf
  if (fmt === "xlsx") {
    const hit = await pickFromRunArtifacts(runId, "xlsx", wantedBase);
    if (hit && (await fileExists(hit))) {
      const stream = createReadStream(hit);
      return new NextResponse(nodeStreamToWeb(stream), {
        headers: {
          "Content-Type": contentTypeFor("xlsx"),
          "Content-Disposition": contentDisposition(path.basename(hit), "attachment"),
          "Cache-Control": "no-store",
        },
      });
    }
  }

  if (fmt === "pdf") {
    const hit = await pickFromRunArtifacts(runId, "pdf", wantedBase);
    if (hit && (await fileExists(hit))) {
      const stream = createReadStream(hit);
      return new NextResponse(nodeStreamToWeb(stream), {
        headers: {
          "Content-Type": contentTypeFor("pdf"),
          "Content-Disposition": contentDisposition(path.basename(hit), "attachment"),
          "Cache-Control": "no-store",
        },
      });
    }
  }

  // Fallback to manifest rel paths (relative to OUTPUT)
  let relPath: string | null = null;
  if (fmt === "xlsx") relPath = outputs?.primaryXlsx ?? outputs?.xlsxList?.[0] ?? null;
  if (fmt === "pdf") relPath = outputs?.pdf ?? null;
  if (fmt === "html") relPath = outputs?.deliberationsHtml ?? null;

  if (relPath) {
    const abs = await resolveInsideOutput(relPath);
    if (abs && (await fileExists(abs))) {
      const stream = createReadStream(abs);
      return new NextResponse(nodeStreamToWeb(stream), {
        headers: {
          "Content-Type": contentTypeFor(fmt),
          "Content-Disposition": contentDisposition(path.basename(abs), fmt === "html" ? "inline" : "attachment"),
          "Cache-Control": "no-store",
        },
      });
    }
  }

  const maybeProcessing = status === "running";
  return NextResponse.json(
    {
      ok: false,
      error: maybeProcessing
        ? "Artifacts not ready yet. Run is still processing."
        : fmt === "xlsx"
          ? "No XLSX artifact found for this run."
          : fmt === "pdf"
            ? "No PDF artifact found for this run."
            : "No HTML artifact found for this run.",
      status,
      outputs,
    },
    { status: maybeProcessing ? 425 : 404, headers: { "Cache-Control": "no-store" } }
  );
}
