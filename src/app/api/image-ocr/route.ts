import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Max image size: 20 MB (OpenAI Vision limit)
const MAX_BYTES = 20 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

// Map file extensions to MIME types for files that may lack proper content-type
const EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function isFile(x: unknown): x is File {
  if (typeof x !== "object" || x === null) return false;
  const c = x as { name?: unknown; size?: unknown; arrayBuffer?: unknown };
  return (
    typeof c.name === "string" &&
    typeof c.size === "number" &&
    typeof c.arrayBuffer === "function"
  );
}

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "OCR service is not configured (missing OPENAI_API_KEY)." },
        { status: 503 },
      );
    }

    const form = await req.formData();
    const raw = form.get("image");

    if (!raw || !isFile(raw)) {
      return NextResponse.json({ ok: false, error: "No image file provided." }, { status: 400 });
    }

    if (raw.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: `Image is too large (${(raw.size / 1024 / 1024).toFixed(1)} MB). Maximum is 20 MB.` },
        { status: 413 },
      );
    }

    // Resolve MIME type — prefer the file's own type, fall back to extension
    const extMatch = raw.name.match(/\.[^.]+$/);
    const ext = extMatch ? extMatch[0].toLowerCase() : "";
    const mimeType: string = (raw.type && raw.type !== "application/octet-stream")
      ? raw.type
      : (EXT_TO_MIME[ext] ?? "image/png");

    if (!ALLOWED_MIME.has(mimeType)) {
      return NextResponse.json(
        { ok: false, error: `Unsupported image type: ${mimeType}. Use PNG, JPEG, WebP, or GIF.` },
        { status: 400 },
      );
    }

    // Convert to base64 data URL for OpenAI Vision
    const arrayBuffer = await raw.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const openai = new OpenAI({ apiKey });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please perform OCR on this image and return ONLY the extracted text, exactly as it appears. Preserve line breaks, spacing, and formatting as closely as possible. Do not add any commentary, explanation, or markdown formatting — just the raw text from the image.",
            },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" },
            },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { ok: false, error: "No text could be extracted from the image." },
        { status: 422 },
      );
    }

    return NextResponse.json({ ok: true, text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "OCR failed." }, { status: 500 });
  }
}
