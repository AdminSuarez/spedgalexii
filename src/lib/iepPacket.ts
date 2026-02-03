export type EvidenceRef = {
  docId: string;
  page?: number;
  snippet?: string;
};

export type CompletionStatus = "missing" | "partial" | "complete";

export type RequiredSectionKey =
  | "district_assessment"
  | "cy_state_assessment"
  | "fy_state_assessment"
  | "staar_alt2"
  | "transition_services"
  | "lre_educational_placement"
  | "esy_determination"
  | "agreement"
  | "pwn"
  | "signatures"
  | "receipt_procedural_safeguards";

export type IepEligibilities = {
  primary?: {
    category?: string;
    evaluationDate?: string;
    eligibilityDate?: string;
    placementDate?: string;
  };
  eligible?: Array<{
    priority?: string;
    category: string;
    evaluationDate?: string;
    eligibilityDate?: string;
    placementDate?: string;
  }>;
  ineligible?: Array<{
    category: string;
    evaluationDate?: string;
    ineligibilityDate?: string;
  }>;
  dismissed?: Array<{
    category: string;
    evaluationDate?: string;
    eligibilityDate?: string;
    placementDate?: string;
    dismissalDate?: string;
  }>;
};

export type PresentLevels = {
  dataSources?: string[];
  evalSummary?: {
    lastFullEvalDate?: string;
    reevaluationInProgress?: boolean;
    reevaluationExpectedConclude?: string;
    identifiedDisabilityText?: string;
    impactedAreas?: string[];
    narrative?: string;
  };
  studentInput?: string;
  parentInput?: string;
  disabilityImpact?: string;
  impactedDomains?: Record<
    | "curriculum_learning"
    | "social_emotional"
    | "independent_functioning"
    | "health_care"
    | "communication",
    "yes" | "no" | "unknown"
  >;
  assistiveTechnology?: {
    atNeed?: "yes" | "no" | "unknown";
    selectedStatement?: string;
    explanation?: string;
  };
  physicalFitness?: {
    required?: "yes" | "no" | "unknown";
    classification?:
      | "unrestricted"
      | "restricted_permanent"
      | "restricted_temporary"
      | "adapted_remedial"
      | "unknown";
    description?: string;
  };
};

export type IepPacketV0 = {
  meta: {
    meetingType?: "ARD" | "REED" | "FIE" | "Other";
    scheduleDate?: string;
    dueDate?: string;
    lastModifiedAt?: string;
    lastModifiedBy?: string;
    sourceSystem?: "Frontline";
  };

  student: {
    studentId?: string;
    name?: string;
    grade?: string;
    campus?: string;
    disabilities?: string[];
    eligibilities?: string[];
  };

  required: Record<
    RequiredSectionKey,
    {
      status: CompletionStatus;
      fields: Record<string, unknown>;
      evidence?: EvidenceRef[];
      notes?: string;
    }
  >;

  eligibilities?: IepEligibilities;

  presentLevels?: PresentLevels;

  goals?: Array<{
    goalText: string;
    components?: {
      timeframe?: string;
      condition?: string;
      behavior?: string;
      criterion?: string;
    };
    baseline?: string;
    measurementMethod?: string;
    evidence?: EvidenceRef[];
  }>;

  accommodations?: Array<{
    type?: string;
    name: string;
    subjects?: string[];
    evidence?: EvidenceRef[];
  }>;

  services?: Array<{
    service?: string;
    minutes?: number;
    frequency?: string;
    setting?: string;
    provider?: string;
    evidence?: EvidenceRef[];
  }>;
};
