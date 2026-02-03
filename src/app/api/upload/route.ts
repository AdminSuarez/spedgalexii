import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In Next.js, process.cwd() is typically galaxy-iep-accommodations/
// This resolves to AccommodationsAudit/
const AUDIT_ROOT = path.resolve(process.cwd(), "..");

// Where we stage uploads BEFORE a run is created.
// A later /api/run will "attach" this batch to a runId and move/copy as needed.
const RUNS_ROOT = path.join(AUDIT_ROOT, "output", "_runs");
const UPLOADS_ROOT = path.join(RUNS_ROOT, "_uploads");

const MAX_FILES = 60;
// 250MB total is usually plenty for a handful of IEP PDFs + spreadsheets.
const MAX_TOTAL_BYTES = 250 * 1024 * 1024;

function safeName(name: string) {
  // remove path separators to prevent directory traversal via filename
  const base = path.basename(name);
  return base.replace(/[^\w.\- ()[\]]+/g, "_");
}

function classify(name: string) {
  const lower = name.toLowerCase();

  // PDFs are IEPs
  if (lower.endsWith(".pdf")) return { subdir: "ieps", kind: "pdf" as const };

  // canonical file hints
  if (
    (lower.includes("roster") && (lower.endsWith(".csv") || lower.endsWith(".xlsx"))) ||
    lower.includes("crosswalk") ||
    lower.includes("id_crosswalk") ||
    lower.includes("testhound") ||
    lower.includes("export")
  ) {
    return { subdir: "canon", kind: "canonical" as const };
  }

  // default: put common data files into canon
  if (lower.endsWith(".csv") || lower.endsWith(".xlsx")) {
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

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const files = form.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ ok: false, error: "No files received." }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { ok: false, error: `Too many files (${files.length}). Max is ${MAX_FILES}.` },
        { status: 400 }
      );
    }

    let totalBytes = 0;
    for (const f of files) totalBytes += f.size ?? 0;

    if (totalBytes > MAX_TOTAL_BYTES) {
      return NextResponse.json(
        {
          ok: false,
          error: `Upload too large (${Math.round(totalBytes / 1024 / 1024)}MB). Max is ${Math.round(
            MAX_TOTAL_BYTES / 1024 / 1024
          )}MB.`,
        },
        { status: 400 }
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
      const { subdir, kind } = classify(cleaned);

      const targetDir = subdir === "ieps" ? iepsDir : subdir === "canon" ? canonDir : otherDir;
      const { fullPath, fileName } = await ensureUniquePath(targetDir, cleaned);

      const buf = Buffer.from(await f.arrayBuffer());
      await fs.writeFile(fullPath, buf);

      savedFiles.push({
        originalName,
        savedName: fileName,
        kind,
        relPath: path.join(subdir, fileName).replaceAll("\\", "/"),
        bytes: buf.byteLength,
      });
    }

    // Write a small manifest so /api/run can attach this batch reliably
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
