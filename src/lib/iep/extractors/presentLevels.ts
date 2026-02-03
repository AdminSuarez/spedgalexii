import { normalizeText, pickFirst } from "./textClean";

export type PresentLevels = {
  dataSources?: string[];
  evalSummary?: {
    lastFullEvalDate?: string;
    reevaluationInProgress?: boolean;
    reevaluationExpectedConclude?: string;
    impactedAreas?: string[];
    narrative?: string;
  };
  studentInput?: string;
  parentInput?: string;
  disabilityImpact?: string;
  assistiveTechnology?: {
    atNeed?: "yes" | "no" | "unknown";
    selectedStatement?: string;
    explanation?: string;
  };
};

function toMonthYearLoose(s?: string) {
  if (!s) return undefined;
  const m = s.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i
  );
  if (!m) return undefined;
  const monthName = m[1];
  const year = m[2];
  if (!monthName || !year) return undefined;
  const monthMap: Record<string, string> = {
    january: "01",
    february: "02",
    march: "03",
    april: "04",
    may: "05",
    june: "06",
    july: "07",
    august: "08",
    september: "09",
    october: "10",
    november: "11",
    december: "12",
  };
  const month = monthMap[monthName.toLowerCase()];
  if (!month) return undefined;
  return `${year}-${month}`;
}

export function extractPresentLevels(raw: string): PresentLevels {
  const text = normalizeText(raw);

  const dataSourceLabels = [
    "Review of previous IEP, including status update(s)",
    "Evaluation/Reevaluation",
    "District/Statewide assessment(s)",
    "Report Cards/Progress Reports",
    "Other Assessment(s)",
    "Behavior Intervention Plan",
    "General Ed Teacher(s)",
    "SPED Teacher(s)",
    "Student",
    "Psychologist",
    "Parent(s)",
    "Portfolio Contents",
    "Other",
  ];
  const dataSources = dataSourceLabels.filter((lbl) =>
    text.toLowerCase().includes(lbl.toLowerCase())
  );

  const evalNarr = pickFirst(text, [
    /(most recent full evaluation.*?)(?=Summarize the student's input|Summarize student input|Summarize parent input|Disability Impact Statement)/i,
  ]);

  const lastFullEvalDate = pickFirst(text, [
    /most recent full evaluation was completed on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i,
  ]);

  const expectedConclude = pickFirst(text, [
    /expected to conclude in\s+([A-Za-z]+\s+20\d{2})/i,
  ]);

  const impactedAreas: string[] = [];
  if (/\breading comprehension\b/i.test(text)) impactedAreas.push("reading_comprehension");
  if (/\bwritten expression\b/i.test(text)) impactedAreas.push("written_expression");
  if (/\bmath reasoning\b/i.test(text)) impactedAreas.push("math_reasoning");

  const studentInput = pickFirst(text, [
    /Summarize the student's input.*?:\s*(.*?)(?=Summarize parent input|Disability Impact Statement)/i,
  ]);

  const parentInput = pickFirst(text, [
    /Summarize parent input.*?:\s*(.*?)(?=Disability Impact Statement)/i,
  ]);

  const disabilityImpact = pickFirst(text, [
    /Disability Impact Statement.*?:\s*(.*?)(?=Based on the Disability Impact Statement|Assistive Technology Needs|Physical Fitness Assessment|$)/i,
  ]);

  const atNeed: "yes" | "no" | "unknown" =
    /\bAT=Yes\b/i.test(text) ? "yes" : /\bAT=No\b/i.test(text) ? "no" : "unknown";

  const atStatements = [
    "The student will be able to participate in the educational program",
    "The student will NOT be able to participate in the educational program",
    "Additional information is needed to decide whether or not the student requires assistive technology",
  ];
  const selectedStatement = atStatements.find((s) => text.includes(s));

  const reevaluationExpectedConclude = toMonthYearLoose(expectedConclude);
  const evalSummary = {
    ...(lastFullEvalDate ? { lastFullEvalDate } : {}),
    ...(/reevaluation currently in progress/i.test(text)
      ? { reevaluationInProgress: true }
      : {}),
    ...(reevaluationExpectedConclude
      ? { reevaluationExpectedConclude }
      : {}),
    ...(impactedAreas.length ? { impactedAreas } : {}),
    ...(evalNarr ? { narrative: evalNarr } : {}),
  };

  const assistiveTechnology = {
    ...(atNeed ? { atNeed } : {}),
    ...(selectedStatement ? { selectedStatement } : {}),
  };

  return {
    ...(dataSources.length ? { dataSources } : {}),
    ...(Object.keys(evalSummary).length ? { evalSummary } : {}),
    ...(studentInput ? { studentInput } : {}),
    ...(parentInput ? { parentInput } : {}),
    ...(disabilityImpact ? { disabilityImpact } : {}),
    ...(Object.keys(assistiveTechnology).length ? { assistiveTechnology } : {}),
  };
}
