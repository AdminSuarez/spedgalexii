/**
 * /api/ard-packet
 *
 * POST  { studentId, analysisJson? }
 *
 * Generates a Galexii-branded ARD summary PPTX in-memory and returns
 * it as a file download. Optionally accepts a pre-computed Deep Dive
 * analysis JSON payload; if omitted it attempts to load the most recent
 * one from Supabase cloud storage.
 *
 * Slide order mirrors ARD_Template_Galexii_Blank.pptx (20 slides):
 *  1.  Title slide
 *  2.  Eligibility & Impact of Disability
 *  3.  Evaluation History / FIE & REED
 *  4.  Student Strengths
 *  5.  Areas of Growth / Needs
 *  6.  Student & Parent Input
 *  7.  Teacher Feedback
 *  8.  Grades – Prior & Current Year
 *  9.  Attendance / Absences
 *  10. Progression in Dyslexia / Reading Services
 *  11. STAAR Performance & Focus
 *  12. MAP Performance & Projections
 *  13. Progress on Prior Year Goals
 *  14. New Annual Goals
 *  15. Accommodations – Classroom & Testing
 *  16. Assistive Technology
 *  17. LRE, Academic Placement, AIP & ESY
 *  18. Compensatory Services & Transportation
 *  19. Transition & Post-Secondary Goals
 *  20. Medicaid, 5-Day Waiver, Consent & Closing
 */

import { NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// ─── Galexii Brand Colors ─────────────────────────────────────────────────────
const COLORS = {
  bgDeep: "0f0c29",      // deep space background
  bgMid: "1a1040",       // slide body background
  bgCard: "16103a",      // card/panel background
  accent: "9b5cfb",      // violet accent (primary)
  accentCyan: "22d3ee",  // cyan highlight
  accentMint: "34d399",  // mint / green
  accentAmber: "fbbf24", // amber / warning
  accentRed: "f87171",   // red / critical
  white: "FFFFFF",
  white70: "b3b3cc",
  starGlow: "c4b5fd",
};

// ─── Typography ──────────────────────────────────────────────────────────────
const FONT = "Calibri";
const TITLE_SIZE = 22;
const BODY_SIZE = 13;
const META_SIZE = 11;

// ─── Layout constants (inches) ───────────────────────────────────────────────
const W = 13.33; // widescreen 16:9 width
const H = 7.5;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Draw a solid background rectangle filling the whole slide */
function addBg(slide: PptxGenJS.Slide, color: string) {
  slide.addShape(PptxGenJS.ShapeType.rect, {
    x: 0, y: 0, w: W, h: H,
    fill: { color },
    line: { color, width: 0 },
  });
}

/** Subtle gradient-like inner glow via a centered semi-transparent oval */
function addGlow(slide: PptxGenJS.Slide) {
  slide.addShape(PptxGenJS.ShapeType.ellipse, {
    x: W / 2 - 4, y: H / 2 - 2.5, w: 8, h: 5,
    fill: { color: COLORS.accent, transparency: 88 },
    line: { color: COLORS.bgDeep, width: 0 },
  });
}

/** Top accent bar */
function addTopBar(slide: PptxGenJS.Slide, color = COLORS.accent) {
  slide.addShape(PptxGenJS.ShapeType.rect, {
    x: 0, y: 0, w: W, h: 0.08,
    fill: { color },
    line: { color, width: 0 },
  });
}

/** Bottom accent bar */
function addBottomBar(slide: PptxGenJS.Slide, color = COLORS.accent) {
  slide.addShape(PptxGenJS.ShapeType.rect, {
    x: 0, y: H - 0.06, w: W, h: 0.06,
    fill: { color },
    line: { color, width: 0 },
  });
}

/** Slide number badge */
function addSlideNum(slide: PptxGenJS.Slide, num: number) {
  slide.addText(`${num}`, {
    x: W - 0.5, y: H - 0.35, w: 0.35, h: 0.25,
    fontSize: 9,
    color: COLORS.white70,
    bold: false,
    align: "right",
  });
}

/** Left vertical accent stripe */
function addLeftStripe(slide: PptxGenJS.Slide, color = COLORS.accent) {
  slide.addShape(PptxGenJS.ShapeType.rect, {
    x: 0, y: 0.08, w: 0.08, h: H - 0.14,
    fill: { color },
    line: { color, width: 0 },
  });
}

/** Section header block */
function addSectionHeader(
  slide: PptxGenJS.Slide,
  title: string,
  subtitle = "",
  color = COLORS.accent,
) {
  // Header bar
  slide.addShape(PptxGenJS.ShapeType.rect, {
    x: 0.15, y: 0.15, w: W - 0.3, h: 0.85,
    fill: { color: COLORS.bgCard },
    line: { color, width: 1.5 },
    rectRadius: 0.08,
  });

  // Glowing left tab on header
  slide.addShape(PptxGenJS.ShapeType.rect, {
    x: 0.15, y: 0.15, w: 0.12, h: 0.85,
    fill: { color },
    line: { color, width: 0 },
    rectRadius: 0.05,
  });

  slide.addText(title, {
    x: 0.38, y: 0.18, w: W - 0.6, h: 0.52,
    fontSize: TITLE_SIZE,
    bold: true,
    color: COLORS.white,
    fontFace: FONT,
    shadow: { type: "outer", color: color, blur: 8, offset: 0, angle: 270, opacity: 0.6 },
  });

  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.38, y: 0.65, w: W - 0.6, h: 0.3,
      fontSize: META_SIZE,
      color: COLORS.white70,
      fontFace: FONT,
    });
  }
}

