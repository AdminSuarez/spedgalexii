import { NextRequest } from "next/server";
import { streamChat, isAIConfigured, getAIProviders, type ChatMessage, type ChatMode } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/ai/chat
 * 
 * Streaming chat endpoint for the Galexii AI assistant.
 * Accepts messages array + optional analysis context.
 * Returns Server-Sent Events stream.
 */
export async function POST(req: NextRequest) {
  if (!isAIConfigured()) {
    return new Response(
      JSON.stringify({
        error: "AI features are not configured. Add OPENAI_API_KEY to .env.local",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const messages: ChatMessage[] = body.messages || [];
    const context: string | undefined = body.context;
    const mode: ChatMode = body.mode === "case_manager" ? "case_manager" : "parent";

    if (!messages.length) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Only allow user/assistant messages from client
    const sanitized = messages
      .filter((m: ChatMessage) => m.role === "user" || m.role === "assistant")
      .map((m: ChatMessage) => ({
        role: m.role as "user" | "assistant",
        content: String(m.content).slice(0, 10000), // limit message length
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
    console.error("[AI Chat] Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Chat failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * GET /api/ai/chat
 *
 * Returns AI configuration status for all providers.
 * Used by GalexiiChat to decide whether to show the chat UI.
 */
export async function GET() {
  const providers = getAIProviders();
  return new Response(
    JSON.stringify({
      configured: isAIConfigured(),
      providers,
      // Which model is actually being used for chat
      chatModel: providers.groq ? "llama-3.3-70b-versatile (Groq)" : "gpt-4o-mini (OpenAI)",
      features: ["chat", "analysis", "recommendations", ...(providers.elevenlabs ? ["tts"] : [])],
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
// redeploy 2026-02-21T20:55:49Z
