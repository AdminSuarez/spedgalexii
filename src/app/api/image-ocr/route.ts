import { NextResponse } from "next/server";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIT_ROOT = path.resolve(process.cwd(), "..");
const SCRIPTS_ROOT = path.join(AUDIT_ROOT, "scripts");
const OCR_TMP_ROOT = path.join(AUDIT_ROOT, "output", "_runs", "_ocr");

function isFile(x: unknown): x is File {
  return (
    typeof x === "object" &&
    x !== null &&
    typeof (x as any).name === "string" &&
    typeof (x as any).size === "number" &&
    typeof (x as any).arrayBuffer === "function" &&
    typeof (x as any).stream === "function"
  );
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

async function runPython(cmd: string, args: string[], cwd: string): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  return await new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd });
    let stdout = "";
    let stderr = "";

    p.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    p.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    p.on("error", (err) => {
      resolve({ ok: false, stdout, stderr: String(err) });
    });
    p.on("close", (code) => {
      resolve({ ok: code === 0, stdout, stderr });
    });
  });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const raw = form.get("image");

    if (!raw || !isFile(raw)) {
      return NextResponse.json({ ok: false, error: "No image file provided." }, { status: 400 });
    }

    const ext = path.extname(String(raw.name || "image")).toLowerCase() || ".png";
    const allowedExt = new Set([".png", ".jpg", ".jpeg", ".heic", ".webp", ".tif", ".tiff"]);

    if (!allowedExt.has(ext)) {
      return NextResponse.json({ ok: false, error: `Unsupported image type: ${ext}` }, { status: 400 });
    }

    await ensureDir(OCR_TMP_ROOT);
    const tmpName = `ocr_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`;
    const tmpPath = path.join(OCR_TMP_ROOT, tmpName);

    const nodeReadable = (raw as any).stream();
    await pipeline(nodeReadable, createWriteStream(tmpPath));

    const venvPython = path.join(AUDIT_ROOT, ".venv", "bin", "python");
    const pythonCmd = (await fs
      .stat(venvPython)
      .then(() => venvPython)
      .catch(() => "python3")) as string;

    const scriptPath = path.join(SCRIPTS_ROOT, "ocr_image_to_text.py");

    const { ok, stdout, stderr } = await runPython(pythonCmd, [scriptPath, tmpPath], AUDIT_ROOT);

    try {
      await fs.unlink(tmpPath);
    } catch {
      // ignore cleanup errors
    }

    if (!ok) {
      const msg = stderr || stdout || "OCR failed.";
      return NextResponse.json({ ok: false, error: msg.slice(0, 2000) }, { status: 500 });
    }

    const text = stdout.trim();
    return NextResponse.json({ ok: true, text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "OCR failed" }, { status: 500 });
  }
}
