import { NextRequest } from "next/server";
import {
  generateAnalysis,
  generateParentSummary,
  isAIConfigured,
} from "@/lib/ai";

export const runtime = "nodejs";

/**
 * POST /api/ai/analyze
 *
 * Structured AI analysis endpoint.
 * Accepts analysis data + type ("full" | "summary").
 * Returns JSON analysis or plain-text parent summary.
 */
export async function POST(req: NextRequest) {
  if (!isAIConfigured()) {
    return new Response(
      JSON.stringify({
        error:
          "AI features are not configured. Add OPENAI_API_KEY to .env.local",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { analysisData, type = "full" } = body;

    if (!analysisData) {
      return new Response(
        JSON.stringify({ error: "No analysis data provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (type === "summary") {
      const summary = await generateParentSummary(analysisData);
      return new Response(
        JSON.stringify({ summary }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Full analysis
    const result = await generateAnalysis(analysisData);
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[AI Analyze] Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Analysis failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
