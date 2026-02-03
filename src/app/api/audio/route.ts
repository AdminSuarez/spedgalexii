import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const audioDir = path.join(process.cwd(), "public", "audio");

  try {
    const entries = await fs.readdir(audioDir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name.toLowerCase().endsWith(".mp3"))
      .sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ ok: true, files });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to read audio directory.";
    return NextResponse.json({ ok: false, files: [], error: message });
  }
}
