"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { UploadCard } from "@/components/galaxy/UploadCard";

type YesNoUnknown = "yes" | "no" | "unknown";
type Severity = "info" | "warn" | "fail";

type PlaafpPacket = {
  meta: {
    createdAtIso: string;
  };
  eligibilities: {
    primary?: {
      category?: string;
      evaluationDate?: string;
    };
  };
  presentLevelsMain: {
    dataSources?: string[];
    evalSummary?: {
      lastFullEvalDate?: string;
      reevaluationInProgress?: boolean;
      reevaluationExpectedConclude?: string; // YYYY-MM
      impactedAreas?: string[];
      narrative?: string;
    };
    studentInput?: string;
    parentInput?: string;
    disabilityImpact?: string;
    assistiveTechnology?: {
      atNeed?: YesNoUnknown;
      selectedStatement?: string;
      explanation?: string;
    };
  };
  domains: {
    curriculumLearning?: DomainPLAAFP;
    socialEmotional?: SocialEmotionalPLAAFP;
    independentFunctioning?: DomainPLAAFP;
    communication?: DomainPLAAFP;
    healthCare?: HealthCarePLAAFP;
  };
};

type DomainPLAAFP = {
  impact?: YesNoUnknown;
  strengths?: string;
  needs?: string;
  penNone?: boolean;
  priorityEducationNeeds?: string[];
  accommodationsMentioned?: string[];
};

type SocialEmotionalPLAAFP = DomainPLAAFP & {
  behaviorInterventionPlanRequired?: YesNoUnknown;
};

type HealthCarePLAAFP = {
  hasHealthConditionOrMeds?: YesNoUnknown;
  nurseRequiredStop?: boolean;
  healthConditionsSelected?: string[];
  additionalInformation?: string;
  penNone?: boolean;
  priorityEducationNeeds?: string[];
};

