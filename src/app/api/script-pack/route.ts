import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Section = {
  title: string;
  bullets?: string[];
  checkboxes?: string[];
};

type ScriptPackInput = {
  header?: {
    student?: string;
    studentId?: string;
    campus?: string;
    grade?: string;
    caseManager?: string;
    date?: string;
    meetingType?: string;
    time?: string;
    runId?: string;
  };
  sections?: Section[];
};

const TEMPLATE_SECTIONS: Section[] = [
  { title: "PLAAFP (Strengths)", checkboxes: ["Reviewed", "Consensus reached"] },
  { title: "PLAAFP (Growth Areas + Teacher Input + Notes)", checkboxes: ["Reviewed", "Consensus reached"] },
  { title: "GOALS: ELA/R", checkboxes: ["Reviewed", "Updated / Confirmed"] },
  { title: "GOALS: Math", checkboxes: ["Reviewed", "Updated / Confirmed"] },
  { title: "Grades (Prior Year + Current)", checkboxes: ["Reviewed"] },
  { title: "Accommodations (Overview)", checkboxes: ["Reviewed", "Confirmed in paperwork"] },
  { title: "Assistive Technology", checkboxes: ["Committee agrees", "Needs discussion"] },
  { title: "Accelerated Instruction Plan", checkboxes: ["Committee agrees", "Needs discussion"] },
  { title: "Academic Placement", checkboxes: ["Committee agrees", "Needs discussion"] },
  { title: "ESY", checkboxes: ["Committee agrees", "Needs discussion"] },
  { title: "Compensatory Services", checkboxes: ["Committee agrees", "Needs discussion"] },
  { title: "Transportation", checkboxes: ["Reviewed"] },
  { title: "Transition Plan (Education + Career Goal)", checkboxes: ["Reviewed", "Student input captured"] },
  { title: "Consensus", checkboxes: ["Consensus reached"] },
  { title: "Assurances / LRE Assurances", checkboxes: ["Read / Provided"] },
  { title: "Medicaid One-Time Parent Consent", checkboxes: ["Offered", "Signed", "Declined"] },
  { title: "5-Day Waiting Period (Waiver)", checkboxes: ["Waived", "Not waived"] },
  { title: "Signatures / Attendance", checkboxes: ["Collected"] },
];

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function wrapLines(text: string, maxLen: number): string[] {
  const out: string[] = [];
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  for (const w of words) {
    if (!line) {
      line = w;
      continue;
    }
    if ((line + " " + w).length <= maxLen) {
      line = line + " " + w;
    } else {
      out.push(line);
      line = w;
    }
  }
  if (line) out.push(line);
  return out.length ? out : [text];
}

async function buildPdf(input: ScriptPackInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageW = 612; // letter
  const pageH = 792;
  const marginX = 48;
  const marginTop = 56;
  const marginBottom = 56;

  const normalSize = 11;
  const titleSize = 18;
  const h2Size = 13;

  const sections = input.sections && input.sections.length > 0 ? input.sections : TEMPLATE_SECTIONS;

  let page = pdf.addPage([pageW, pageH]);
  let y = pageH - marginTop;

  const newPage = () => {
    page = pdf.addPage([pageW, pageH]);
    y = pageH - marginTop;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < marginBottom) newPage();
  };

  const drawLine = () => {
    ensureSpace(16);
    page.drawLine({
      start: { x: marginX, y: y },
      end: { x: pageW - marginX, y: y },
      thickness: 1,
    });
    y -= 14;
  };

  const drawText = (text: string, size: number, isBold: boolean) => {
    const f = isBold ? bold : font;
    const maxWidth = pageW - marginX * 2;
    const approxCharsPerLine = Math.max(20, Math.floor(maxWidth / (size * 0.55)));
    const lines = wrapLines(text, approxCharsPerLine);

    const lineH = Math.max(14, size + 4);
    ensureSpace(lines.length * lineH);

    for (const ln of lines) {
      page.drawText(ln, { x: marginX, y, size, font: f });
      y -= lineH;
    }
  };

  // Title
  drawText("SpEdGalexii ARD Script Pack", titleSize, true);
  drawText("Print-friendly checklist + script aligned to your meeting order.", normalSize, false);
  drawLine();

  // Header
  const h = input.header ?? {};
  drawText("Meeting Info", h2Size, true);

  const headerLines = [
    `Student: ${safeStr(h.student)}    ID: ${safeStr(h.studentId)}`,
    `Campus: ${safeStr(h.campus)}    Grade: ${safeStr(h.grade)}`,
    `Case Manager: ${safeStr(h.caseManager)}    Date: ${safeStr(h.date)}`,
    `Meeting Type: ${safeStr(h.meetingType)}    Time: ${safeStr(h.time)}`,
    h.runId ? `Run ID: ${safeStr(h.runId)}` : "",
  ].filter((s) => s.trim().length > 0);

  if (headerLines.length === 0) {
    drawText("Student: ____________________    ID: ____________________", normalSize, false);
    drawText("Campus: ____________________     Grade: ______", normalSize, false);
    drawText("Case Manager: ______________      Date: ____________", normalSize, false);
    drawText("Meeting Type: ______________      Time: ____________", normalSize, false);
  } else {
    for (const ln of headerLines) drawText(ln, normalSize, false);
  }

  drawLine();

  for (const [i, s] of sections.entries()) {
    if (!s) continue;

    drawText(`${i + 1}. ${s.title}`, h2Size, true);

    const cbs = s.checkboxes ?? [];
    for (const cb of cbs) drawText(`[ ] ${cb}`, normalSize, false);

    const bullets = s.bullets ?? [];
    for (const b of bullets) drawText(`• ${b}`, normalSize, false);

    drawText("Notes:", normalSize, true);
    drawText("______________________________________________________________", normalSize, false);
    drawText("______________________________________________________________", normalSize, false);

    y -= 6;
    drawLine();
  }

  // Footer timestamp
  drawText(`Generated: ${new Date().toLocaleString()}`, 9, false);

  return await pdf.save();
}

export async function POST(req: Request) {
  let body: ScriptPackInput = {};
  try {
    body = (await req.json()) as ScriptPackInput;
  } catch {
    // allow empty POST
  }

  const bytes = await buildPdf(body);
  const responseBody = Buffer.from(bytes);
  return new NextResponse(responseBody, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="SpEdGalexii_ARD_Script_Pack.pdf"',
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request) {
  // Optional support: /api/script-pack?runId=...
  const url = new URL(req.url);
  const runId = url.searchParams.get("runId") ?? "";
  const bytes = await buildPdf({ header: runId ? { runId } : undefined });
  const responseBody = Buffer.from(bytes);
  return new NextResponse(responseBody, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="SpEdGalexii_ARD_Script_Pack.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
