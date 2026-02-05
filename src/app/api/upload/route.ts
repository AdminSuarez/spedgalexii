import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In Next.js, process.cwd() is typically galaxy-iep-accommodations/
// This resolves to AccommodationsAudit/
const AUDIT_ROOT = path.resolve(process.cwd(), "..");

// Where we stage uploads BEFORE a run is created.
// A later /api/run will "attach" this batch to a runId and move/copy as needed.
const RUNS_ROOT = path.join(AUDIT_ROOT, "output", "_runs");
const UPLOADS_ROOT = path.join(RUNS_ROOT, "_uploads");

// Limits
const MAX_FILES = 60;
const MAX_TOTAL_BYTES = 250 * 1024 * 1024; // 250MB total
const MAX_SINGLE_FILE_BYTES = 80 * 1024 * 1024; // 80MB per file (tune if needed)

// Allowlist common inputs (tighten later if you want)
const ALLOWED_EXT = new Set([".pdf", ".csv", ".xlsx", ".xls"]);

// --- helpers ---
function isFile(x: unknown): x is File {
  // Next/undici File implements arrayBuffer/stream/name/size
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as any).name === "string" &&
    typeof (x as any).size === "number" &&
    typeof (x as any).arrayBuffer === "function" &&
    typeof (x as any).stream === "function"
  );
}

function safeName(name: string) {
  // remove path separators to prevent directory traversal via filename
  const base = path.basename(name);
  // Normalize weird whitespace
  const cleaned = base.replace(/\s+/g, " ").trim();
  // Replace hostile chars
  return cleaned.replace(/[^\w.\- ()[\]]+/g, "_");
}

