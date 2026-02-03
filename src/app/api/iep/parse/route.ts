import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);

type ParseRequest = {
  runId: string;
  inputDir?: string;
  docPaths?: string[];
};

function sanitizeRunId(runId: string) {
  return runId.replace(/[^a-zA-Z0-9_-]/g, "");
}

export async function POST(request: Request) {
  let body: ParseRequest;
  try {
    body = (await request.json()) as ParseRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body?.runId) {
    return NextResponse.json({ error: "runId is required." }, { status: 400 });
  }

  const runId = sanitizeRunId(body.runId);
  if (!runId) {
    return NextResponse.json({ error: "runId contains no valid characters." }, { status: 400 });
  }

  const repoRoot = path.resolve(process.cwd(), "..");
  const scriptPath = path.join(repoRoot, "scripts", "20_extract_text_packets.py");
  const outputDir = path.join(repoRoot, "output");
  const packDir = path.join(outputDir, "_packs", runId);
  await mkdir(packDir, { recursive: true });

  const args = [scriptPath, "--run-id", runId, "--output-dir", outputDir];
  if (body.inputDir) {
    args.push("--input-dir", body.inputDir);
  }
  if (body.docPaths?.length) {
    body.docPaths.forEach((doc) => args.push("--doc", doc));
  }

  try {
    await execFileAsync("python3", args, { timeout: 120_000 });
  } catch (error) {
    return NextResponse.json(
      { error: "Python extraction failed.", detail: String(error) },
      { status: 500 }
    );
  }

  const outPath = path.join(packDir, "documents.json");
  try {
    const contents = await readFile(outPath, "utf-8");
    const extracted = JSON.parse(contents);
    return NextResponse.json({ extracted, evidenceAnchors: [], warnings: extracted.warnings ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: "Extraction completed but output could not be read.", detail: String(error) },
      { status: 500 }
    );
  }
}
