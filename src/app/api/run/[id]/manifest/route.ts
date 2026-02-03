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

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

async function readJsonIfExists(filePath: string): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export async function GET(_req: NextRequest, { params }: RouteCtx) {
  const runId = (params?.id ?? "").trim();

  if (!safeId(runId)) {
    return NextResponse.json({ ok: false, error: "Invalid run id." }, { status: 400 });
  }

  const runDir = path.join(RUNS_ROOT, runId);
  const manifestPath = path.join(runDir, "manifest.json");

  // Legacy fallback (older system)
  const legacyManifestPath = path.join(RUNS_ROOT, `${runId}.json`);

  const parsed = (await readJsonIfExists(manifestPath)) ?? (await readJsonIfExists(legacyManifestPath));

  // If we have a manifest, return it as-is. UploadCard expects ok/runId/status/outputs.
  if (parsed && isObject(parsed)) {
    return NextResponse.json(parsed, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  }

  // If run dir exists but manifest isn't written yet, return a safe stub
  try {
    const st = await fs.stat(runDir);
    const startedAt = new Date(st.mtimeMs).toISOString();

    return NextResponse.json(
      {
        ok: true,
        runId,
        status: "running",
        startedAt,
        outputs: {},
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Run manifest not found yet." },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }
}

