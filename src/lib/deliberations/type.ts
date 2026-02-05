export type DocType = "IEP" | "FIE" | "REED" | "DYSLEXIA_REPORT" | "PROGRESS_REPORT" | "OTHER";

export type CommitteeMember = {
  role:
    | "Administrator"
    | "GeneralEducationTeacher"
    | "SpecialEducationTeacherCaseManager"
    | "EducationalDiagnostician"
    | "Parent"
    | "Student"
    | "Other";
  name: string;
};

export type ExtractedDoc = {
  id: string;
  docType: DocType;
  docDate: string; // ISO date string (required for “most current” logic)
  extractedAt: string; // ISO
  student?: { firstName?: string; lastName?: string };

  eligibility?: { statement?: string };

  fie?: {
    initialDate?: string;
    reedDueDate?: string;
    conclusion?: string;
    requestsNewTesting?: string; // "Yes/No/Notes"
  };

  plaafp?: {
    narrative?: string;
    staar?: {
      year?: string;
      scaledScore?: string;
      lexile?: string;
      notes?: string;
    };
    map?: {
      priorYear?: { fall?: string; winter?: string; spring?: string };
      currentYear?: { rit?: string };
    };
    teacherNeeds?: string[];
    teacherFeedback?: string[];
    strengths?: string[];
    needs?: string[];
  };

  goals?: {
    previousGoal?: string;
    progressMeasurement?: string;
    progressNotes?: string;
    newGoal?: string;
  };

  grades?: {
    priorYear?: string;
    currentYear?: string;
  };

  placement?: {
    ela?: string;
    other?: string;
    lreAgreementPrompt?: string;
  };

  accommodations?: {
    priorYear?: string[];
    currentUsed?: string[];
    notes?: string;
  };

  aiPlan?: { eligible?: string; notes?: string };

  assistiveTech?: { needsAdditional?: string; notes?: string };

  esy?: { recommended?: string; rationale?: string };

  compServices?: { needed?: string; rationale?: string };

  transportation?: { needed?: string; notes?: string };

  transition?: {
    eduGoal?: string;
    careerGoal?: string;
    studentVoicePrompt?: string;
  };

  assurances?: { text?: string };

  medicaid?: { prompt?: string };

  waitingPeriod?: { prompt?: string };
};

export type DeliberationsPayload = {
  meetingDate: string; // ISO
  student: { firstName: string; lastName: string };
  eligibilityStatement: string;

  committee: CommitteeMember[];

  // Provenance: what docs were considered
  sources: Array<{
    id: string;
    docType: DocType;
    docDate: string;
  }>;

  mostRecent: {
    fieInitialDate?: string;
    reedDueDate?: string;
    requestsNewTesting?: string;
    evaluationConclusion?: string;

    plaafpNarrative?: string;

    staarSummary?: string;
    mapSummary?: string;

    teacherNeeds?: string[];
    teacherFeedback?: string[];

    previousGoal?: string;
    progressNotes?: string;
    newGoal?: string;

    gradesPriorYear?: string;
    gradesCurrentYear?: string;

    placementEla?: string;
    placementOther?: string;

    accommodationsPrior?: string[];
    accommodationsCurrent?: string[];
    accommodationsNotes?: string;

    aiPlan?: string;
    assistiveTech?: string;
    esy?: string;
    compServices?: string;
    transportation?: string;

    transitionEduGoal?: string;
    transitionCareerGoal?: string;
  };
};
