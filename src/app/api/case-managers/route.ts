import { NextResponse } from "next/server";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { getServerSupabase, CANON_BUCKET } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CaseManagerOption = {
  key: string;
  label: string;
  filename: string; // basename only
  kind?: "special" | "case_manager";
};

const PREFIX = "REQUIRED_AUDIT_TABLE__";
const SUFFIX = ".xlsx";

const ALL_KEY = "ALL_CASE_MANAGERS";
const BLANK_KEY = "BLANK_CASE_MANAGER";

function filenameForKey(key: string) {
  return `${PREFIX}${key}${SUFFIX}`;
}

function isCaseManagerFilename(name: string) {
  const upper = name.toUpperCase();
  return upper.startsWith(PREFIX) && upper.endsWith(SUFFIX.toUpperCase());
}

/**
 * Keep key generation consistent with your run pipeline.
 * Matches keyFromName in /api/run/route.ts:
 * - remove commas
 * - spaces -> underscores
 * - strip non [A-Za-z0-9_]
 */
function keyFromName(name: string): string {
  const cleaned = String(name || "")
    .trim()
    .replaceAll(",", "")
    .replaceAll(" ", "_")
    .replace(/[^A-Za-z0-9_]+/g, "");
  return cleaned || BLANK_KEY;
}

function nicerLabelFromKey(key: string) {
  return key.replaceAll("_", " ").trim();
}

function extractKeyFromFilename(name: string) {
  const upper = name.toUpperCase();
  if (!upper.startsWith(PREFIX) || !upper.endsWith(SUFFIX.toUpperCase())) return "";
  const base = name.slice(PREFIX.length, name.length - SUFFIX.length);
  const key = base.trim().replace(/\s+/g, "_");
  return key.replace(/[^A-Za-z0-9_]+/g, "_") || "";
}

