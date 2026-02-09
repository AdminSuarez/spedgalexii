// src/app/api/run-all/route.ts
/**
 * "Easy Button" API - Runs ALL modules in sequence after file upload.
 * This allows the user to upload docs once and populate all sidebar tabs.
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALL_MODULES = ["accommodations", "goals", "plaafp", "services", "compliance", "assessments"] as const;

type RunResult = {
  module: string;
  runId?: string;
  ok: boolean;
  error?: string;
};

type RequestBody = {
  uploadBatchId: string;
  scope: "all" | "case_manager";
  caseManagerKey?: string;
  caseManagerName?: string;
  modules?: string[]; // Optional: only run specific modules
};

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
    }

    const { uploadBatchId, scope, caseManagerKey, caseManagerName, modules } = body as RequestBody;

    if (!uploadBatchId || typeof uploadBatchId !== "string") {
      return NextResponse.json({ ok: false, error: "uploadBatchId is required" }, { status: 400 });
    }

    // Determine which modules to run
    const modulesToRun = modules && Array.isArray(modules) && modules.length > 0
      ? modules.filter((m) => ALL_MODULES.includes(m as typeof ALL_MODULES[number]))
      : [...ALL_MODULES];

    const results: RunResult[] = [];
    const runIds: Record<string, string> = {};

    // Run each module sequentially (they share the same uploaded files)
    for (const mod of modulesToRun) {
      try {
        const runBody = {
          module: mod,
          scope: scope || "all",
          uploadBatchId,
          ...(scope === "case_manager" && caseManagerKey ? { caseManagerKey } : {}),
          ...(scope === "case_manager" && caseManagerName ? { caseManagerName } : {}),
        };

        // Call the main /api/run endpoint
        const origin = request.headers.get("origin") || request.headers.get("host") || "http://localhost:3000";
        const protocol = origin.startsWith("http") ? "" : "http://";
        const baseUrl = `${protocol}${origin}`;

        const runRes = await fetch(`${baseUrl}/api/run`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(runBody),
        });

        const runJson: unknown = await runRes.json();

        if (runJson && typeof runJson === "object" && "ok" in runJson && runJson.ok === true && "runId" in runJson) {
          const runId = (runJson as { runId: string }).runId;
          results.push({ module: mod, runId, ok: true });
          runIds[mod] = runId;
          
          // Wait for the run to complete before starting next module
          await waitForRunCompletion(baseUrl, runId, 120000); // 2 min timeout per module
        } else {
          const error = (runJson as { error?: string })?.error || "Unknown error";
          results.push({ module: mod, ok: false, error });
        }
      } catch (err) {
        results.push({ module: mod, ok: false, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    const allOk = results.every((r) => r.ok);
    const successCount = results.filter((r) => r.ok).length;

    return NextResponse.json({
      ok: allOk,
      message: `Completed ${successCount}/${modulesToRun.length} modules`,
      results,
      runIds,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

async function waitForRunCompletion(baseUrl: string, runId: string, timeoutMs: number): Promise<boolean> {
  const startTime = Date.now();
  const pollInterval = 2000; // 2 seconds

  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(`${baseUrl}/api/run/${encodeURIComponent(runId)}`);
      const json: unknown = await res.json();

      if (json && typeof json === "object" && "log" in json) {
        const log = (json as { log: string }).log || "";
        if (log.includes("[RUN DONE]") || log.includes("[RUN ERROR]") || log.includes("Traceback")) {
          return true;
        }
      }
    } catch {
      // Continue polling
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  return false; // Timeout
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    availableModules: ALL_MODULES,
    description: "POST to run all modules with uploadBatchId",
  });
}
