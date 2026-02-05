import type { DeliberationsPayload, ExtractedDoc, CommitteeMember } from "./types";

function time(iso?: string) {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function firstNonEmpty<T>(vals: Array<T | undefined | null>, isOk: (v: T) => boolean): T | undefined {
  for (const v of vals) {
    if (v != null && isOk(v as T)) return v as T;
  }
  return undefined;
}

export function buildDeliberationsPayload(args: {
  meetingDateISO?: string;
  committee?: CommitteeMember[];
  extractedDocs: ExtractedDoc[];
}): DeliberationsPayload {
  const meetingDate = args.meetingDateISO ?? new Date().toISOString();

  const docs = [...args.extractedDocs].sort((a, b) => {
    const byDocDate = time(b.docDate) - time(a.docDate);
    if (byDocDate !== 0) return byDocDate;
    return time(b.extractedAt) - time(a.extractedAt);
  });

  const firstName =
    firstNonEmpty(docs.map((d) => d.student?.firstName), (s) => typeof s === "string" && s.trim().length > 0) ??
    "FIRST NAME";
  const lastName =
    firstNonEmpty(docs.map((d) => d.student?.lastName), (s) => typeof s === "string" && s.trim().length > 0) ??
    "LASTNAME";

  const eligibilityStatement =
    firstNonEmpty(docs.map((d) => d.eligibility?.statement), (s) => typeof s === "string" && s.trim().length > 0) ??
    "a qualifying disability (eligibility statement missing)";

  // helpers for “latest doc that contains this”
  const latestStr = (pick: (d: ExtractedDoc) => string | undefined) =>
    firstNonEmpty(docs.map(pick), (s) => typeof s === "string" && s.trim().length > 0);

  const latestStrArr = (pick: (d: ExtractedDoc) => string[] | undefined) =>
    firstNonEmpty(docs.map(pick), (a) => Array.isArray(a) && a.length > 0);

  const latestSummary = (): { staarSummary?: string; mapSummary?: string } => {
    const staar = firstNonEmpty(docs.map((d) => d.plaafp?.staar), (x) => !!x);
    const map = firstNonEmpty(docs.map((d) => d.plaafp?.map), (x) => !!x);

    const staarSummary =
      staar
        ? [
            staar.year ? `STAAR (${staar.year})` : "STAAR",
            staar.scaledScore ? `Scaled score: ${staar.scaledScore}` : null,
            staar.lexile ? `Lexile: ${staar.lexile}` : null,
            staar.notes ? staar.notes : null,
          ]
            .filter(Boolean)
            .join(" | ")
        : undefined;

    const mapSummary =
      map
        ? [
            "NWEA MAP (RLA)",
            map.priorYear
              ? `Prior year RIT: fall ${map.priorYear.fall ?? "—"}, winter ${map.priorYear.winter ?? "—"}, spring ${
                  map.priorYear.spring ?? "—"
                }`
              : null,
            map.currentYear?.rit ? `Current year RIT: ${map.currentYear.rit}` : null,
          ]
            .filter(Boolean)
            .join(" | ")
        : undefined;

    return { staarSummary, mapSummary };
  };

  const { staarSummary, mapSummary } = latestSummary();

  const committee: CommitteeMember[] =
    args.committee ??
    [
      { role: "Administrator", name: "{ARDCOMMITTEENAME} - Administrator" },
      { role: "GeneralEducationTeacher", name: "{ARDCOMMITTEENAME} - General Education Teacher" },
      { role: "SpecialEducationTeacherCaseManager", name: "{ARDCOMMITTEENAME} - Special Education Teacher/Case Manager" },
      { role: "EducationalDiagnostician", name: "{ARDCOMMITTEENAME} - Educational Diagnostician" },
      { role: "Parent", name: "{ARDCOMMITTEENAME} - Parent [in-person]" },
      { role: "Student", name: `${firstName} ${lastName} - Student` },
    ];

  return {
    meetingDate,
    student: { firstName, lastName },
    eligibilityStatement,
    committee,
    sources: docs.map((d) => ({ id: d.id, docType: d.docType, docDate: d.docDate })),

    mostRecent: {
      fieInitialDate: latestStr((d) => d.fie?.initialDate),
      reedDueDate: latestStr((d) => d.fie?.reedDueDate),
      requestsNewTesting: latestStr((d) => d.fie?.requestsNewTesting),
      evaluationConclusion: latestStr((d) => d.fie?.conclusion) ?? eligibilityStatement,

      plaafpNarrative: latestStr((d) => d.plaafp?.narrative),

      staarSummary,
      mapSummary,

      teacherNeeds: latestStrArr((d) => d.plaafp?.teacherNeeds),
      teacherFeedback: latestStrArr((d) => d.plaafp?.teacherFeedback),

      previousGoal: latestStr((d) => d.goals?.previousGoal),
      progressNotes: latestStr((d) => d.goals?.progressNotes),
      newGoal: latestStr((d) => d.goals?.newGoal),

      gradesPriorYear: latestStr((d) => d.grades?.priorYear),
      gradesCurrentYear: latestStr((d) => d.grades?.currentYear),

      placementEla: latestStr((d) => d.placement?.ela),
      placementOther: latestStr((d) => d.placement?.other),

      accommodationsPrior: latestStrArr((d) => d.accommodations?.priorYear),
      accommodationsCurrent: latestStrArr((d) => d.accommodations?.currentUsed),
      accommodationsNotes: latestStr((d) => d.accommodations?.notes),

      aiPlan: latestStr((d) => d.aiPlan?.notes ?? d.aiPlan?.eligible),
      assistiveTech: latestStr((d) => d.assistiveTech?.notes ?? d.assistiveTech?.needsAdditional),
      esy: latestStr((d) => d.esy?.rationale ?? d.esy?.recommended),
      compServices: latestStr((d) => d.compServices?.rationale ?? d.compServices?.needed),
      transportation: latestStr((d) => d.transportation?.notes ?? d.transportation?.needed),

      transitionEduGoal: latestStr((d) => d.transition?.eduGoal),
      transitionCareerGoal: latestStr((d) => d.transition?.careerGoal),
    },
  };
}