/** Body text box with optional card background */
function addBody(
  slide: PptxGenJS.Slide,
  text: string,
  opts: { x?: number; y?: number; w?: number; h?: number; color?: string; size?: number } = {},
) {
  const {
    x = 0.22,
    y = 1.12,
    w = W - 0.44,
    h = H - 1.4,
    color = COLORS.white,
    size = BODY_SIZE,
  } = opts;

  // Card background
  slide.addShape(PptxGenJS.ShapeType.rect, {
    x, y, w, h,
    fill: { color: COLORS.bgCard },
    line: { color: COLORS.accent, width: 0.5, transparency: 70 },
    rectRadius: 0.1,
  });

  slide.addText(text || "(No data available for this section)", {
    x: x + 0.18,
    y: y + 0.18,
    w: w - 0.36,
    h: h - 0.36,
    fontSize: size,
    color,
    fontFace: FONT,
    valign: "top",
    wrap: true,
    breakLine: true,
  });
}

/** Two-column layout */
function addTwoCol(
  slide: PptxGenJS.Slide,
  leftTitle: string,
  leftText: string,
  rightTitle: string,
  rightText: string,
) {
  const colW = (W - 0.6) / 2;
  const yStart = 1.12;
  const colH = H - 1.4;

  for (const [i, { title, text }] of [
    { title: leftTitle, text: leftText },
    { title: rightTitle, text: rightText },
  ].entries()) {
    const x = 0.22 + i * (colW + 0.16);
    slide.addShape(PptxGenJS.ShapeType.rect, {
      x, y: yStart, w: colW, h: colH,
      fill: { color: COLORS.bgCard },
      line: { color: COLORS.accentCyan, width: 0.5, transparency: 60 },
      rectRadius: 0.1,
    });
    // Column title
    slide.addText(title, {
      x: x + 0.14, y: yStart + 0.1, w: colW - 0.28, h: 0.35,
      fontSize: 12,
      bold: true,
      color: COLORS.accentCyan,
      fontFace: FONT,
    });
    // Column body
    slide.addText(text || "—", {
      x: x + 0.14, y: yStart + 0.5, w: colW - 0.28, h: colH - 0.65,
      fontSize: BODY_SIZE - 1,
      color: COLORS.white,
      fontFace: FONT,
      valign: "top",
      wrap: true,
      breakLine: true,
    });
  }
}

/** Confidentiality footer on every content slide */
function addFooter(slide: PptxGenJS.Slide, studentName: string) {
  slide.addText(
    `CONFIDENTIAL — ${studentName.toUpperCase()} — ARD DELIBERATIONS — NOT A PUBLIC RECORD`,
    {
      x: 0.2, y: H - 0.32, w: W - 0.4, h: 0.25,
      fontSize: 8,
      color: COLORS.white70,
      align: "center",
      fontFace: FONT,
    },
  );
}

