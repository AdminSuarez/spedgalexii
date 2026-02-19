import { NextRequest } from "next/server";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { isAIConfigured, streamChat, type ChatMessage, type ChatMode } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUDIT_ROOT = path.resolve(process.cwd(), "..");

async function safeReadFile(p: string): Promise<string | null> {
  try {
    const buf = await fs.readFile(p, "utf8");
    return buf;
  } catch {
    return null;
  }
}

/**
 * POST /api/ai/student-chat
 *
 * Student-scoped Galexii chat.
 * Body: { studentId: string, messages: ChatMessage[] }
 *
 * The server loads Deep Dive JSON and related analysis for that student
 * and passes it as context into the AI system prompt. No student data is
 * ever persisted by the AI provider beyond this request.
 */
export async function POST(req: NextRequest) {
  if (!isAIConfigured()) {
    return new Response(
      JSON.stringify({
        error: "AI features are not configured. Add OPENAI_API_KEY to .env.local",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const rawId = typeof body.studentId === "string" ? body.studentId.trim() : "";
    const messages: ChatMessage[] = body.messages || [];
    const mode: ChatMode = body.mode === "parent" || body.mode === "case_manager" ? body.mode : "case_manager";

    const sid = rawId.replace(/\D+/g, "");
    if (!sid) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid studentId" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (!messages.length) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Build server-side context for this student
    const auditDir = path.join(AUDIT_ROOT, "audit");
    const outputDir = path.join(AUDIT_ROOT, "output");

    const deepDivePath = path.join(auditDir, `DEEP_DIVE_${sid}.json`);
    const goalsSummaryPath = path.join(outputDir, "goals_scored_summary.json");
    const plaafpSummaryPath = path.join(outputDir, "plaafp_summary.json");
    const complianceSummaryPath = path.join(outputDir, "compliance_summary.json");
    const servicesSummaryPath = path.join(outputDir, "services_summary.json");
    const assessmentsSummaryPath = path.join(outputDir, "assessments_summary.json");
    const mapDeepDivePath = path.join(outputDir, "map_deep_dive", `MAP_DEEP_DIVE_${sid}.json`);

    const [
      deepDiveJson,
      goalsJson,
      plaafpJson,
      complianceJson,
      servicesJson,
      assessmentsJson,
      mapDeepDiveJson,
    ] = await Promise.all([
      safeReadFile(deepDivePath),
      safeReadFile(goalsSummaryPath),
      safeReadFile(plaafpSummaryPath),
      safeReadFile(complianceSummaryPath),
      safeReadFile(servicesSummaryPath),
      safeReadFile(assessmentsSummaryPath),
      safeReadFile(mapDeepDivePath),
    ]);

    const contextChunks: string[] = [];
    if (deepDiveJson) {
      contextChunks.push(`DEEP_DIVE_JSON for ${sid}:\n${deepDiveJson}`);
    }
    if (goalsJson) {
      contextChunks.push(`GOALS_SCORED_SUMMARY (all students, filter by id=${sid} where applicable):\n${goalsJson}`);
    }
    if (plaafpJson) {
      contextChunks.push(`PLAAFP_SUMMARY (all students, filter by id=${sid}):\n${plaafpJson}`);
    }
    if (complianceJson) {
      contextChunks.push(`COMPLIANCE_SUMMARY (all students, filter by id=${sid}):\n${complianceJson}`);
    }
    if (servicesJson) {
      contextChunks.push(`SERVICES_SUMMARY (all students, filter by id=${sid}):\n${servicesJson}`);
    }
    if (assessmentsJson) {
      contextChunks.push(`ASSESSMENTS_SUMMARY (all students, filter by id=${sid}):\n${assessmentsJson}`);
    }
    if (mapDeepDiveJson) {
      contextChunks.push(
        `MAP_DEEP_DIVE_JSON for ${sid} (MAP/NWEA analysis):\n${mapDeepDiveJson}`,
      );
    }

    const context = contextChunks.join("\n\n---\n\n");

    // Only allow user/assistant messages from client
    const sanitized = messages
      .filter((m: ChatMessage) => m.role === "user" || m.role === "assistant")
      .map((m: ChatMessage) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content).slice(0, 8000),
      }));

    const stream = await streamChat(sanitized, context, mode);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[AI Student Chat] Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Student chat failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