type ChecklistItem = {
  key: string;
  label: string;
  status: "missing" | "partial" | "complete";
  severity: Severity;
  hint?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Header() {
  return (
    <div className="mb-10">
      <div className="heroBrandRow">
        <div className="heroIconWrap">
          <img
            src="/brand/galexii-logo-round.png"
            alt="SpEdGalexii"
            width={140}
            height={140}
            className="heroIcon rounded-full bg-black"
          />
        </div>

        <div className="min-w-0 heroAura">
          <h1 className="heroTitle wrap-break-word">
            PLAAFP Galexii
          </h1>

          <div className="cardMeta mt-3 text-white/70">
            Story Station — Where data becomes narrative
          </div>
        </div>
      </div>

      <p className="cardBody mt-5 max-w-5xl text-white/85">
        The <span className="text-white/95 font-semibold">PLAAFP Galexii</span> extracts 
        Present Levels of Academic Achievement and Functional Performance from IEP PDFs, 
        then audits them for completeness, data sources, and TEA compliance.
      </p>

      <p className="cardBody mt-3 max-w-4xl text-cyan-300/80 italic">
        "Present levels are the foundation. Every goal, service, and accommodation flows from here."
      </p>
    </div>
  );
}

function normalizeText(input: string) {
  return (input || "")
    .replace(/\u00a0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function pickFirst(text: string, patterns: RegExp[]) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return undefined;
}

function toIsoLoose(d?: string) {
  if (!d) return undefined;
  const m = d.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (!m) return undefined;

  const mm = m[1];
  const dd = m[2];
  const yy = m[3];

  // noUncheckedIndexedAccess-safe guard
  if (typeof mm !== "string" || typeof dd !== "string" || typeof yy !== "string") return undefined;

  const year = yy.length === 2 ? `20${yy}` : yy;
  const month = mm.padStart(2, "0");
  const day = dd.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthYearLoose(s?: string) {
  if (!s) return undefined;
  const m = s.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i
  );
  if (!m) return undefined;

  const monthName = m[1];
  const year = m[2];

  // noUncheckedIndexedAccess-safe guard
  if (typeof monthName !== "string" || typeof year !== "string") return undefined;

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

function uniq(arr: string[]) {
  return Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
}

function parseYesNoLoose(text: string, anchor: RegExp): YesNoUnknown {
  const t = normalizeText(text);
  const m = t.match(anchor);
  const idx = m?.index;
  if (idx === undefined) return "unknown";

  const win = t.slice(Math.max(0, idx - 40), Math.min(t.length, idx + 260));

  // Only trust if export includes explicit markers (checked/selected)
  const yesMarked = /\bYes\b.*(\u2713|☑|selected|checked)/i.test(win);
  const noMarked = /\bNo\b.*(\u2713|☑|selected|checked)/i.test(win);

  if (yesMarked && !noMarked) return "yes";
  if (noMarked && !yesMarked) return "no";
  return "unknown";
}

function parsePEN(raw: string) {
  const text = normalizeText(raw);

  const penNone = /Priority Education Need \(PEN\).*?No items to display/i.test(text);
  if (penNone) return { penNone: true, pens: [] as string[] };

  const penChunk =
    pickFirst(text, [
      /\bPriority Education Need \(PEN\)\s*(.*?)(?=Created by|Updated by|Present Levels|Saved|$)/i,
    ]) ?? "";

  const candidates = penChunk
    .split(/\n|•| {2,}/g)
    .map((s) => s.trim())
    .filter((s) => s && s.length <= 90)
    .filter(
      (s) =>
        !/Every Priority Education Need/i.test(s) &&
        !/^Priority Education Need/i.test(s) &&
        !/^Goalbook$/i.test(s) &&
        !/^Present Levels/i.test(s) &&
        !/^Saved$/i.test(s)
    );

  // Guardrail: if it looks like the full option-bank dump, do not treat as selected
  if (candidates.length > 25 || penChunk.length > 1200) {
    return { penNone: false, pens: [] as string[] };
  }

  return { penNone: false, pens: uniq(candidates) };
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseStrengthsNeeds(raw: string, strengthsLabel: string, needsLabel: string) {
  const text = normalizeText(raw);
  const strengths =
    pickFirst(text, [
      new RegExp(`${escapeReg(strengthsLabel)}\\s*(.*?)(?=${escapeReg(needsLabel)})`, "i"),
    ]) ?? undefined;

  const needs =
    pickFirst(text, [
      new RegExp(
        `${escapeReg(needsLabel)}\\s*(.*?)(?=Goalbook|Priority Education Need|PEN|Created by|Updated by|Saved|$)`,
        "i"
      ),
    ]) ?? undefined;

  return { strengths: strengths?.trim(), needs: needs?.trim() };
}

function extractEligibilities(raw: string) {
  const text = normalizeText(raw);

  const row =
    text.match(/\bIEP\s+Primary\s+(.+?)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\b/i) ||
    text.match(/\bIEP\s+Primary\s+(.+?)\b/i);

  const category = row?.[1]?.trim();
  const evaluationDate = toIsoLoose(row?.[2]);

  const primary =
    category || evaluationDate
      ? {
          ...(category ? { category } : {}),
          ...(evaluationDate ? { evaluationDate } : {}),
        }
      : undefined;

  return {
    ...(primary ? { primary } : {}),
  };
}

function extractPresentLevelsMain(raw: string) {
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

  const evalNarr =
    pickFirst(text, [
      /(most recent full evaluation.*?)(?=Summarize the student's input|Summarize student input|Summarize parent input|Disability Impact Statement|Student strengths|Student needs|$)/i,
    ]) ?? undefined;

  const lastFullEvalDate =
    pickFirst(text, [
      /most recent full evaluation was completed on\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/i,
    ]) ?? undefined;

  const expectedConclude =
    pickFirst(text, [/expected to conclude in\s+([A-Za-z]+\s+20\d{2})/i]) ?? undefined;

  const impactedAreas: string[] = [];
  if (/\breading comprehension\b/i.test(text)) impactedAreas.push("reading_comprehension");
  if (/\bwritten expression\b/i.test(text)) impactedAreas.push("written_expression");
  if (/\bmath reasoning\b/i.test(text)) impactedAreas.push("math_reasoning");

  const studentInput =
    pickFirst(text, [
      /Summarize the student's input.*?:\s*(.*?)(?=Summarize parent input|Disability Impact Statement|$)/i,
    ]) ?? undefined;

  const parentInput =
    pickFirst(text, [/Summarize parent input.*?:\s*(.*?)(?=Disability Impact Statement|$)/i]) ??
    undefined;

  const disabilityImpact =
    pickFirst(text, [
      /Disability Impact Statement.*?:\s*(.*?)(?=Based on the Disability Impact Statement|Assistive Technology Needs|Physical Fitness Assessment|Student strengths|$)/i,
    ]) ?? undefined;

  const atNeed: YesNoUnknown =
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
    ...(reevaluationExpectedConclude ? { reevaluationExpectedConclude } : {}),
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

function extractCurriculumLearning(raw: string): DomainPLAAFP {
  const text = normalizeText(raw);

  const impact = parseYesNoLoose(
    text,
    /Does the student's disability impact.*Curriculum and Learning Environment\?/i
  );

  const { strengths, needs } = parseStrengthsNeeds(
    text,
    "Student strengths in the area of Curriculum and Learning:",
    "Student needs in the area of Curriculum and Learning:"
  );

  const pen = parsePEN(text);

  const accHits: string[] = [];
  const needsLower = (needs ?? "").toLowerCase();
  const knownAcc = [
    "oral administration",
    "graphic organizer",
    "graphic organizers",
    "extended time",
    "small group",
    "frequent comprehension checks",
    "visual aids",
    "scaffolded instruction",
    "one-on-one",
    "check-ins",
    "chunking",
    "scribe",
    "speech-to-text",
    "typing",
  ];
  for (const k of knownAcc) if (needsLower.includes(k)) accHits.push(k);

  return {
    impact,
    ...(strengths ? { strengths } : {}),
    ...(needs ? { needs } : {}),
    ...(pen.penNone ? { penNone: true } : {}),
    ...(pen.pens.length ? { priorityEducationNeeds: pen.pens } : {}),
    ...(accHits.length ? { accommodationsMentioned: uniq(accHits) } : {}),
  };
}

function extractSocialEmotional(raw: string): SocialEmotionalPLAAFP {
  const text = normalizeText(raw);

  const impact = parseYesNoLoose(
    text,
    /Does the student's disability impact.*Social or\s*Emotional Behavior\?/i
  );

  const { strengths, needs } = parseStrengthsNeeds(
    text,
    "Student strengths in Social or Emotional Behavior:",
    "Student needs in Social or Emotional Behavior:"
  );

  const pen = parsePEN(text);

  const bip = parseYesNoLoose(text, /Does the student require a Behavior Intervention Plan\?/i);

  return {
    impact,
    ...(strengths ? { strengths } : {}),
    ...(needs ? { needs } : {}),
    ...(pen.penNone ? { penNone: true } : {}),
    ...(pen.pens.length ? { priorityEducationNeeds: pen.pens } : {}),
    behaviorInterventionPlanRequired: bip,
  };
}

function extractIndependentFunctioning(raw: string): DomainPLAAFP {
  const text = normalizeText(raw);

  const impact = parseYesNoLoose(
    text,
    /Does the student's disability impact.*Independent Functioning\?/i
  );

  const { strengths, needs } = parseStrengthsNeeds(
    text,
    "Student strengths in the area of Independent Functioning:",
    "Student needs in the area of Independent Functioning:"
  );

  const pen = parsePEN(text);

  return {
    impact,
    ...(strengths ? { strengths } : {}),
    ...(needs ? { needs } : {}),
    ...(pen.penNone ? { penNone: true } : {}),
    ...(pen.pens.length ? { priorityEducationNeeds: pen.pens } : {}),
  };
}

function extractCommunication(raw: string): DomainPLAAFP {
  const text = normalizeText(raw);

  const impact = parseYesNoLoose(text, /Does the student's disability impact.*Communications?\?/i);

  const { strengths, needs } = parseStrengthsNeeds(
    text,
    "Student strengths in the area of Communication:",
    "Student needs in the area of Communication:"
  );

  const pen = parsePEN(text);

  return {
    impact,
    ...(strengths ? { strengths } : {}),
    ...(needs ? { needs } : {}),
    ...(pen.penNone ? { penNone: true } : {}),
    ...(pen.pens.length ? { priorityEducationNeeds: pen.pens } : {}),
  };
}

function extractHealthCare(raw: string): HealthCarePLAAFP {
  const text = normalizeText(raw);

  const hasHealthConditionOrMeds = parseYesNoLoose(
    text,
    /Does the student have a health condition\/impairment\/diagnosis.*require medication\/health service\?/i
  );

  const nurseRequiredStop = hasHealthConditionOrMeds === "yes";

  const additionalInformation =
    pickFirst(text, [
      /\bAdditional Information\s*(.*?)(?=Goalbook|Priority Education Need|PEN|Created by|Updated by|Saved|$)/i,
    ]) ?? undefined;

  // Only treat diagnoses as selected if the chunk is short. If it is the big option bank, ignore.
  const diagChunk =
    pickFirst(text, [
      /\bHealth Condition\/Diagnosis\s*(.*?)(?=Additional Information|Goalbook|Priority Education Need|PEN|Created by|Updated by|Saved|$)/i,
    ]) ?? "";
  const diagCandidates = diagChunk
    .split(/\n|•| {2,}/g)
    .map((s) => s.trim())
    .filter((s) => s && s.length <= 60)
    .filter((s) => !/^Health Condition\/Diagnosis$/i.test(s));

  const healthConditionsSelected =
    diagCandidates.length > 0 && diagCandidates.length <= 18 && diagChunk.length <= 900
      ? uniq(diagCandidates)
      : undefined;

  const pen = parsePEN(text);

  return {
    hasHealthConditionOrMeds,
    nurseRequiredStop,
    ...(healthConditionsSelected ? { healthConditionsSelected } : {}),
    ...(additionalInformation?.trim()
      ? { additionalInformation: additionalInformation.trim() }
      : {}),
    ...(pen.penNone ? { penNone: true } : {}),
    ...(pen.pens.length ? { priorityEducationNeeds: pen.pens } : {}),
  };
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const cls =
    severity === "fail"
      ? "border-rose-300/25 bg-rose-400/10 text-rose-100"
      : severity === "warn"
      ? "border-amber-300/25 bg-amber-400/10 text-amber-100"
      : "border-sky-300/25 bg-sky-400/10 text-sky-100";

  const label = severity === "fail" ? "Fix" : severity === "warn" ? "Flag" : "Note";

  return (
    <span
      className={cx("inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold", cls)}
    >
      {label}
    </span>
  );
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

type TabKey =
  | "main"
  | "elig"
  | "curric"
  | "soc"
  | "ind"
  | "health"
  | "comm"
  | "output";

const TAB_LABEL: Record<TabKey, string> = {
  main: "Present Levels (Main)",
  elig: "Eligibilities",
  curric: "Curriculum & Learning",
  soc: "Social/Emotional",
  ind: "Independent Functioning",
  health: "Health Care",
  comm: "Communication",
  output: "Output",
};

export default function Page() {
  const router = useRouter();

  const [tab, setTab] = useState<TabKey>("main");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const [mainText, setMainText] = useState("");
  const [eligText, setEligText] = useState("");
  const [curricText, setCurricText] = useState("");
  const [socialText, setSocialText] = useState("");
  const [indText, setIndText] = useState("");
  const [healthText, setHealthText] = useState("");
  const [commText, setCommText] = useState("");

  function notify(msg: string) {
    setToast(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1600);
  }

  const packet = useMemo<PlaafpPacket>(() => {
    const createdAtIso = new Date().toISOString();

    // exactOptionalPropertyTypes-safe: omit keys when not present
    const domains: PlaafpPacket["domains"] = {
      ...(curricText.trim()
        ? { curriculumLearning: extractCurriculumLearning(curricText) }
        : {}),
      ...(socialText.trim()
        ? { socialEmotional: extractSocialEmotional(socialText) }
        : {}),
      ...(indText.trim()
        ? { independentFunctioning: extractIndependentFunctioning(indText) }
        : {}),
      ...(healthText.trim()
        ? { healthCare: extractHealthCare(healthText) }
        : {}),
      ...(commText.trim()
        ? { communication: extractCommunication(commText) }
        : {}),
    };

    return {
      meta: { createdAtIso },
      eligibilities: extractEligibilities(eligText),
      presentLevelsMain: extractPresentLevelsMain(mainText),
      domains,
    };
  }, [mainText, eligText, curricText, socialText, indText, healthText, commText]);

  const checklist = useMemo<ChecklistItem[]>(() => {
    const items: ChecklistItem[] = [];

    const hasImpact = !!packet.presentLevelsMain.disabilityImpact?.trim();
    const hasStudent = !!packet.presentLevelsMain.studentInput?.trim();
    const hasParent = !!packet.presentLevelsMain.parentInput?.trim();
    const hasEval = !!packet.presentLevelsMain.evalSummary?.narrative?.trim();

    items.push({
      key: "main_eval",
      label: "Evaluation summary present",
      status: hasEval
        ? "complete"
        : packet.presentLevelsMain.dataSources?.length
        ? "partial"
        : "missing",
      severity: hasEval ? "info" : "warn",
      ...(hasEval ? {} : { hint: "Paste the Evaluation/Reevaluation narrative paragraph." }),
    });

    items.push({
      key: "main_impact",
      label: "Disability impact statement",
      status: hasImpact ? "complete" : "missing",
      severity: hasImpact ? "info" : "fail",
      ...(hasImpact ? {} : { hint: "Required: explain how disability impacts progress in gen ed." }),
    });

    items.push({
      key: "main_student",
      label: "Student input",
      status: hasStudent ? "complete" : "missing",
      severity: hasStudent ? "info" : "warn",
      ...(hasStudent ? {} : { hint: "Recommended: interests + strengths + needs." }),
    });

    items.push({
      key: "main_parent",
      label: "Parent input",
      status: hasParent ? "complete" : "missing",
      severity: hasParent ? "info" : "warn",
      ...(hasParent ? {} : { hint: "Recommended: parent concerns + goals for student." }),
    });

    const hasElig = !!packet.eligibilities.primary?.category;
    items.push({
      key: "elig_primary",
      label: "Primary eligibility captured",
      status: hasElig ? "complete" : "missing",
      severity: hasElig ? "info" : "warn",
      ...(hasElig ? {} : { hint: "Paste Eligibilities/Impairments grid text." }),
    });

    const domainRules = [
      { key: "curric", label: "Curriculum & Learning", d: packet.domains.curriculumLearning },
      { key: "soc", label: "Social/Emotional", d: packet.domains.socialEmotional },
      { key: "ind", label: "Independent Functioning", d: packet.domains.independentFunctioning },
      { key: "comm", label: "Communication", d: packet.domains.communication },
    ] as const;

    for (const r of domainRules) {
      const d = r.d;
      if (!d) {
        items.push({
          key: `domain_${r.key}`,
          label: `${r.label} pasted`,
          status: "missing",
          severity: "info",
          hint: "Optional: paste if used for this student. If not applicable, ignore.",
        });
        continue;
      }

      const hasStrengths = !!d.strengths?.trim();
      const hasNeeds = !!d.needs?.trim();
      const strict = d.impact !== "no";
      const ok = strict ? hasStrengths && hasNeeds : hasStrengths || hasNeeds || d.penNone;

      items.push({
        key: `domain_${r.key}_narr`,
        label: `${r.label} strengths + needs`,
        status: ok ? "complete" : hasStrengths || hasNeeds ? "partial" : "missing",
        severity: ok ? "info" : strict ? "warn" : "info",
        ...(ok
          ? {}
          : {
              hint: "Add both strengths and needs narratives (or mark impact = no in Frontline).",
            }),
      });
    }

    if (packet.domains.healthCare) {
      const hc = packet.domains.healthCare;
      const isYes = hc.hasHealthConditionOrMeds === "yes";
      if (isYes) {
        items.push({
          key: "health_stop",
          label: "Health Care nurse STOP rule",
          status: hc.nurseRequiredStop ? "partial" : "missing",
          severity: "fail",
          hint:
            "If Health = Yes, this section must be completed by or with a school nurse. Reconvene if nurse not present.",
        });
      } else {
        items.push({
          key: "health_gate",
          label: "Health Care gate answered",
          status: hc.hasHealthConditionOrMeds === "unknown" ? "partial" : "complete",
          severity: hc.hasHealthConditionOrMeds === "unknown" ? "warn" : "info",
          ...(hc.hasHealthConditionOrMeds === "unknown"
            ? { hint: "If possible, confirm Yes/No selection." }
            : {}),
        });
      }
    } else {
      items.push({
        key: "health_pasted",
        label: "Health Care pasted",
        status: "missing",
        severity: "info",
        hint: "Optional unless student has a health condition/meds requiring nurse documentation.",
      });
    }

    return items;
  }, [packet]);

  const ardPack = useMemo(() => {
    const pl = packet.presentLevelsMain;
    const dom = packet.domains;

    const lines: string[] = [];

    const elig = packet.eligibilities.primary?.category;
    if (elig) {
      lines.push(
        `Eligibility: ${elig}${
          packet.eligibilities.primary?.evaluationDate
            ? ` (eval ${packet.eligibilities.primary.evaluationDate})`
            : ""
        }`
      );
    }

    if (pl.evalSummary?.impactedAreas?.length) {
      lines.push(
        `Impacted areas noted: ${pl.evalSummary.impactedAreas.join(", ").replace(/_/g, " ")}`
      );
    }

    if (pl.studentInput) lines.push(`Student input: ${pl.studentInput}`);
    if (pl.parentInput) lines.push(`Parent input: ${pl.parentInput}`);
    if (pl.disabilityImpact) lines.push(`Disability impact: ${pl.disabilityImpact}`);

    const curric = dom.curriculumLearning;
    if (curric?.needs) {
      const acc = curric.accommodationsMentioned?.length
        ? ` Supports mentioned: ${curric.accommodationsMentioned.join(", ")}.`
        : "";
      lines.push(`Curriculum/learning needs: ${curric.needs}${acc}`);
    }

    const soc = dom.socialEmotional;
    if (soc?.needs) {
      const bip =
        soc.behaviorInterventionPlanRequired && soc.behaviorInterventionPlanRequired !== "unknown"
          ? ` BIP: ${soc.behaviorInterventionPlanRequired.toUpperCase()}.`
          : "";
      lines.push(`Social/emotional needs: ${soc.needs}${bip}`);
    }

    lines.push(
      "Transition prompts for HS: confirm course demands, writing workload expectations, assistive tech/typing plan, self-advocacy supports, and how accommodations carry over."
    );

    return lines;
  }, [packet]);

  const suggestedGoalFrames = useMemo(() => {
    const frames: Array<{ title: string; goalText: string }> = [];

    frames.push({
      title: "Written Expression (organization + conventions)",
      goalText:
        "By the end of the IEP period, when given a grade-level writing prompt and a teacher-provided graphic organizer (and access to typing or speech-to-text as used in instruction), [Student Name] will plan and compose a multi-paragraph response that includes a clear main idea, supporting details, and correct conventions, earning at least 3 out of 4 on a writing rubric in 4 out of 5 writing samples as measured by teacher rubric scoring and work samples.",
    });

    frames.push({
      title: "Spelling/Editing (targeted skill)",
      goalText:
        "By the end of the IEP period, when provided a draft writing sample and an editing checklist, [Student Name] will correct spelling and grammar errors to improve their writing accuracy to at least 85% across 4 out of 5 editing opportunities as measured by teacher-collected editing probes.",
    });

    const penHints = [
      ...(packet.domains.curriculumLearning?.priorityEducationNeeds ?? []),
      ...(packet.domains.socialEmotional?.priorityEducationNeeds ?? []),
      ...(packet.domains.independentFunctioning?.priorityEducationNeeds ?? []),
      ...(packet.domains.communication?.priorityEducationNeeds ?? []),
    ]
      .join(" ")
      .toLowerCase();

    if (penHints.includes("fluency")) {
      frames.push({
        title: "Reading Fluency (if applicable)",
        goalText:
          "By the end of the IEP period, when given a grade-level passage and repeated reading practice, [Student Name] will read aloud at an average of (target) WCPM with at least 95% accuracy across 3 consecutive weekly probes as measured by curriculum-based measurement.",
      });
    }

    return frames;
  }, [packet]);

  const jsonPretty = useMemo(() => JSON.stringify(packet, null, 2), [packet]);

  function sendGoalToGoals(goalText: string) {
    const url = `/goals?goalText=${encodeURIComponent(goalText)}`;
    router.push(url);
  }

  const tabBtn = (k: TabKey) =>
    cx(
      "rounded-2xl border px-3 py-2 text-sm font-semibold transition",
      tab === k
        ? "border-white/18 bg-white/12 text-white"
        : "border-white/10 bg-black/20 text-white/80 hover:text-white hover:bg-white/8"
    );

  return (
    <GalaxyShell>
      <div className="page w-full">
        <Header />

        {/* ✅ Pipeline Upload Card */}
        <UploadCard module="plaafp" />

        <div className="mt-8 border-t border-white/10 pt-6">
          <div className="text-2xl font-bold text-white/90 mb-4">Manual PLAAFP Extraction</div>
          <div className="text-white/70 mb-4">
            Paste PLAAFP sections from Frontline exports or PDF text. The parser is deterministic and safe by default.
          </div>
        </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7 sidebarTile sidebarTile--violet p-5">
          <div className="cardTitle text-white">Extractor cockpit</div>
          <div className="cardBody mt-2 text-white/80">
            Paste text from Frontline exports or PDF text. The parser is deterministic and safe by default.
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(Object.keys(TAB_LABEL) as TabKey[]).map((k) => (
              <button key={k} type="button" className={tabBtn(k)} onClick={() => setTab(k)}>
                {TAB_LABEL[k]}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === "main" ? (
              <div>
                <div className="uiLabel text-white/70">Present Levels (main section)</div>
                <textarea
                  className="mt-2 w-full min-h-[260px] rounded-2xl border border-white/10 bg-black/30 p-3 text-white/90 outline-none focus:border-white/20"
                  value={mainText}
                  onChange={(e) => setMainText(e.target.value)}
                  placeholder="Paste the main Present Levels page text here..."
                />
              </div>
            ) : null}

            {tab === "elig" ? (
              <div>
                <div className="uiLabel text-white/70">Eligibilities / Impairments</div>
                <textarea
                  className="mt-2 w-full min-h-[220px] rounded-2xl border border-white/10 bg-black/30 p-3 text-white/90 outline-none focus:border-white/20"
                  value={eligText}
                  onChange={(e) => setEligText(e.target.value)}
                  placeholder='Paste Eligibilities grid text (example includes: "IEP Primary Specific Learning Disability 2/23/21")...'
                />
              </div>
            ) : null}

            {tab === "curric" ? (
              <div>
                <div className="uiLabel text-white/70">Curriculum & Learning domain</div>
                <textarea
                  className="mt-2 w-full min-h-[220px] rounded-2xl border border-white/10 bg-black/30 p-3 text-white/90 outline-none focus:border-white/20"
                  value={curricText}
                  onChange={(e) => setCurricText(e.target.value)}
                  placeholder="Paste Curriculum & Learning strengths/needs + PEN area..."
                />
              </div>
            ) : null}

            {tab === "soc" ? (
              <div>
                <div className="uiLabel text-white/70">Social/Emotional domain</div>
                <textarea
                  className="mt-2 w-full min-h-[220px] rounded-2xl border border-white/10 bg-black/30 p-3 text-white/90 outline-none focus:border-white/20"
                  value={socialText}
                  onChange={(e) => setSocialText(e.target.value)}
                  placeholder="Paste Social/Emotional strengths/needs + PEN + (optional) BIP question..."
                />
              </div>
            ) : null}

            {tab === "ind" ? (
              <div>
                <div className="uiLabel text-white/70">Independent Functioning domain</div>
                <textarea
                  className="mt-2 w-full min-h-[220px] rounded-2xl border border-white/10 bg-black/30 p-3 text-white/90 outline-none focus:border-white/20"
                  value={indText}
                  onChange={(e) => setIndText(e.target.value)}
                  placeholder="Paste Independent Functioning strengths/needs + PEN area..."
                />
              </div>
            ) : null}

            {tab === "health" ? (
              <div>
                <div className="uiLabel text-white/70">Health Care domain</div>
                <textarea
                  className="mt-2 w-full min-h-[220px] rounded-2xl border border-white/10 bg-black/30 p-3 text-white/90 outline-none focus:border-white/20"
                  value={healthText}
                  onChange={(e) => setHealthText(e.target.value)}
                  placeholder="Paste Health Care section (Yes/No gate + Additional Info + PEN)..."
                />
              </div>
            ) : null}

            {tab === "comm" ? (
              <div>
                <div className="uiLabel text-white/70">Communication domain</div>
                <textarea
                  className="mt-2 w-full min-h-[220px] rounded-2xl border border-white/10 bg-black/30 p-3 text-white/90 outline-none focus:border-white/20"
                  value={commText}
                  onChange={(e) => setCommText(e.target.value)}
                  placeholder="Paste Communication strengths/needs + PEN area..."
                />
              </div>
            ) : null}

            {tab === "output" ? (
              <div>
                <div className="uiLabel text-white/70">Structured output (JSON)</div>
                <div className="mt-2 rounded-2xl border border-white/10 bg-black/25 p-3">
                  <pre className="text-xs text-white/85 whitespace-pre-wrap">{jsonPretty}</pre>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="ctaBtn ctaBtn--sm ctaBtn--violet"
                    onClick={async () => {
                      const ok = await copyToClipboard(jsonPretty);
                      notify(ok ? "Copied JSON" : "Copy failed");
                    }}
                  >
                    Copy JSON
                  </button>

                  <button
                    className="ctaBtn ctaBtn--sm ctaBtn--electric"
                    onClick={async () => {
                      const pack = ardPack.join("\n\n");
                      const ok = await copyToClipboard(pack);
                      notify(ok ? "Copied ARD Pack" : "Copy failed");
                    }}
                  >
                    Copy ARD Pack
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className="ctaBtn ctaBtn--sm ctaBtn--solar"
              onClick={() => {
                setMainText("");
                setEligText("");
                setCurricText("");
                setSocialText("");
                setIndText("");
                setHealthText("");
                setCommText("");
                notify("Cleared");
              }}
            >
              Clear all
            </button>

            <button className="ctaBtn ctaBtn--sm ctaBtn--electric" onClick={() => setTab("output")}>
              View output
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 sidebarTile sidebarTile--solar p-5">
          <div className="cardTitle text-white">Completion + Meeting Pack</div>
          <div className="cardBody mt-2 text-white/80">
            What’s present, what’s missing, and quick artifacts for your meeting.
          </div>

          {packet.domains.healthCare?.nurseRequiredStop ? (
            <div className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-400/10 p-4 text-rose-100">
              <div className="font-black">STOP: Nurse required</div>
              <div className="mt-2 text-white/80">
                Health Care marked Yes. This section must be completed by or with a school nurse.
              </div>
            </div>
          ) : null}

          <div className="mt-4 gx-card gx-stroke">
            <div className="cardTitle text-white">Checklist</div>
            <div className="mt-3 space-y-2">
              {checklist.map((c) => (
                <div key={c.key} className="rounded-2xl border border-white/10 bg-black/25 p-3 text-white/85">
                  <div className="flex items-start gap-2">
                    <SeverityBadge severity={c.severity} />
                    <div className="min-w-0">
                      <div className="font-semibold text-white">{c.label}</div>
                      <div className="cardMeta mt-1 text-white/70">
                        Status: <span className="font-semibold text-white/85">{c.status.toUpperCase()}</span>
                      </div>
                      {c.hint ? <div className="mt-2 text-white/70">{c.hint}</div> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 gx-card gx-stroke">
            <div className="cardTitle text-white">Quick ARD Pack</div>
            <div className="cardMeta mt-2 text-white/70">Copy these into agenda notes or meeting summary.</div>
            <div className="mt-3 space-y-3">
              {ardPack.map((p, i) => (
                <div key={i} className="rounded-2xl border border-white/10 bg-black/25 p-3 text-white/85 whitespace-pre-wrap">
                  {p}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 gx-card gx-stroke">
            <div className="cardTitle text-white">Goal frames</div>
            <div className="cardBody mt-2 text-white/80">
              Send one to Goals Galexii, then refine baseline + criterion.
            </div>

            <div className="mt-3 space-y-3">
              {suggestedGoalFrames.map((g) => (
                <div key={g.title} className="rounded-2xl border border-white/10 bg-black/25 p-3 text-white/85">
                  <div className="font-black text-white">{g.title}</div>
                  <div className="mt-2 text-white/80 whitespace-pre-wrap">{g.goalText}</div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="ctaBtn ctaBtn--sm ctaBtn--violet"
                      onClick={async () => {
                        const ok = await copyToClipboard(g.goalText);
                        notify(ok ? "Copied" : "Copy failed");
                      }}
                    >
                      Copy
                    </button>
                    <button className="ctaBtn ctaBtn--sm ctaBtn--electric" onClick={() => sendGoalToGoals(g.goalText)}>
                      Send to Goals
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="cardMeta mt-3 text-white/70">
              Next: baseline prompts + measurement match check (WCPM vs % vs x/y).
            </div>
          </div>
        </div>
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/12 bg-black/60 px-4 py-2 text-white shadow-[0_20px_60px_rgba(0,0,0,.55)]">
          {toast}
        </div>
      ) : null}
      </div>
    </GalaxyShell>
  );
}
