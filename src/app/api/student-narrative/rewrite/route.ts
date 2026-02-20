import { NextResponse } from "next/server";
import OpenAI from "openai";
import { isAIConfigured, type ChatMode } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RewriteBody = {
  markdown?: string;
  tone?: ChatMode;
};

export async function POST(req: Request) {
  if (!isAIConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI features are not configured. Add OPENAI_API_KEY to .env.local to enable parent-friendly rewrites.",
      },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Partial<RewriteBody>;
    const markdown = typeof body.markdown === "string" ? body.markdown.trim() : "";
    const tone: ChatMode = body.tone === "case_manager" || body.tone === "parent" ? body.tone : "parent";

    if (!markdown) {
      return NextResponse.json(
        { ok: false, error: "Missing markdown to rewrite." },
        { status: 400 },
      );
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const system =
      tone === "parent"
        ? "You rewrite special education IEP narratives so they are warm, clear, and parent-friendly. Keep all important facts, but remove jargon or explain it in plain language. Write as if speaking directly to a parent preparing for an ARD/IEP meeting."
        : "You rewrite special education IEP narratives for educators and ARD committee members. Keep the content concise, data-driven, and professional, suitable for deliberations and internal notes.";

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            "Rewrite the following IEP narrative in the requested tone. Preserve all key details and structure, but adjust the wording and explanations to match the audience.\n\nNARRATIVE:\n" +
            markdown,
        },
      ],
      temperature: 0.6,
      max_tokens: 2000,
    });

    const rewritten = response.choices[0]?.message?.content?.trim() ?? "";

    if (!rewritten) {
      return NextResponse.json(
        { ok: false, error: "The AI returned an empty response while rewriting." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, markdown: rewritten });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "Failed to rewrite narrative" }, { status: 500 });
  }
}