/** Standard content slide: background + bars + section header + body + footer */
function makeContentSlide(
  prs: PptxGenJS,
  slideNum: number,
  title: string,
  subtitle: string,
  body: string,
  studentName: string,
  accentColor = COLORS.accent,
): PptxGenJS.Slide {
  const slide = prs.addSlide();
  addBg(slide, COLORS.bgDeep);
  addGlow(slide);
  addTopBar(slide, accentColor);
  addBottomBar(slide, accentColor);
  addLeftStripe(slide, accentColor);
  addSectionHeader(slide, title, subtitle, accentColor);
  addBody(slide, body);
  addFooter(slide, studentName);
  addSlideNum(slide, slideNum);
  return slide;
}

// ─── AI Content Generator ─────────────────────────────────────────────────────

type AIBlocks = Record<string, string>;

async function generateAIBlocks(
  analysis: Record<string, unknown>,
  apiKey: string,
): Promise<AIBlocks> {
  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 4096,
      messages: [
        {
          role: "system",
          content:
            "You are an expert ARD facilitator and special education case manager. " +
            "Given a Deep Dive JSON for a single student, produce concise, " +
            "professional narrative text for each ARD slide. Write in neutral, " +
            "school-friendly language that can be read aloud in a meeting. " +
            "Do NOT use markdown, bullets, or headings — plain text paragraphs only. " +
            "Keep names first-name only for family members. " +
            "If data for a section is missing, write a short professional placeholder.",
        },
        {
          role: "user",
          content:
            "Return a JSON object with these exact keys: " +
            "eligibility, evaluation, strengths, areas_of_need, " +
            "student_parent_input, teacher_feedback, grades_summary, " +
            "attendance, dyslexia_progress, staar_summary, map_summary, " +
            "prior_goals_progress, new_goals_overview, " +
            "accommodations_summary, assistive_technology, " +
            "placement_lre, comp_transport, transition_summary, " +
            "closing_deliberations. " +
            "Each value is a short paragraph (2–5 sentences). " +
            "Here is the Deep Dive JSON:\n" +
            JSON.stringify(analysis),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([, v]) => typeof v === "string")
        .map(([k, v]) => [k, v as string]),
    );
  } catch {
    return {};
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY ?? "";

    const body = await req.json().catch(() => ({})) as {
      studentId?: string;
      analysisJson?: Record<string, unknown>;
    };

    const studentId = (body.studentId ?? "").trim();
    if (!studentId) {
      return NextResponse.json({ ok: false, error: "studentId is required" }, { status: 400 });
    }

    const analysis: Record<string, unknown> = body.analysisJson ?? {};
    const studentInfo = (analysis.student_info ?? {}) as Record<string, unknown>;
    const studentName = String(studentInfo.name ?? `Student ${studentId}`);
    const grade = String(studentInfo.grade ?? "");
    const disability = String(studentInfo.disability ?? "");
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Generate AI narrative blocks (fails gracefully if no key)
    const ai: AIBlocks = apiKey
      ? await generateAIBlocks(analysis, apiKey)
      : {};

    // ── Build PPTX ────────────────────────────────────────────────────────────
    const prs = new PptxGenJS();
    prs.layout = "LAYOUT_WIDE"; // 13.33 × 7.5

    // ── Slide 1: Title ────────────────────────────────────────────────────────
    {
      const slide = prs.addSlide();
      addBg(slide, COLORS.bgDeep);

      // Star-field dots (cosmetic)
      for (let i = 0; i < 40; i++) {
        const sx = Math.random() * W;
        const sy = Math.random() * H;
        const size = Math.random() < 0.2 ? 0.045 : 0.02;
        slide.addShape(PptxGenJS.ShapeType.ellipse, {
          x: sx, y: sy, w: size, h: size,
          fill: { color: COLORS.white, transparency: Math.floor(Math.random() * 50 + 30) },
          line: { color: COLORS.bgDeep, width: 0 },
        });
      }

      // Central glow
      slide.addShape(PptxGenJS.ShapeType.ellipse, {
        x: W / 2 - 3.5, y: H / 2 - 2, w: 7, h: 4,
        fill: { color: COLORS.accent, transparency: 82 },
        line: { color: COLORS.bgDeep, width: 0 },
      });

      // Logo placeholder (orbit ring)
      slide.addShape(PptxGenJS.ShapeType.ellipse, {
        x: W / 2 - 0.7, y: 0.5, w: 1.4, h: 1.4,
        fill: { color: COLORS.bgCard },
        line: { color: COLORS.accent, width: 2 },
      });
      slide.addText("✦", {
        x: W / 2 - 0.7, y: 0.55, w: 1.4, h: 1.3,
        fontSize: 36,
        color: COLORS.accentCyan,
        align: "center",
        valign: "middle",
      });

      // App name
      slide.addText("SpEdGalexii", {
        x: 1, y: 2.0, w: W - 2, h: 0.55,
        fontSize: 14,
        bold: false,
        color: COLORS.accentCyan,
        align: "center",
        fontFace: FONT,
        charSpacing: 4,
      });

      // Student name (big)
      slide.addText(studentName, {
        x: 0.5, y: 2.55, w: W - 1, h: 1.1,
        fontSize: 42,
        bold: true,
        color: COLORS.white,
        align: "center",
        fontFace: FONT,
        shadow: { type: "outer", color: COLORS.accent, blur: 20, offset: 0, angle: 270, opacity: 0.8 },
      });

      // Subtitle line
      const subtitleParts = [
        grade ? `Grade ${grade}` : "",
        disability || "",
        `ID: ${studentId}`,
      ].filter(Boolean).join("  •  ");

      slide.addText(subtitleParts, {
        x: 1, y: 3.65, w: W - 2, h: 0.4,
        fontSize: 15,
        color: COLORS.starGlow,
        align: "center",
        fontFace: FONT,
      });

      // ARD label
      slide.addText("ARD Annual Meeting", {
        x: 1, y: 4.1, w: W - 2, h: 0.4,
        fontSize: 18,
        bold: true,
        color: COLORS.accentAmber,
        align: "center",
        fontFace: FONT,
      });

      slide.addText(today, {
        x: 1, y: 4.55, w: W - 2, h: 0.32,
        fontSize: 13,
        color: COLORS.white70,
        align: "center",
        fontFace: FONT,
      });

      // Confidentiality notice
      slide.addShape(PptxGenJS.ShapeType.rect, {
        x: W / 2 - 3.5, y: 5.2, w: 7, h: 0.5,
        fill: { color: COLORS.bgCard },
        line: { color: COLORS.accentRed, width: 1 },
        rectRadius: 0.06,
      });
      slide.addText(
        "CONFIDENTIAL — ARD DELIBERATIONS — NOT A PUBLIC RECORD",
        {
          x: W / 2 - 3.5, y: 5.24, w: 7, h: 0.42,
          fontSize: 9,
          bold: true,
          color: COLORS.accentRed,
          align: "center",
          fontFace: FONT,
        },
      );

      addTopBar(slide, COLORS.accent);
      addBottomBar(slide, COLORS.accentCyan);
    }

    // ── Slide 2: Eligibility ──────────────────────────────────────────────────
    makeContentSlide(prs, 2,
      "Eligibility & Impact of Disability",
      "Special education eligibility and how disability impacts access to the general curriculum",
      ai.eligibility ?? "",
      studentName, COLORS.accent);

    // ── Slide 3: Evaluation History ───────────────────────────────────────────
    makeContentSlide(prs, 3,
      "Evaluation History, FIE & REED",
      "Full Individual Evaluation dates and Review of Existing Evaluation Data",
      ai.evaluation ?? "",
      studentName, COLORS.accentCyan);

    // ── Slide 4: Strengths ────────────────────────────────────────────────────
    makeContentSlide(prs, 4,
      "Student Strengths",
      "Areas of academic, behavioral, and social-emotional strength",
      ai.strengths ?? "",
      studentName, COLORS.accentMint);

    // ── Slide 5: Areas of Growth ──────────────────────────────────────────────
    makeContentSlide(prs, 5,
      "Areas of Growth / Needs",
      "Present levels of academic achievement and functional performance",
      ai.areas_of_need ?? "",
      studentName, COLORS.accentAmber);

    // ── Slide 6: Student & Parent Input ──────────────────────────────────────
    makeContentSlide(prs, 6,
      "Student & Parent Input",
      "Student and family concerns, hopes, and priorities for this IEP",
      ai.student_parent_input ?? "",
      studentName, COLORS.accent);

    // ── Slide 7: Teacher Feedback ─────────────────────────────────────────────
    makeContentSlide(prs, 7,
      "Teacher Feedback",
      "Current teacher observations across academic and behavioral domains",
      ai.teacher_feedback ?? "",
      studentName, COLORS.accentCyan);

    // ── Slide 8: Grades ──────────────────────────────────────────────────────
    {
      const slide = prs.addSlide();
      addBg(slide, COLORS.bgDeep);
      addGlow(slide);
      addTopBar(slide, COLORS.accentAmber);
      addBottomBar(slide, COLORS.accentAmber);
      addLeftStripe(slide, COLORS.accentAmber);
      addSectionHeader(slide,
        "Grades – Prior & Current Year",
        "Academic performance across courses by grading period",
        COLORS.accentAmber);
      addTwoCol(slide,
        "Prior Year", ai.grades_summary ? `Prior year overview:\n${ai.grades_summary}` : "(No prior year grade data)",
        "Current Year", ai.grades_summary ?? "(No current year grade data)");
      addFooter(slide, studentName);
      addSlideNum(slide, 8);
    }

    // ── Slide 9: Attendance ───────────────────────────────────────────────────
    makeContentSlide(prs, 9,
      "Attendance / Absences",
      "Attendance history, patterns, and impact on learning",
      ai.attendance ?? "",
      studentName, COLORS.accentAmber);

    // ── Slide 10: Dyslexia ────────────────────────────────────────────────────
    makeContentSlide(prs, 10,
      "Progression in Dyslexia / Reading Services",
      "Dyslexia identification, services, and phonological awareness progress",
      ai.dyslexia_progress ?? "",
      studentName, COLORS.accentCyan);

    // ── Slide 11: STAAR ───────────────────────────────────────────────────────
    makeContentSlide(prs, 11,
      "STAAR Performance & Focus",
      "State assessment history, performance levels, and instructional implications",
      ai.staar_summary ?? "",
      studentName, COLORS.accent);

    // ── Slide 12: MAP ─────────────────────────────────────────────────────────
    makeContentSlide(prs, 12,
      "MAP Performance & Projections",
      "NWEA MAP RIT scores, percentile rankings, and growth projections",
      ai.map_summary ?? "",
      studentName, COLORS.accentMint);

    // ── Slide 13: Prior Goals ─────────────────────────────────────────────────
    makeContentSlide(prs, 13,
      "Progress on Prior Year Goals",
      "Annual goal progress from previous IEP with mastery data",
      ai.prior_goals_progress ?? "",
      studentName, COLORS.accentCyan);

    // ── Slide 14: New Goals ───────────────────────────────────────────────────
    makeContentSlide(prs, 14,
      "New Annual Goals",
      "Proposed goals for the upcoming IEP year with objectives and benchmarks",
      ai.new_goals_overview ?? "",
      studentName, COLORS.accentMint);

    // ── Slide 15: Accommodations ──────────────────────────────────────────────
    {
      const slide = prs.addSlide();
      addBg(slide, COLORS.bgDeep);
      addGlow(slide);
      addTopBar(slide, COLORS.accent);
      addBottomBar(slide, COLORS.accent);
      addLeftStripe(slide, COLORS.accent);
      addSectionHeader(slide,
        "Accommodations – Classroom & Testing",
        "Instructional and state/district testing accommodations",
        COLORS.accent);
      addTwoCol(slide,
        "Classroom Accommodations", ai.accommodations_summary ?? "(See IEP document for full list)",
        "State/District Testing", ai.accommodations_summary ?? "(See IEP document for full list)");
      addFooter(slide, studentName);
      addSlideNum(slide, 15);
    }

    // ── Slide 16: Assistive Technology ───────────────────────────────────────
    makeContentSlide(prs, 16,
      "Assistive Technology",
      "Devices, software, and supports considered and recommended",
      ai.assistive_technology ?? "(Assistive technology needs were reviewed. See IEP for specifics.)",
      studentName, COLORS.accentCyan);

    // ── Slide 17: LRE / Placement ─────────────────────────────────────────────
    makeContentSlide(prs, 17,
      "LRE, Academic Placement, AIP & ESY",
      "Least Restrictive Environment determination and supplementary aids",
      ai.placement_lre ?? "",
      studentName, COLORS.accentAmber);

    // ── Slide 18: Compensatory / Transportation ───────────────────────────────
    makeContentSlide(prs, 18,
      "Compensatory Services & Transportation",
      "Compensatory education consideration and transportation needs",
      ai.comp_transport ?? "(Compensatory services and transportation needs were reviewed.)",
      studentName, COLORS.accent);

    // ── Slide 19: Transition ──────────────────────────────────────────────────
    makeContentSlide(prs, 19,
      "Transition & Post-Secondary Goals",
      "Age-appropriate transition assessments and post-secondary planning (age 14+)",
      ai.transition_summary ?? "(Transition planning reviewed per age requirements.)",
      studentName, COLORS.accentMint);

    // ── Slide 20: Closing ─────────────────────────────────────────────────────
    {
      const slide = prs.addSlide();
      addBg(slide, COLORS.bgDeep);

      // Same star glow as title slide
      slide.addShape(PptxGenJS.ShapeType.ellipse, {
        x: W / 2 - 3, y: H / 2 - 2, w: 6, h: 4,
        fill: { color: COLORS.accentMint, transparency: 85 },
        line: { color: COLORS.bgDeep, width: 0 },
      });

      addTopBar(slide, COLORS.accentMint);
      addBottomBar(slide, COLORS.accentMint);
      addLeftStripe(slide, COLORS.accentMint);

      addSectionHeader(slide,
        "Medicaid, 5-Day Waiver, Consent & Closing",
        "Parental consent, Medicaid billing authorization, and meeting closure",
        COLORS.accentMint);

      addBody(slide,
        ai.closing_deliberations ??
        "The committee reviewed all items on the ARD agenda. Parental consent was discussed " +
        "as applicable. Meeting proceedings were documented. This IEP was developed with input " +
        "from all required team members.");

      addFooter(slide, studentName);
      addSlideNum(slide, 20);

      // Bottom signature area
      slide.addShape(PptxGenJS.ShapeType.rect, {
        x: 0.22, y: H - 1.2, w: W - 0.44, h: 0.65,
        fill: { color: COLORS.bgCard },
        line: { color: COLORS.accentMint, width: 0.5, transparency: 50 },
        rectRadius: 0.07,
      });
      slide.addText(
        "Generated by SpEdGalexii  •  spedgalexii.com  •  " + today + "  •  FOR ARD USE ONLY",
        {
          x: 0.22, y: H - 1.15, w: W - 0.44, h: 0.55,
          fontSize: 9,
          color: COLORS.white70,
          align: "center",
          fontFace: FONT,
        },
      );
    }

    // ── Serialize and return ──────────────────────────────────────────────────
    const rawBuffer = await prs.write({ outputType: "nodebuffer" });
    const filename = `ARD_${studentName.replace(/\s+/g, "_")}_${studentId}_${new Date().toISOString().slice(0, 10)}.pptx`;
    const pptxMime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

    // pptxgenjs returns a Node.js Buffer; cast via ArrayBuffer so BodyInit accepts it.
    const arrayBuf: ArrayBuffer =
      rawBuffer instanceof ArrayBuffer
        ? rawBuffer
        : (rawBuffer as { buffer: ArrayBuffer }).buffer
          ?? Buffer.from(rawBuffer as Uint8Array).buffer;

    return new Response(arrayBuf, {
      status: 200,
      headers: {
        "Content-Type": pptxMime,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "PPT generation failed" }, { status: 500 });
  }
}
