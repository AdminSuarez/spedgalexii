import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as path from "node:path";
import * as fs from "node:fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIT_ROOT = path.resolve(process.cwd(), "..");
const RUNS_ROOT = path.join(AUDIT_ROOT, "output", "_runs");

type RouteCtx = { params: { id: string } };

function safeId(id: string) {
  return /^[a-zA-Z0-9._-]{6,200}$/.test(id);
}

export async function GET(_req: NextRequest, { params }: RouteCtx): Promise<Response> {
  const runId = (params?.id ?? "").trim();

  if (!safeId(runId)) {
    return NextResponse.json({ ok: false, error: "Invalid run id." }, { status: 400 });
  }

  const runDir = path.join(RUNS_ROOT, runId);
  const logPath = path.join(runDir, "run.log");
  const manifestPath = path.join(runDir, "manifest.json");

  try {
    const logText = await fs.readFile(logPath, "utf8");
    return NextResponse.json({ ok: true, log: logText }, { status: 200 });
  } catch {
    // If the log isn't present yet, show a stub + manifest (if present).
    try {
      const raw = await fs.readFile(manifestPath, "utf8");
      const stub =
        "[LOG NOT READY]\nRun has started but run.log has not been written yet.\n\n[MANIFEST]\n";
      return NextResponse.json({ ok: true, log: stub + raw }, { status: 200 });
    } catch {
      return NextResponse.json({ ok: false, error: "Run log not found yet." }, { status: 404 });
    }
  }
}
