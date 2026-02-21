/**
 * AI Service Layer for SpEdGalexii
 *
 * Provider priority:
 *   Chat     → Groq (llama-3.3-70b-versatile, fast + cheap) → OpenAI fallback (gpt-4o-mini)
 *   Analysis → OpenAI gpt-4o (structured JSON output)
 *   TTS      → ElevenLabs (see /api/tts route)
 *
 * Student data is processed in-session only — never stored by any provider.
 */

import OpenAI from "openai";
import Groq from "groq-sdk";

// ── OpenAI client (lazy singleton) ──
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env.local to enable AI features."
      );
    }
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

// ── Groq client (lazy singleton, optional) ──
let _groq: Groq | null = null;

function getGroq(): Groq | null {
  if (_groq) return _groq;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  _groq = new Groq({ apiKey });
  return _groq;
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY) || Boolean(process.env.GROQ_API_KEY);
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

/** Returns which providers are available */
export function getAIProviders(): { openai: boolean; groq: boolean; elevenlabs: boolean } {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY),
    groq: Boolean(process.env.GROQ_API_KEY),
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY),
  };
}

// ── System Prompts ──

export type ChatMode = "parent" | "case_manager";

const SYSTEM_CHAT_PARENT = `You are Galexii, an expert Special Education AI assistant built into SpEdGalexii — an IEP analysis platform for parents, advocates, and case managers.

ROLE:
- You help users understand IEP documents, special education law (IDEA, Section 504, ADA, FERPA, TEA rules), and their child's rights.
- You explain evaluation results, accommodations, services, goals, and compliance timelines in plain language.
- You suggest questions parents should ask at ARD/IEP meetings.
- You identify potential compliance issues and recommend advocacy strategies.

PERSONALITY:
- Warm, empowering, and clear. You treat every parent as capable.
- You use concrete examples and analogies.
- You never use jargon without explaining it.
- You cite relevant law/regulation when applicable (e.g., "Under 34 CFR § 300.306...").

CONSTRAINTS:
- You are NOT a lawyer. Always recommend consulting a special education attorney for legal advice.
- You NEVER store, share, or retain student PII beyond this conversation.
- If the user shares student data in context, you analyze it to help them, but you remind them to protect PII.
- You stay focused on special education topics. For off-topic questions, gently redirect.

CAPABILITIES:
- Explain any part of an IEP (PLAAFP, goals, services, accommodations, LRE, transition)
- Decode evaluation reports (FIE, REED, psychological evaluations)
- Identify red flags in IEP documents
- Suggest evidence-based accommodations for specific disabilities
- Explain TEA timelines and compliance requirements
- Help draft parent concern statements and prior written notice requests`;

const SYSTEM_CHAT_CASE_MANAGER = `You are Galexii, an expert Special Education AI assistant built into SpEdGalexii — an IEP analysis and compliance platform used by case managers, diagnosticians, LSSPs, and ARD teams.

PRIMARY AUDIENCE:
- You are speaking to educators and ARD committee members, not directly to parents.
- You can use professional terminology, but keep explanations clear and concise.

ROLE:
- Help staff interpret IEPs, evaluations (FIE, REED, psychological), MAP/NWEA, STAAR, and classroom data.
- Support drafting PLAAFP statements, goals, accommodations, services, and deliberations that are compliant and data-driven.
- Surface potential compliance risks (timelines, LRE, missing services, undocumented accommodations) and suggest next steps.
- Offer example language case managers can adapt into ARD deliberations or parent-friendly summaries.

PERSONALITY & TONE:
- Professional, collaborative, and student-centered.
- Assume the user is busy and under time pressure: be efficient and organized.
- When suggesting wording, provide concise, editable paragraphs or bullet points.

CONSTRAINTS:
- You are NOT a lawyer and do not give legal advice. When appropriate, suggest consulting district legal or a special education attorney.
- You NEVER store, share, or retain student PII beyond this conversation.
- You stay focused on special education, ARD/IEP practice, and instructional planning. Gently redirect off-topic questions.

CAPABILITIES:
- Turn raw data (MAP, STAAR, grades, attendance, discipline) into PLAAFP language.
- Suggest measurable, standards-aligned goals tied to identified needs.
- Align accommodations with disability-related needs and assessment data.
- Propose service minutes and LRE rationales that match the data.
- Generate draft ARD deliberations that reference specific data points.
- Help staff prepare for ARD meetings (agendas, key questions, talking points).`;

