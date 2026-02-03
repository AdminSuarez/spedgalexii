import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIT_ROOT = path.resolve(process.cwd(), "..");
const OUTPUT = path.join(AUDIT_ROOT, "output");
const RUNS_ROOT = path.join(OUTPUT, "_runs");

type ArtifactFormat = "xlsx" | "pdf" | "gsheet" | "gform";

type ManifestOutputs = {
  primaryXlsx?: string; // relative to OUTPUT (often _runs/<id>/artifacts/...)
  xlsxList?: string[];
  pdf?: string;
  gsheetUrl?: string;
  gformUrl?: string;
};

type Manifest = {
  ok?: boolean;
  status?: string;
  outputs?: ManifestOutputs;
};

type RouteCtx = { params: { runID: string } };

function safeId(id: string) {
  return /^[a-zA-Z0-9._-]{6,200}$/.test(id);
}

function isFormat(x: string | null): x is ArtifactFormat {
  return x === "xlsx" || x === "pdf" || x === "gsheet" || x === "gform";
}

function contentTypeFor(format: ArtifactFormat) {
  switch (format) {
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "pdf":
      return "application/pdf";
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

  const outputsRaw: Record<string, unknown> | undefined = isObject(x.outputs)
    ? (x.outputs as Record<string, unknown>)
    : undefined;

  const primaryXlsx = outputsRaw ? getString(outputsRaw, "primaryXlsx") : undefined;
  const xlsxList = outputsRaw ? getStringArray(outputsRaw, "xlsxList") : undefined;
  const pdf = outputsRaw ? getString(outputsRaw, "pdf") : undefined;
  const gsheetUrl = outputsRaw ? getString(outputsRaw, "gsheetUrl") : undefined;
  const gformUrl = outputsRaw ? getString(outputsRaw, "gformUrl") : undefined;

  const outputs: ManifestOutputs | undefined = outputsRaw
    ? {
        ...(primaryXlsx ? { primaryXlsx } : {}),
        ...(xlsxList ? { xlsxList } : {}),
        ...(pdf ? { pdf } : {}),
        ...(gsheetUrl ? { gsheetUrl } : {}),
        ...(gformUrl ? { gformUrl } : {}),
      }
    : undefined;

  const ok = typeof x.ok === "boolean" ? x.ok : undefined;
  const status = typeof x.status === "string" ? x.status : undefined;

  return {
    ...(ok !== undefined ? { ok } : {}),
    ...(status ? { status } : {}),
    ...(outputs ? { outputs } : {}),
  };
}

function isSafeRelPath(rel: string) {
  if (!rel || rel.length > 500) return false;
  if (rel.includes("\\") || rel.startsWith("/") || rel.startsWith("..")) return false;
  if (rel.includes("../")) return false;
  // allow underscores and spaces; keep tight
  return /^[a-zA-Z0-9._/\- ]+$/.test(rel);
}

function resolveInsideOutput(relPath: string) {
  const abs = path.resolve(OUTPUT, relPath);
  const outputRoot = path.resolve(OUTPUT);
  if (!abs.startsWith(outputRoot + path.sep)) return null;
  return abs;
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
  // prevents header oddities, keeps it readable
  const base = path.basename(name);
  return base.replace(/[\r\n"]/g, "_");
}

function contentDisposition(filename: string) {
  return `attachment; filename="${sanitizeFilename(filename)}"`;
}

/**
 * Node Readable -> Web ReadableStream<Uint8Array>
 * Readable.toWeb exists in Node 18+; TS types can vary, so we guard it.
 */
function nodeReadableToWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
  const toWebUnknown: unknown = (Readable as unknown as { toWeb?: (s: Readable) => unknown }).toWeb;
  if (typeof toWebUnknown !== "function") {
    throw new Error("Readable.toWeb is not available in this Node runtime.");
  }
  const web = (toWebUnknown as (s: Readable) => unknown)(nodeStream);

  if (typeof web !== "object" || web === null) {
    throw new Error("Readable.toWeb returned a non-object value.");
  }

  return web as ReadableStream<Uint8Array>;
}

async function pickFromRunArtifacts(runId: string, fmt: "xlsx" | "pdf", wantedBase?: string | null) {
  const dir = path.join(RUNS_ROOT, runId, "artifacts");

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

    // Newest by mtime
    let best: { name: string; mtimeMs: number } | null = null;
    for (const name of files) {
      const p = path.join(dir, name);
      try {
        const st = await fs.stat(p);
        if (!best || st.mtimeMs > best.mtimeMs) best = { name, mtimeMs: st.mtimeMs };
      } catch {
        // ignore per-file stat errors
      }
    }
    return best ? path.join(dir, best.name) : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, { params }: RouteCtx) {
  const runId = (params?.runID ?? "").trim();

  if (!safeId(runId)) {
    return NextResponse.json({ ok: false, error: "Invalid run id." }, { status: 400 });
  }

  const url = new URL(req.url);
  const fmt = url.searchParams.get("format");

  if (!isFormat(fmt)) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid format. Use format=xlsx|pdf|gsheet|gform." },
      { status: 400 }
    );
  }

  // Load per-run manifest first (new), then legacy fallback (old)
  const runManifestPath = path.join(RUNS_ROOT, runId, "manifest.json");
  const legacyManifestPath = path.join(RUNS_ROOT, `${runId}.json`);

  const parsed =
    (await readJsonIfExists(runManifestPath)) ?? (await readJsonIfExists(legacyManifestPath));

  const manifest = parseManifest(parsed) ?? null;
  const status = manifest?.status ?? "unknown";
  const outputs = manifest?.outputs;

  // Google formats
  if (fmt === "gsheet") {
    const dest = outputs?.gsheetUrl;
    if (isHttpUrl(dest)) return NextResponse.redirect(dest, 302);
    return NextResponse.json(
      { ok: false, error: "Google Sheet export is not configured yet.", status },
      { status: 501 }
    );
  }

  if (fmt === "gform") {
    const dest = outputs?.gformUrl;
    if (isHttpUrl(dest)) return NextResponse.redirect(dest, 302);
    return NextResponse.json(
      { ok: false, error: "Google Form export is not configured yet.", status },
      { status: 501 }
    );
  }

  // Prefer: run artifacts folder (self-contained)
  const wantedFileParam = url.searchParams.get("file");
  const wantedBase = wantedFileParam ? path.basename(wantedFileParam) : null;

  if (fmt === "xlsx") {
    const hit = await pickFromRunArtifacts(runId, "xlsx", wantedBase);
    if (hit && (await fileExists(hit))) {
      const stream = createReadStream(hit);
      const webStream = nodeReadableToWebStream(stream);
      return new NextResponse(webStream, {
        headers: {
          "Content-Type": contentTypeFor("xlsx"),
          "Content-Disposition": contentDisposition(path.basename(hit)),
          "Cache-Control": "no-store",
        },
      });
    }
  }

  if (fmt === "pdf") {
    const hit = await pickFromRunArtifacts(runId, "pdf", wantedBase);
    if (hit && (await fileExists(hit))) {
      const stream = createReadStream(hit);
      const webStream = nodeReadableToWebStream(stream);
      return new NextResponse(webStream, {
        headers: {
          "Content-Type": contentTypeFor("pdf"),
          "Content-Disposition": contentDisposition(path.basename(hit)),
          "Cache-Control": "no-store",
        },
      });
    }
  }

  // Fallback: manifest-relative-to-OUTPUT
  let rel: string | null = null;
  if (fmt === "xlsx") rel = outputs?.primaryXlsx ?? outputs?.xlsxList?.[0] ?? null;
  if (fmt === "pdf") rel = outputs?.pdf ?? null;

  if (rel && isSafeRelPath(rel)) {
    const abs = resolveInsideOutput(rel);
    if (abs && (await fileExists(abs))) {
      const stream = createReadStream(abs);
      const webStream = nodeReadableToWebStream(stream);
      return new NextResponse(webStream, {
        headers: {
          "Content-Type": contentTypeFor(fmt),
          "Content-Disposition": contentDisposition(path.basename(abs)),
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
          : "No PDF artifact found for this run.",
      status,
      outputs,
    },
    { status: maybeProcessing ? 425 : 404 }
  );
}
