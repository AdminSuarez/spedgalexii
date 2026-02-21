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

/** Bullet-list card: draws a card background then lays down one row per item */
function addBulletCard(
  slide: PptxGenJS.Slide,
  items: string[],
  opts: { x?: number; y?: number; w?: number; h?: number; color?: string; bullet?: string } = {},
) {
  const { x = 0.22, y = 1.12, w = W - 0.44, h = H - 1.4, color = COLORS.white, bullet = "✓" } = opts;
  slide.addShape(PptxGenJS.ShapeType.rect, {
    x, y, w, h,
    fill: { color: COLORS.bgCard },
    line: { color: COLORS.accent, width: 0.5, transparency: 70 },
    rectRadius: 0.1,
  });
  const rows = items.slice(0, 18).map(item => [
    { text: `${bullet}  `, options: { color: color, bold: true } },
    { text: item, options: { color: COLORS.white } },
  ]);
  slide.addText(rows.map(r => r.map(c => c.text).join("")).join("\n"), {
    x: x + 0.18, y: y + 0.15, w: w - 0.36, h: h - 0.25,
    fontSize: BODY_SIZE - 1,
    color: COLORS.white,
    fontFace: FONT,
    valign: "top",
    wrap: true,
    breakLine: true,
  });
}

/** Draw a simple table from headers + rows arrays */
function addTable(
  slide: PptxGenJS.Slide,
  headers: string[],
  rows: string[][],
  opts: { x?: number; y?: number; w?: number; h?: number; headerColor?: string } = {},
) {
  const {
    x = 0.22, y = 1.12, w = W - 0.44, h = H - 1.45,
    headerColor = COLORS.accent,
  } = opts;

  const colW = w / headers.length;
  const headerH = 0.38;
  const rowH = Math.min(0.36, (h - headerH) / Math.max(rows.length, 1));

  // Header row
  headers.forEach((hdr, ci) => {
    slide.addShape(PptxGenJS.ShapeType.rect, {
      x: x + ci * colW, y,
      w: colW, h: headerH,
      fill: { color: headerColor },
      line: { color: COLORS.bgDeep, width: 0.5 },
    });
    slide.addText(hdr, {
      x: x + ci * colW + 0.05, y: y + 0.05,
      w: colW - 0.1, h: headerH - 0.1,
      fontSize: 10, bold: true,
      color: COLORS.bgDeep, fontFace: FONT,
      align: "center", valign: "middle",
    });
  });

  // Data rows
  rows.forEach((row, ri) => {
    const ry = y + headerH + ri * rowH;
    const bg = ri % 2 === 0 ? COLORS.bgCard : COLORS.bgMid;
    row.forEach((cell, ci) => {
      slide.addShape(PptxGenJS.ShapeType.rect, {
        x: x + ci * colW, y: ry,
        w: colW, h: rowH,
        fill: { color: bg },
        line: { color: COLORS.bgDeep, width: 0.4 },
      });
      slide.addText(cell, {
        x: x + ci * colW + 0.05, y: ry + 0.03,
        w: colW - 0.1, h: rowH - 0.06,
        fontSize: 10, color: COLORS.white, fontFace: FONT,
        align: "center", valign: "middle",
      });
    });
  });
}

/** Draw a horizontal score bar with label + value */
function addScoreBar(
  slide: PptxGenJS.Slide,
  label: string,
  score: number,
  max: number,
  x: number, y: number, w: number,
  color: string,
) {
  const pct = Math.min(1, Math.max(0, score / max));
  const barH = 0.13;
  // label
  slide.addText(label, {
    x, y, w: w - 0.55, h: barH + 0.05,
    fontSize: 9, color: COLORS.white70, fontFace: FONT, valign: "middle",
  });
  // value
  slide.addText(String(score), {
    x: x + w - 0.5, y, w: 0.45, h: barH + 0.05,
    fontSize: 9, bold: true, color, fontFace: FONT, align: "right", valign: "middle",
  });
  // track
  slide.addShape(PptxGenJS.ShapeType.rect, {
    x, y: y + barH + 0.06, w, h: barH,
    fill: { color, transparency: 75 },
    line: { color: COLORS.bgDeep, width: 0 },
    rectRadius: 0.04,
  });
  // fill
  if (pct > 0) {
    slide.addShape(PptxGenJS.ShapeType.rect, {
      x, y: y + barH + 0.06, w: w * pct, h: barH,
      fill: { color },
      line: { color: COLORS.bgDeep, width: 0 },
      rectRadius: 0.04,
    });
  }
}