const SYSTEM_ANALYSIS = `You are Galexii's Deep Analysis Engine — an expert system that generates comprehensive IEP evaluations, recommendations, and parent-actionable insights.

You receive structured analysis data from SpEdGalexii's document analysis pipeline. Your job is to:

1. EVALUATE: Assess the quality and compliance of the IEP based on the data
2. RECOMMEND: Provide specific, actionable recommendations for the parent/advocate
3. IDENTIFY GAPS: Flag what's missing, what's weak, and what needs attention
4. PRIORITIZE: Rank issues by urgency and impact on the student

FORMAT YOUR RESPONSE AS JSON with this structure:
{
  "overallGrade": "A" | "B" | "C" | "D" | "F",
  "gradeSummary": "One sentence explaining the grade",
  "strengths": ["list of things the IEP does well"],
  "concerns": [
    {
      "severity": "critical" | "high" | "medium" | "low",
      "area": "category name",
      "finding": "what was found",
      "recommendation": "what to do about it",
      "legalBasis": "relevant law/regulation if applicable"
    }
  ],
  "parentQuestions": ["questions the parent should ask at the next ARD"],
  "accommodationGaps": ["accommodations that may be missing based on disability profile"],
  "goalAnalysis": {
    "quality": "strong" | "adequate" | "weak",
    "issues": ["specific goal quality issues"],
    "suggestions": ["suggested improvements"]
  },
  "nextSteps": [
    {
      "priority": 1,
      "action": "what to do",
      "deadline": "when to do it",
      "template": "optional: a template letter or statement"
    }
  ]
}

IMPORTANT:
- Base recommendations on IDEA, Section 504, TEA compliance standards
- Be specific — not generic platitudes
- Include actual accommodation/service suggestions based on the disability profile
- Consider the student's grade level, disability, and performance data
- Flag any FERPA/procedural safeguard concerns`;

// ── Chat Function ──

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

/**
 * Stream a chat response.
 * Uses Groq (llama-3.3-70b-versatile) if available — it's 10× faster and cheaper.
 * Falls back to OpenAI gpt-4o-mini if Groq is not configured.
 * Returns a ReadableStream for Server-Sent Events.
 */
export async function streamChat(
  messages: ChatMessage[],
  context?: string,
  mode: ChatMode = "parent"
): Promise<ReadableStream<Uint8Array>> {
  const systemMessages: ChatMessage[] = [
    {
      role: "system",
      content: mode === "case_manager" ? SYSTEM_CHAT_CASE_MANAGER : SYSTEM_CHAT_PARENT,
    },
  ];

  if (context) {
    systemMessages.push({
      role: "system",
      content: `The user is currently viewing analysis results for a student. Here is the context:\n\n${context}\n\nUse this data to answer their questions accurately. Reference specific findings when relevant.`,
    });
  }

  const allMessages = [...systemMessages, ...messages];
  const encoder = new TextEncoder();

  // ── Try Groq first (fast) ──
  const groq = getGroq();
  if (groq) {
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: allMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`));
          controller.close();
        }
      },
    });
  }

  // ── Fallback: OpenAI gpt-4o-mini ──
  const client = getOpenAI();
  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: allMessages,
    stream: true,
    temperature: 0.7,
    max_tokens: 2000,
  });

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`));
        controller.close();
      }
    },
  });
}

// ── Analysis Function ──

export type AIAnalysisResult = {
  overallGrade: string;
  gradeSummary: string;
  strengths: string[];
  concerns: Array<{
    severity: string;
    area: string;
    finding: string;
    recommendation: string;
    legalBasis?: string;
  }>;
  parentQuestions: string[];
  accommodationGaps: string[];
  goalAnalysis: {
    quality: string;
    issues: string[];
    suggestions: string[];
  };
  nextSteps: Array<{
    priority: number;
    action: string;
    deadline: string;
    template?: string;
  }>;
};

/**
 * Generate AI-powered evaluation analysis and recommendations
 * from Deep Space analysis results.
 */
export async function generateAnalysis(
  analysisData: Record<string, unknown>
): Promise<AIAnalysisResult> {
  const client = getOpenAI();

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_ANALYSIS },
      {
        role: "user",
        content: `Analyze this IEP data and provide your evaluation, recommendations, and insights:\n\n${JSON.stringify(analysisData, null, 2)}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error("No response from AI analysis");
  }

  return JSON.parse(text) as AIAnalysisResult;
}

/**
 * Generate a parent-friendly summary of analysis results.
 * Returns plain text suitable for display.
 */
export async function generateParentSummary(
  analysisData: Record<string, unknown>
): Promise<string> {
  const client = getOpenAI();

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are Galexii, a parent advocate AI. Write a clear, empowering 3-4 paragraph summary of these IEP analysis results for a parent who may not understand special education terminology. 

Use warm, encouraging language. Highlight what's working well, then clearly explain any concerns and what the parent can do about them. End with 2-3 specific next steps.

Do NOT include student names or PII in your summary — use "your child" or "the student."`,
      },
      {
        role: "user",
        content: JSON.stringify(analysisData, null, 2),
      },
    ],
    temperature: 0.6,
    max_tokens: 1500,
  });

  return response.choices[0]?.message?.content || "Unable to generate summary.";
}
