import { NextResponse } from "next/server";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { spawn } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIT_ROOT = path.resolve(process.cwd(), "..");
const SCRIPTS_ROOT = path.join(AUDIT_ROOT, "scripts");
const OCR_TMP_ROOT = path.join(AUDIT_ROOT, "output", "_runs", "_ocr");

type FileWithStream = File & {
  stream(): ReadableStream<Uint8Array>;
};

function isFile(x: unknown): x is FileWithStream {
  if (typeof x !== "object" || x === null) return false;
  const candidate = x as {
    name?: unknown;
    size?: unknown;
    arrayBuffer?: unknown;
    stream?: unknown;
  };
  return (
    typeof candidate.name === "string" &&
    typeof candidate.size === "number" &&
    typeof candidate.arrayBuffer === "function" &&
    typeof candidate.stream === "function"
  );
}

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

function readableFromWeb(webStream: ReadableStream<Uint8Array>) {
  const readableWithFromWeb = Readable as typeof Readable & {
    fromWeb?: (stream: ReadableStream<Uint8Array>) => NodeJS.ReadableStream;
  };
  if (typeof readableWithFromWeb.fromWeb === "function") {
    return readableWithFromWeb.fromWeb(webStream);
  }

  return Readable.from(
    (async function* () {
      const reader = webStream.getReader();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) yield Buffer.from(value);
      }
    })(),
  );
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

    const nodeReadable = readableFromWeb(raw.stream());
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