/** A small pill / badge shape + text */
function addPill(slide: PptxGenJS.Slide, label: string, x: number, y: number, color: string) {
  const tw = Math.min(3.2, label.length * 0.095 + 0.3);
  slide.addShape(PptxGenJS.ShapeType.rect, {
    x, y, w: tw, h: 0.26,
    fill: { color, transparency: 78 },
    line: { color, width: 1 },
    rectRadius: 0.13,
  });
  slide.addText(label, {
    x: x + 0.05, y: y + 0.02, w: tw - 0.1, h: 0.22,
    fontSize: 9, bold: true, color, fontFace: FONT,
    align: "center", valign: "middle",
  });
  return tw + 0.12; // return width used (for advancing x)
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
    {
      const fieData = (analysis.fie_data ?? {}) as Record<string, unknown>;
      const categories = (fieData.disability_categories_considered ?? []) as string[];
      const impactAreas = (fieData.areas_of_need ?? []) as string[];
      const eligDisability = String(fieData.eligible_disability ?? disability);

      const slide = prs.addSlide();
      addBg(slide, COLORS.bgDeep);
      addGlow(slide);
      addTopBar(slide, COLORS.accent);
      addBottomBar(slide, COLORS.accent);
      addLeftStripe(slide, COLORS.accent);
      addSectionHeader(slide,
        "Eligibility & Impact of Disability",
        "Special education eligibility and how disability impacts access to the general curriculum",
        COLORS.accent);

      // Card background
      slide.addShape(PptxGenJS.ShapeType.rect, {
        x: 0.22, y: 1.12, w: W - 0.44, h: H - 1.4,
        fill: { color: COLORS.bgCard },
        line: { color: COLORS.accent, width: 0.5, transparency: 70 },
        rectRadius: 0.1,
      });

      // Primary eligibility label
      slide.addText("Primary Eligibility:", {
        x: 0.42, y: 1.22, w: 2.5, h: 0.28,
        fontSize: 10, bold: true, color: COLORS.white70, fontFace: FONT,
      });
      slide.addText(eligDisability || "Pending", {
        x: 2.98, y: 1.22, w: 8, h: 0.28,
        fontSize: 11, bold: true, color: COLORS.accent, fontFace: FONT,
      });

      // IDEA categories considered as pills
      slide.addText("Categories Considered:", {
        x: 0.42, y: 1.58, w: 2.8, h: 0.26,
        fontSize: 10, bold: true, color: COLORS.white70, fontFace: FONT,
      });
      let px = 3.28, py = 1.58;
      const pillColors = [COLORS.accent, COLORS.accentCyan, COLORS.accentMint, COLORS.accentAmber];
      (categories.length ? categories : [eligDisability]).filter(Boolean).forEach((cat, ci) => {
        const tw = addPill(slide, cat, px, py, pillColors[ci % pillColors.length] ?? COLORS.accent);
        px += tw;
        if (px > W - 1.5) { px = 3.28; py += 0.32; }
      });

      // Impact areas section
      const impactY = Math.max(2.1, py + 0.38);
      slide.addText("Impact on General Curriculum:", {
        x: 0.42, y: impactY, w: 4, h: 0.26,
        fontSize: 10, bold: true, color: COLORS.accentAmber, fontFace: FONT,
      });
      const impactList = impactAreas.length
        ? impactAreas.slice(0, 8).join("  •  ")
        : (ai.eligibility ?? "See IEP document for details");
      slide.addText(impactList, {
        x: 0.42, y: impactY + 0.3, w: W - 0.85, h: H - impactY - 1.05,
        fontSize: BODY_SIZE - 1, color: COLORS.white, fontFace: FONT,
        valign: "top", wrap: true, breakLine: true,
      });

      addFooter(slide, studentName);
      addSlideNum(slide, 2);
    }

    // ── Slide 3: Evaluation History / FIE & REED ────────────────────────────────
    {
      const fieData = (analysis.fie_data ?? {}) as Record<string, unknown>;
      const reedData = (analysis.reed_data ?? {}) as Record<string, unknown>;
      const tests = (fieData.tests_administered ?? []) as Array<Record<string, unknown>>;

      const slide = prs.addSlide();
      addBg(slide, COLORS.bgDeep);
      addGlow(slide);
      addTopBar(slide, COLORS.accentCyan);
      addBottomBar(slide, COLORS.accentCyan);
      addLeftStripe(slide, COLORS.accentCyan);
      addSectionHeader(slide,
        "Evaluation History, FIE & REED",
        "Full Individual Evaluation dates and Review of Existing Evaluation Data",
        COLORS.accentCyan);

      const colW = (W - 0.44) / 2;
      const colH = H - 1.42;
      const leftX = 0.22, rightX = 0.22 + colW + 0.08;

      // ── Left: FIE metadata + test table ──
      slide.addShape(PptxGenJS.ShapeType.rect, {
        x: leftX, y: 1.12, w: colW - 0.04, h: colH,
        fill: { color: COLORS.bgCard },
        line: { color: COLORS.accentCyan, width: 0.5, transparency: 60 },
        rectRadius: 0.1,
      });
      slide.addText("📋  FIE / FIIE", {
        x: leftX + 0.12, y: 1.18, w: colW - 0.28, h: 0.3,
        fontSize: 11, bold: true, color: COLORS.accentCyan, fontFace: FONT,
      });
      const fieLines = [
        fieData.evaluator ? `Evaluator: ${fieData.evaluator}` : null,
        fieData.consent_date ? `Consent: ${fieData.consent_date}` : null,
        fieData.evaluation_date ? `Eval Date: ${fieData.evaluation_date}` : null,
        fieData.reevaluation_due ? `Re-eval Due: ${fieData.reevaluation_due}` : null,
      ].filter(Boolean) as string[];
      slide.addText(fieLines.join("\n") || ai.evaluation || "See IEP records", {
        x: leftX + 0.12, y: 1.52, w: colW - 0.28, h: 0.7,
        fontSize: 10, color: COLORS.white70, fontFace: FONT,
        valign: "top", wrap: true, breakLine: true,
      });

      // Test battery mini-table
      if (tests.length > 0) {
        const tHeaders = ["Test", "Score", "%ile"];
        const tRows = tests.slice(0, 10).map(t => [
          String(t.name ?? t.test ?? ""),
          String(t.standard_score ?? t.score ?? "—"),
          String(t.percentile ?? "—"),
        ]);
        addTable(slide, tHeaders, tRows, {
          x: leftX + 0.08, y: 2.3,
          w: colW - 0.2, h: colH - 1.3,
          headerColor: COLORS.accentCyan,
        });
      } else {
        slide.addText("No test battery data extracted — see FIE document", {
          x: leftX + 0.12, y: 2.3, w: colW - 0.28, h: 0.5,
          fontSize: 9, color: COLORS.white70, fontFace: FONT,
        });
      }

      // ── Right: REED ──
      slide.addShape(PptxGenJS.ShapeType.rect, {
        x: rightX, y: 1.12, w: colW - 0.04, h: colH,
        fill: { color: COLORS.bgCard },
        line: { color: COLORS.accentMint, width: 0.5, transparency: 60 },
        rectRadius: 0.1,
      });
      slide.addText("🔄  REED", {
        x: rightX + 0.12, y: 1.18, w: colW - 0.28, h: 0.3,
        fontSize: 11, bold: true, color: COLORS.accentMint, fontFace: FONT,
      });
      const reedLines = [
        reedData.reed_date ? `REED Date: ${reedData.reed_date}` : null,
        reedData.parent_notified ? `Parent Notified: ${reedData.parent_notified}` : null,
        reedData.additional_data_needed ? `Add'l Data Needed: ${reedData.additional_data_needed}` : null,
        reedData.eligibility_decision ? `Decision: ${reedData.eligibility_decision}` : null,
        reedData.reevaluation_waived ? `Re-eval Waived: ${reedData.reevaluation_waived}` : null,
      ].filter(Boolean) as string[];
      slide.addText(
        reedLines.join("\n") || "REED not found in documents — see case file",
        {
          x: rightX + 0.12, y: 1.52, w: colW - 0.28, h: 1.1,
          fontSize: 10, color: COLORS.white70, fontFace: FONT,
          valign: "top", wrap: true, breakLine: true,
        });

      // Data sources reviewed
      const sources = (reedData.existing_data_sources_reviewed ?? []) as string[];
      if (sources.length > 0) {
        slide.addText("Existing Data Sources Reviewed:", {
          x: rightX + 0.12, y: 2.72, w: colW - 0.28, h: 0.25,
          fontSize: 9, bold: true, color: COLORS.accentMint, fontFace: FONT,
        });
        slide.addText(sources.join("  •  "), {
          x: rightX + 0.12, y: 2.98, w: colW - 0.28, h: colH - 2.0,
          fontSize: 9, color: COLORS.white70, fontFace: FONT,
          valign: "top", wrap: true, breakLine: true,
        });
      }

      addFooter(slide, studentName);
      addSlideNum(slide, 3);
    }

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

    // ── Slide 8: Grades ──────────────────────────────────────────────────
    {
      const gradesProfile = (analysis.grades_profile ?? {}) as Record<string, unknown>;
      const priorRows = (gradesProfile.prior_year ?? []) as Array<Record<string, unknown>>;
      const currRows = (gradesProfile.current_year ?? []) as Array<Record<string, unknown>>;

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

      const halfW = (W - 0.52) / 2;

      // Helper: turn a row array into table rows
      const toTableRows = (arr: Array<Record<string, unknown>>) =>
        arr.map(r => [
          String(r.course ?? r.subject ?? ""),
          String(r.q1 ?? r.Q1 ?? "—"),
          String(r.q2 ?? r.Q2 ?? "—"),
          String(r.q3 ?? r.Q3 ?? "—"),
          String(r.q4 ?? r.Q4 ?? "—"),
          String(r.final ?? r.avg ?? "—"),
        ]);

      // Prior year table
      slide.addText("Prior Year", {
        x: 0.22, y: 1.12, w: halfW, h: 0.28,
        fontSize: 11, bold: true, color: COLORS.accentAmber, fontFace: FONT,
      });
      if (priorRows.length > 0) {
        addTable(slide, ["Course", "Q1", "Q2", "Q3", "Q4", "Final"], toTableRows(priorRows), {
          x: 0.22, y: 1.42, w: halfW, h: H - 1.75,
          headerColor: COLORS.accentAmber,
        });
      } else {
        addBody(slide, ai.grades_summary ?? "(No prior year grade data available)", {
          x: 0.22, y: 1.42, w: halfW, h: H - 1.75,
        });
      }

      // Current year table
      const rightX = 0.22 + halfW + 0.08;
      slide.addText("Current Year", {
        x: rightX, y: 1.12, w: halfW, h: 0.28,
        fontSize: 11, bold: true, color: COLORS.accentCyan, fontFace: FONT,
      });
      if (currRows.length > 0) {
        addTable(slide, ["Course", "Q1", "Q2", "Q3", "Q4", "Final"], toTableRows(currRows), {
          x: rightX, y: 1.42, w: halfW, h: H - 1.75,
          headerColor: COLORS.accentCyan,
        });
      } else {
        addBody(slide, ai.grades_summary ?? "(No current year grade data available)", {
          x: rightX, y: 1.42, w: halfW, h: H - 1.75,
        });
      }

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
    {
      const staarProfile = (analysis.staar_profile ?? {}) as Record<string, unknown>;
      const staarScores = (staarProfile.scores ?? []) as Array<Record<string, unknown>>;

      const slide = prs.addSlide();
      addBg(slide, COLORS.bgDeep);
      addGlow(slide);
      addTopBar(slide, COLORS.accent);
      addBottomBar(slide, COLORS.accent);
      addLeftStripe(slide, COLORS.accent);
      addSectionHeader(slide,
        "STAAR Performance & Focus",
        "State assessment history, performance levels, and instructional implications",
        COLORS.accent);

      if (staarScores.length > 0) {
        // Build a table: Subject | Year | Scale Score | Performance Level
        const tRows = staarScores.slice(0, 14).map(s => [
          String(s.subject ?? s.test ?? ""),
          String(s.year ?? s.admin_year ?? "—"),
          String(s.scale_score ?? s.score ?? "—"),
          String(s.performance_level ?? s.level ?? "—"),
          String(s.approaches ?? s.approaches_grade_level ?? "—"),
        ]);
        addTable(slide, ["Subject", "Year", "Scale Score", "Performance Level", "Approaches GL"],
          tRows, { x: 0.22, y: 1.12, w: W - 0.44, h: H - 1.45, headerColor: COLORS.accent });
      } else {
        // Fall back to score bars for common subjects using AI text
        slide.addShape(PptxGenJS.ShapeType.rect, {
          x: 0.22, y: 1.12, w: W - 0.44, h: H - 1.4,
          fill: { color: COLORS.bgCard },
          line: { color: COLORS.accent, width: 0.5, transparency: 70 },
          rectRadius: 0.1,
        });
        // Performance level legend
        const levels = [
          { label: "Masters", color: COLORS.accentMint },
          { label: "Meets", color: COLORS.accentCyan },
          { label: "Approaches", color: COLORS.accentAmber },
          { label: "Did Not Meet", color: COLORS.accentRed },
        ];
        let lx = 0.4;
        levels.forEach(lv => {
          lx += addPill(slide, lv.label, lx, 1.2, lv.color);
        });
        slide.addText(ai.staar_summary ?? "(No STAAR data extracted — add STAAR documents to Deep Dive)", {
          x: 0.42, y: 1.62, w: W - 0.85, h: H - 2.1,
          fontSize: BODY_SIZE - 1, color: COLORS.white, fontFace: FONT,
          valign: "top", wrap: true, breakLine: true,
        });
      }

      addFooter(slide, studentName);
      addSlideNum(slide, 11);
    }

    // ── Slide 12: MAP ─────────────────────────────────────────────────────────
    {
      const mapProfile = (analysis.map_profile ?? {}) as Record<string, unknown>;
      const mapScores = (mapProfile.scores ?? []) as Array<Record<string, unknown>>;

      const slide = prs.addSlide();
      addBg(slide, COLORS.bgDeep);
      addGlow(slide);
      addTopBar(slide, COLORS.accentMint);
      addBottomBar(slide, COLORS.accentMint);
      addLeftStripe(slide, COLORS.accentMint);
      addSectionHeader(slide,
        "MAP Performance & Projections",
        "NWEA MAP RIT scores, percentile rankings, and growth projections",
        COLORS.accentMint);

      slide.addShape(PptxGenJS.ShapeType.rect, {
        x: 0.22, y: 1.12, w: W - 0.44, h: H - 1.4,
        fill: { color: COLORS.bgCard },
        line: { color: COLORS.accentMint, width: 0.5, transparency: 70 },
        rectRadius: 0.1,
      });

      if (mapScores.length > 0) {
        // Draw one score bar per subject
        let barY = 1.28;
        const barW = (W - 0.88) / 2 - 0.1;
        mapScores.slice(0, 6).forEach((s, si) => {
          const col = si % 2;
          const bx = 0.42 + col * (barW + 0.2);
          if (col === 0 && si > 0) barY += 0.9;
          const rit = Number(s.rit_score ?? s.rit ?? s.score ?? 0);
          const norm = Number(s.normative_mean ?? s.norm_rit ?? rit);
          const pct = Number(s.percentile ?? 50);
          const subj = String(s.subject ?? s.area ?? `Subject ${si + 1}`);

          slide.addText(subj, {
            x: bx, y: barY, w: barW, h: 0.22,
            fontSize: 10, bold: true, color: COLORS.accentMint, fontFace: FONT,
          });
          addScoreBar(slide, `RIT: ${rit}  |  Norm: ${norm}`, rit,
            Math.max(rit + 20, norm + 20), bx, barY + 0.24, barW, COLORS.accentMint);
          addScoreBar(slide, `Percentile: ${pct}%`, pct,
            100, bx, barY + 0.54, barW, COLORS.accentCyan);

          const projected = s.projected_rit ?? s.growth_projection ?? null;
          if (projected) {
            slide.addText(`Projected: ${projected}`, {
              x: bx, y: barY + 0.78, w: barW, h: 0.2,
              fontSize: 9, color: COLORS.accentAmber, fontFace: FONT,
            });
          }
        });
      } else {
        slide.addText(ai.map_summary ?? "(No MAP data extracted — add NWEA MAP reports to Deep Dive)", {
          x: 0.42, y: 1.28, w: W - 0.85, h: H - 2.0,
          fontSize: BODY_SIZE - 1, color: COLORS.white, fontFace: FONT,
          valign: "top", wrap: true, breakLine: true,
        });
      }

      addFooter(slide, studentName);
      addSlideNum(slide, 12);
    }

    // ── Slide 13: Prior Goals ─────────────────────────────────────────────────
    makeContentSlide(prs, 13,
      "Progress on Prior Year Goals",
      "Annual goal progress from previous IEP with mastery data",
      ai.prior_goals_progress ?? "",
      studentName, COLORS.accentCyan);

    // ── Slide 14: New Goals ───────────────────────────────────────────────────
    {
      const iepServices = (analysis.iep_services ?? {}) as Record<string, unknown>;
      const goals = (iepServices.goals ?? []) as Array<Record<string, unknown>>;

      const slide = prs.addSlide();
      addBg(slide, COLORS.bgDeep);
      addGlow(slide);
      addTopBar(slide, COLORS.accentMint);
      addBottomBar(slide, COLORS.accentMint);
      addLeftStripe(slide, COLORS.accentMint);
      addSectionHeader(slide,
        "New Annual Goals",
        "Proposed goals for the upcoming IEP year with objectives and benchmarks",
        COLORS.accentMint);

      if (goals.length > 0) {
        // Up to 4 goals in a 2×2 grid
        const cols = Math.min(2, goals.length);
        const rows = Math.ceil(Math.min(goals.length, 4) / cols);
        const gW = (W - 0.52) / cols;
        const gH = (H - 1.52) / rows;

        goals.slice(0, 4).forEach((goal, gi) => {
          const gc = gi % cols;
          const gr = Math.floor(gi / cols);
          const gx = 0.22 + gc * (gW + 0.08);
          const gy = 1.15 + gr * (gH + 0.06);

          slide.addShape(PptxGenJS.ShapeType.rect, {
            x: gx, y: gy, w: gW, h: gH,
            fill: { color: COLORS.bgCard },
            line: { color: COLORS.accentMint, width: 0.8, transparency: 55 },
            rectRadius: 0.09,
          });

          const area = String(goal.area ?? goal.domain ?? `Goal ${gi + 1}`);
          slide.addText(area, {
            x: gx + 0.1, y: gy + 0.08, w: gW - 0.2, h: 0.26,
            fontSize: 10, bold: true, color: COLORS.accentMint, fontFace: FONT,
          });

          const goalText = String(goal.goal_text ?? goal.text ?? "");
          slide.addText(goalText || "(See IEP document)", {
            x: gx + 0.1, y: gy + 0.36, w: gW - 0.2, h: gH - 0.82,
            fontSize: 9, color: COLORS.white70, fontFace: FONT,
            valign: "top", wrap: true, breakLine: true,
          });

          // 4-component checklist footer
          const hasCondition = !!(goal.condition);
          const hasBehavior = !!(goal.behavior ?? goal.goal_text);
          const hasCriteria = !!(goal.criteria ?? goal.accuracy);
          const hasMethod = !!(goal.monitoring_method ?? goal.progress_monitoring);
          const checks = [
            { label: "Condition", ok: hasCondition },
            { label: "Behavior", ok: hasBehavior },
            { label: "Criteria", ok: hasCriteria },
            { label: "Method", ok: hasMethod },
          ];
          const checkY = gy + gH - 0.28;
          checks.forEach((ch, ci) => {
            slide.addText(`${ch.ok ? "✓" : "○"} ${ch.label}`, {
              x: gx + 0.08 + ci * (gW / 4), y: checkY, w: gW / 4, h: 0.22,
              fontSize: 8, bold: ch.ok,
              color: ch.ok ? COLORS.accentMint : COLORS.white70,
              fontFace: FONT,
            });
          });
        });
      } else {
        addBody(slide, ai.new_goals_overview ?? "(No goals found in IEP documents — see case file)");
      }

      addFooter(slide, studentName);
      addSlideNum(slide, 14);
    }

    // ── Slide 15: Accommodations ──────────────────────────────────────────────
    {
      const iepServices = (analysis.iep_services ?? {}) as Record<string, unknown>;
      const classroomAccomms = (iepServices.classroom_accommodations ?? []) as string[];
      const testingAccomms = (iepServices.testing_accommodations ?? []) as string[];

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

      const halfW = (W - 0.52) / 2;

      if (classroomAccomms.length > 0 || testingAccomms.length > 0) {
        // Left: classroom
        addBulletCard(slide, classroomAccomms.length > 0
          ? classroomAccomms
          : ["See IEP document for classroom accommodations"],
          { x: 0.22, y: 1.12, w: halfW, h: H - 1.4, color: COLORS.accentCyan, bullet: "☐" });
        slide.addText("Classroom Accommodations", {
          x: 0.42, y: 1.14, w: halfW - 0.2, h: 0.26,
          fontSize: 10, bold: true, color: COLORS.accentCyan, fontFace: FONT,
        });
        // Right: testing
        addBulletCard(slide, testingAccomms.length > 0
          ? testingAccomms
          : ["See IEP document for testing accommodations"],
          { x: 0.22 + halfW + 0.08, y: 1.12, w: halfW, h: H - 1.4, color: COLORS.accentMint, bullet: "☐" });
        slide.addText("State / District Testing", {
          x: 0.42 + halfW + 0.08, y: 1.14, w: halfW - 0.2, h: 0.26,
          fontSize: 10, bold: true, color: COLORS.accentMint, fontFace: FONT,
        });
      } else {
        addTwoCol(slide,
          "Classroom Accommodations", ai.accommodations_summary ?? "(See IEP document for full list)",
          "State/District Testing", ai.accommodations_summary ?? "(See IEP document for full list)");
      }

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
    {
      const iepServices = (analysis.iep_services ?? {}) as Record<string, unknown>;
      const sdiServices = (iepServices.sdi_services ?? []) as Array<Record<string, unknown>>;
      const relatedServices = (iepServices.related_services ?? []) as Array<Record<string, unknown>>;
      const lreSetting = String(iepServices.lre_setting ?? "");
      const esy = String(iepServices.esy ?? "");

      const slide = prs.addSlide();
      addBg(slide, COLORS.bgDeep);
      addGlow(slide);
      addTopBar(slide, COLORS.accentAmber);
      addBottomBar(slide, COLORS.accentAmber);
      addLeftStripe(slide, COLORS.accentAmber);
      addSectionHeader(slide,
        "LRE, Academic Placement, AIP & ESY",
        "Least Restrictive Environment determination and supplementary aids",
        COLORS.accentAmber);

      // LRE setting pill
      if (lreSetting) {
        addPill(slide, `LRE: ${lreSetting}`, 0.42, 1.14, COLORS.accentAmber);
      }
      if (esy) {
        addPill(slide, `ESY: ${esy}`, lreSetting ? 0.42 + lreSetting.length * 0.1 + 1.0 : 0.42, 1.14, COLORS.accentCyan);
      }

      const allServices = [
        ...sdiServices.map(s => ({
          type: "SDI",
          name: String(s.service ?? s.name ?? ""),
          mins: String(s.minutes_per_week ?? s.minutes ?? "—"),
          location: String(s.location ?? s.setting ?? "—"),
          provider: String(s.provider ?? "SpEd Teacher"),
        })),
        ...relatedServices.map(s => ({
          type: "Related",
          name: String(s.service ?? s.name ?? ""),
          mins: String(s.minutes_per_week ?? s.minutes ?? "—"),
          location: String(s.location ?? s.setting ?? "—"),
          provider: String(s.provider ?? "—"),
        })),
      ];

      if (allServices.length > 0) {
        const tRows = allServices.slice(0, 12).map(s => [s.type, s.name, s.mins + " min/wk", s.location, s.provider]);
        addTable(slide,
          ["Type", "Service", "Frequency", "Location", "Provider"],
          tRows,
          { x: 0.22, y: lreSetting || esy ? 1.5 : 1.12, w: W - 0.44, h: H - (lreSetting || esy ? 1.82 : 1.45), headerColor: COLORS.accentAmber }
        );
      } else {
        addBody(slide, ai.placement_lre ?? "(No services data extracted — see IEP document)",
          { y: lreSetting || esy ? 1.5 : 1.12, h: H - (lreSetting || esy ? 1.82 : 1.45) });
      }

      addFooter(slide, studentName);
      addSlideNum(slide, 17);
    }

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
