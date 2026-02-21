import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file" }, { status: 400 });
  }

  const blob = await put(file.name, file, {
    // Use public access so the external Deep Space API
    // (running outside Vercel) can download the PDF.
    access: "public",
    addRandomSuffix: true,
  });

  return NextResponse.json({
    ok: true,
    url: blob.url,
    downloadUrl: blob.downloadUrl,
    pathname: blob.pathname,
    size: file.size,
  });
}
