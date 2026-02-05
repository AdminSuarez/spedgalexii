import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as path from "node:path";
import * as fs from "node:fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIT_ROOT = path.resolve(process.cwd(), "..");
const RUNS_ROOT = path.join(AUDIT_ROOT, "output", "_runs");

// ✅ Next route ctx params are Promise-wrapped in your Next version
type RouteCtx = { params: Promise<Record<string, string | undefined>> };

function pickRunId(params?: Record<string, string | undefined>) {
  // Support either folder name: [id] or [runID] (or [runId])
  return (params?.id ?? params?.runID ?? params?.runId ?? params?.rid ?? "").trim();
}

function safeRunId(id: string) {
  if (!/^[a-zA-Z0-9._-]{6,200}$/.test(id)) return false;

  const lower = id.toLowerCase();
  if (lower === "_cache" || lower === "_uploads" || lower === "cache") return false;

  if (id === "." || id === ".." || id.includes("..")) return false;

  return true;
}

function safeJoin(root: string, child: string) {
  const joined = path.join(root, child);
  const resolvedRoot = path.resolve(root) + path.sep;
  const resolvedJoined = path.resolve(joined);
  if (!resolvedJoined.startsWith(resolvedRoot)) {
    throw new Error("Path escape blocked");
  }
  return joined;
}

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  // ✅ await params
  const params = await ctx.params;
  const runId = pickRunId(params);

  if (!safeRunId(runId)) {
    return NextResponse.json({ ok: false, error: "Invalid run id." }, { status: 400 });
  }

  let runDir: string;
  try {
    runDir = safeJoin(RUNS_ROOT, runId);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid run id." }, { status: 400 });
  }

  const logPath = path.join(runDir, "run.log");
  const manifestPath = path.join(runDir, "manifest.json");

  try {
    const logText = await fs.readFile(logPath, "utf8");
    return NextResponse.json({ ok: true, runId, log: logText }, { status: 200 });
  } catch {
    // If the log isn't present yet, show a stub + manifest (if present).
    try {
      const raw = await fs.readFile(manifestPath, "utf8");
      const stub =
        "[LOG NOT READY]\nRun has started but run.log has not been written yet.\n\n[MANIFEST]\n";
      return NextResponse.json({ ok: true, runId, log: stub + raw }, { status: 200 });
    } catch {
      return NextResponse.json({ ok: false, error: "Run log not found yet." }, { status: 404 });
    }
  }
}