async function listFilesSafe(dirAbs: string) {
  try {
    return await fs.readdir(dirAbs, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function fileExists(p: string) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Minimal CSV parser that handles quoted commas.
 * Returns rows as string arrays.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (ch === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      continue;
    }

    if (ch === "\r") continue;

    field += ch;
  }

  row.push(field);
  rows.push(row);

  const lastRow = rows[rows.length - 1];
  if (rows.length && lastRow && lastRow.every((c) => String(c || "").trim() === "")) rows.pop();
  return rows;
}

function normalizeHeader(h: string) {
  return String(h || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function pickColumnIndex(headers: string[], candidates: string[]) {
  const norm = headers.map(normalizeHeader);
  for (const cand of candidates) {
    const idx = norm.indexOf(normalizeHeader(cand));
    if (idx >= 0) return idx;
  }
  return -1;
}

async function readRosterCaseManagers(rosterTextOrPath: string): Promise<{ label: string; key: string }[]> {
  try {
    // Accept either raw CSV text or a file path
    let raw: string;
    if (rosterTextOrPath.includes("\n") || rosterTextOrPath.includes(",")) {
      raw = rosterTextOrPath;
    } else {
      raw = await fs.readFile(rosterTextOrPath, "utf8");
    }
    const rows = parseCsv(raw);
    if (rows.length < 2) return [];

    const headers = rows[0] ?? [];
    const cmIdx = pickColumnIndex(headers, [
      "Case Manager",
      "case manager",
      "case_manager",
      "CaseManager",
      "Case Mgr",
    ]);

    if (cmIdx < 0) return [];

    const out: { label: string; key: string }[] = [];
    for (const r of rows.slice(1)) {
      const v = (r[cmIdx] ?? "").toString().trim();
      if (!v) continue;
      const key = keyFromName(v);
      if (key === BLANK_KEY) continue;
      out.push({ label: v, key });
    }

    const seen = new Set<string>();
    const uniq: { label: string; key: string }[] = [];
    for (const it of out) {
      if (seen.has(it.key)) continue;
      seen.add(it.key);
      uniq.push(it);
    }
    return uniq;
  } catch {
    return [];
  }
}

async function latestUploadRosterPath(auditRoot: string): Promise<string | null> {
  const runsRoot = path.join(auditRoot, "output", "_runs");
  const uploadsRoot = path.join(runsRoot, "_uploads");

  const entries = await listFilesSafe(uploadsRoot);
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (dirs.length === 0) return null;

  let best: { id: string; mtimeMs: number } | null = null;
  for (const id of dirs) {
    const mf = path.join(uploadsRoot, id, "uploads.manifest.json");
    try {
      const st = await fs.stat(mf);
      if (!best || st.mtimeMs > best.mtimeMs) best = { id, mtimeMs: st.mtimeMs };
    } catch {
      // ignore
    }
  }

  const bestId = best?.id ?? null;
  if (!bestId) return null;

  const candidate = path.join(uploadsRoot, bestId, "canon", "roster.csv");
  return (await fileExists(candidate)) ? candidate : null;
}

/**
 * Find the most recently uploaded roster CSV in Supabase Storage.
 * Returns its text content, or null if not found / Supabase not configured.
 */
async function latestRosterFromSupabase(): Promise<string | null> {
  const sb = getServerSupabase();
  if (!sb) return null;

  try {
    // List all batch folders under canon/
    const { data: folders, error: listErr } = await sb.storage
      .from(CANON_BUCKET)
      .list("canon", { limit: 100, sortBy: { column: "created_at", order: "desc" } });

    if (listErr || !folders?.length) return null;

    // Walk each batch folder newest-first, looking for any roster-like CSV
    for (const folder of folders) {
      const prefix = `canon/${folder.name}`;
      const { data: files, error: fileErr } = await sb.storage
        .from(CANON_BUCKET)
        .list(prefix, { limit: 50 });

      if (fileErr || !files?.length) continue;

      const rosterFile = files.find((f) => {
        const n = f.name.toLowerCase();
        return n.includes("roster") && (n.endsWith(".csv") || n.endsWith(".xlsx"));
      });

      if (!rosterFile) continue;

      const { data: blob, error: dlErr } = await sb.storage
        .from(CANON_BUCKET)
        .download(`${prefix}/${rosterFile.name}`);

      if (dlErr || !blob) continue;

      return await blob.text();
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Read case managers directly from the seeded `roster` Supabase table.
 * This is the primary source on Vercel where the filesystem is ephemeral.
 */
async function caseManagersFromRosterTable(): Promise<{ label: string; key: string }[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return [];

  try {
    const sb = createClient(url, serviceKey);
    const { data, error } = await sb
      .from("roster")
      .select("case_manager")
      .not("case_manager", "is", null)
      .neq("case_manager", "");

    if (error || !data) return [];

    const seen = new Set<string>();
    const out: { label: string; key: string }[] = [];
    for (const row of data) {
      const v = String(row.case_manager ?? "").trim();
      if (!v) continue;
      const k = keyFromName(v);
      if (k === BLANK_KEY || seen.has(k)) continue;
      seen.add(k);
      out.push({ label: v, key: k });
    }
    return out.sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return [];
  }
}

export async function GET() {
  const AUDIT_ROOT = path.resolve(process.cwd(), "..");
  const OUTPUT = path.join(AUDIT_ROOT, "output");
  const RUNS = path.join(OUTPUT, "_runs");
  const CANON_ROSTER = path.join(AUDIT_ROOT, "input", "_CANONICAL", "roster.csv");

  const byKey = new Map<string, CaseManagerOption>();

  // ---- special entries (these power your "all managers" workflow) ----
  const allFilename = filenameForKey(ALL_KEY);
  const blankFilename = filenameForKey(BLANK_KEY);

  const special: CaseManagerOption[] = [];

  // Include "All Case Managers" even if file doesn't exist yet (UI can still run it)
  special.push({
    key: ALL_KEY,
    label: "All Case Managers",
    filename: allFilename,
    kind: "special",
  });

  // Optional: expose blank CM as special (helpful for audits)
  special.push({
    key: BLANK_KEY,
    label: "Blank / Unassigned Case Manager",
    filename: blankFilename,
    kind: "special",
  });

  // 0) Canonical source: roster table (Supabase) → local file → local upload → Supabase Storage
  let rosterSource: string | null = null;
  let rosteCms: { label: string; key: string }[] = [];

  // 0a) Supabase roster table — always available on Vercel
  const tableCms = await caseManagersFromRosterTable();
  if (tableCms.length > 0) {
    rosteCms = tableCms;
    rosterSource = "supabase_table";
  } else if (await fileExists(CANON_ROSTER)) {
    // 0b) Local canonical file
    const rosterText = await fs.readFile(CANON_ROSTER, "utf8").catch(() => null);
    if (rosterText) {
      rosteCms = await readRosterCaseManagers(rosterText);
      rosterSource = CANON_ROSTER;
    }
  } else {
    // 0c) Local upload batch
    const localUpload = await latestUploadRosterPath(AUDIT_ROOT);
    if (localUpload) {
      const rosterText = await fs.readFile(localUpload, "utf8").catch(() => null);
      if (rosterText) {
        rosteCms = await readRosterCaseManagers(rosterText);
        rosterSource = localUpload;
      }
    } else {
      // 0d) Supabase Storage (uploaded CSV)
      const rosterText = await latestRosterFromSupabase();
      if (rosterText) {
        rosteCms = await readRosterCaseManagers(rosterText);
        rosterSource = "supabase_storage";
      }
    }
  }

  for (const cm of rosteCms) {
    const filename = filenameForKey(cm.key);
    if (!byKey.has(cm.key)) {
      byKey.set(cm.key, {
        key: cm.key,
        label: cm.label,
        filename,
        kind: "case_manager",
      });
    }
  }

  // 1) OUTPUT root: use actual files if present
  const outputEntries = await listFilesSafe(OUTPUT);
  for (const ent of outputEntries) {
    if (!ent.isFile()) continue;
    const name = ent.name;
    if (!isCaseManagerFilename(name)) continue;

    const key = extractKeyFromFilename(name);
    if (!key) continue;

    // Do not mix special keys into normal list; UI gets them via `special`
    if (key === ALL_KEY || key === BLANK_KEY) continue;

    byKey.set(key, {
      key,
      label: byKey.get(key)?.label ?? nicerLabelFromKey(key),
      filename: name,
      kind: "case_manager",
    });
  }

  // 2) Fallback: scan per-run artifacts
  const runDirs = await listFilesSafe(RUNS);
  for (const runEnt of runDirs) {
    if (!runEnt.isDirectory()) continue;
    const runId = runEnt.name;
    if (runId.startsWith(".") || runId === "_uploads" || runId === "_cache") continue;

    const artifactsDir = path.join(RUNS, runId, "artifacts");
    const artifactEntries = await listFilesSafe(artifactsDir);

    for (const a of artifactEntries) {
      if (!a.isFile()) continue;
      const name = a.name;
      if (!isCaseManagerFilename(name)) continue;

      const key = extractKeyFromFilename(name);
      if (!key) continue;
      if (key === ALL_KEY || key === BLANK_KEY) continue;

      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          label: nicerLabelFromKey(key),
          filename: name,
          kind: "case_manager",
        });
      }
    }
  }

  const caseManagers = Array.from(byKey.values()).sort((a, b) => a.label.localeCompare(b.label));

  // file presence signals (UI can show "ready" badges)
  const allExists = await fileExists(path.join(OUTPUT, allFilename));
  const blankExists = await fileExists(path.join(OUTPUT, blankFilename));

  return NextResponse.json({
    ok: true,
    special,
    caseManagers,
    meta: {
      allWorkbook: { filename: allFilename, exists: allExists },
      blankWorkbook: { filename: blankFilename, exists: blankExists },
      source: rosterSource
        ? (rosterSource.startsWith("supabase")
            ? rosterSource
            : path.relative(AUDIT_ROOT, rosterSource).replaceAll("\\", "/"))
        : "files_only",
    },
  });
}