function classify(name: string) {
  const lower = name.toLowerCase();

  // PDFs are IEPs
  if (lower.endsWith(".pdf")) return { subdir: "ieps", kind: "pdf" as const };

  // canonical file hints
  if (
    (lower.includes("roster") && (lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls"))) ||
    lower.includes("crosswalk") ||
    lower.includes("id_crosswalk") ||
    lower.includes("testhound") ||
    lower.includes("export")
  ) {
    return { subdir: "canon", kind: "canonical" as const };
  }

  // default: put common data files into canon
  if (lower.endsWith(".csv") || lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return { subdir: "canon", kind: "canonical" as const };
  }

  return { subdir: "other", kind: "other" as const };
}

async function ensureUniquePath(dir: string, filename: string) {
  const ext = path.extname(filename);
  const stem = filename.slice(0, filename.length - ext.length);

  let candidate = filename;
  for (let i = 0; i < 200; i++) {
    const full = path.join(dir, candidate);
    try {
      await fs.access(full);
      // exists: bump name
      candidate = `${stem}__${i + 1}${ext}`;
    } catch {
      // does not exist
      return { fullPath: full, fileName: candidate };
    }
  }

  // last resort
  const rand = crypto.randomBytes(4).toString("hex");
  candidate = `${stem}__${rand}${ext}`;
  return { fullPath: path.join(dir, candidate), fileName: candidate };
}

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const raw = form.getAll("files");

    const files = raw.filter(isFile);
    if (files.length === 0) {
      return jsonError("No files received.");
    }

    if (files.length > MAX_FILES) {
      return jsonError(`Too many files (${files.length}). Max is ${MAX_FILES}.`);
    }

    // Size checks (deterministic)
    let totalBytes = 0;
    for (const f of files) {
      const sz = Number.isFinite(f.size) ? f.size : 0;

      if (sz <= 0) {
        return jsonError(`File "${String(f.name || "file")}" is empty (0 bytes).`);
      }
      if (sz > MAX_SINGLE_FILE_BYTES) {
        return jsonError(
          `File "${String(f.name || "file")}" is too large (${Math.round(sz / 1024 / 1024)}MB). Max per file is ${Math.round(
            MAX_SINGLE_FILE_BYTES / 1024 / 1024
          )}MB.`
        );
      }

      totalBytes += sz;
      if (totalBytes > MAX_TOTAL_BYTES) break;
    }

    if (totalBytes > MAX_TOTAL_BYTES) {
      return jsonError(
        `Upload too large (${Math.round(totalBytes / 1024 / 1024)}MB). Max is ${Math.round(
          MAX_TOTAL_BYTES / 1024 / 1024
        )}MB.`
      );
    }

    await fs.mkdir(UPLOADS_ROOT, { recursive: true });

    const uploadBatchId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;

    const batchRoot = path.join(UPLOADS_ROOT, uploadBatchId);
    const iepsDir = path.join(batchRoot, "ieps");
    const canonDir = path.join(batchRoot, "canon");
    const otherDir = path.join(batchRoot, "other");

    await fs.mkdir(iepsDir, { recursive: true });
    await fs.mkdir(canonDir, { recursive: true });
    await fs.mkdir(otherDir, { recursive: true });

    const savedFiles: Array<{
      originalName: string;
      savedName: string;
      kind: "pdf" | "canonical" | "other";
      relPath: string; // relative to batchRoot
      bytes: number;
    }> = [];

    for (const f of files) {
      const originalName = String(f.name || "file");
      const cleaned = safeName(originalName);

      const ext = path.extname(cleaned).toLowerCase();
      if (!ALLOWED_EXT.has(ext)) {
        return jsonError(
          `Unsupported file type "${ext || "(no extension)"}" for "${originalName}". Allowed: ${Array.from(ALLOWED_EXT).join(
            ", "
          )}.`
        );
      }

      const { subdir, kind } = classify(cleaned);
      const targetDir = subdir === "ieps" ? iepsDir : subdir === "canon" ? canonDir : otherDir;
      const { fullPath, fileName } = await ensureUniquePath(targetDir, cleaned);

      // Stream to disk (prevents RAM spikes)
      const nodeReadable = ReadableFromWeb(f.stream());
      await pipeline(nodeReadable, createWriteStream(fullPath, { flags: "wx" }).on("error", () => {})).catch(async (err) => {
        // If "wx" (exclusive create) fails due to race, retry once with unique name
        if (String(err?.code || "").toUpperCase() === "EEXIST") {
          const retry = await ensureUniquePath(targetDir, cleaned);
          const retryReadable = ReadableFromWeb(f.stream());
          await pipeline(retryReadable, createWriteStream(retry.fullPath, { flags: "wx" }));
          return { fullPath: retry.fullPath, fileName: retry.fileName };
        }
        throw err;
      });

      // Get actual bytes on disk (trust-but-verify)
      const st = await fs.stat(fullPath);

      savedFiles.push({
        originalName,
        savedName: fileName,
        kind,
        relPath: path.join(subdir, fileName).replaceAll("\\", "/"),
        bytes: st.size,
      });
    }

    // Write a small manifest so /api/run can attach this batch reliably
    // NOTE: auditRoot + batchRoot are server-internal; we store them on disk,
    // but we do not need to return them to the client.
    const manifest = {
      ok: true,
      uploadBatchId,
      createdAt: new Date().toISOString(),
      auditRoot: AUDIT_ROOT,
      batchRoot,
      files: savedFiles,
    };

    await fs.writeFile(
      path.join(batchRoot, "uploads.manifest.json"),
      JSON.stringify(manifest, null, 2),
      "utf8"
    );

    return NextResponse.json({
      ok: true,
      uploadBatchId,
      saved: savedFiles.length,
      files: savedFiles,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message || "Upload failed." }, { status: 500 });
  }
}

/**
 * Convert a WHATWG ReadableStream (from File.stream()) into a Node.js Readable
 * without importing "stream" at top-level (keeps bundle clean).
 */
function ReadableFromWeb(webStream: ReadableStream<Uint8Array>) {
  // Node 18+ supports Readable.fromWeb
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Readable } = require("node:stream") as typeof import("node:stream");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyReadable = Readable as any;
  if (typeof anyReadable.fromWeb === "function") return anyReadable.fromWeb(webStream);
  // Fallback: buffer (should rarely happen in your environment)
  return Readable.from((async function* () {
    const reader = webStream.getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) yield value;
    }
  })());
}
