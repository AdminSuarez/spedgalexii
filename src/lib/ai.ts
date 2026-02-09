/**
 * AI Service Layer for SpEdGalexii
 * 
 * Handles all OpenAI interactions with FERPA-safe system prompts.
 * Student data is processed in-session only — never stored by OpenAI.
 * 
 * Uses: gpt-4o-mini for chat, gpt-4o for deep analysis
 */

import OpenAI from "openai";

// ── Client (lazy singleton) ──
let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is not set. Add it to .env.local to enable AI features."
      );
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

// ── System Prompts ──

const SYSTEM_CHAT = `You are Galexii, an expert Special Education AI assistant built into SpEdGalexii — an IEP analysis platform for parents, advocates, and case managers.

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
 * Stream a chat response from OpenAI.
 * Returns a ReadableStream for Server-Sent Events.
 */
export async function streamChat(
  messages: ChatMessage[],
  context?: string
): Promise<ReadableStream<Uint8Array>> {
  const client = getClient();

  const systemMessages: ChatMessage[] = [
    { role: "system", content: SYSTEM_CHAT },
  ];

  // If analysis context is provided, inject it
  if (context) {
    systemMessages.push({
      role: "system",
      content: `The user is currently viewing analysis results for a student. Here is the context:\n\n${context}\n\nUse this data to answer their questions accurately. Reference specific findings when relevant.`,
    });
  }

  const stream = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [...systemMessages, ...messages],
    stream: true,
    temperature: 0.7,
    max_tokens: 2000,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Stream error" })}\n\n`
          )
        );
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
  const client = getClient();

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
  const client = getClient();

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
