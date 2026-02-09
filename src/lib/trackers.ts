// src/lib/trackers.ts
export type TrackerType = "weekly" | "daily" | "trials" | "progress";

export type StudentRef = {
  student_id: string;
  student_first_name?: string;
  student_last_name?: string;
  grade?: string;
  case_manager?: string;
};

export type WeeklyTracker = {
  type: "weekly";
  student: StudentRef;
  week_of: string;
  goals: Array<{
    goal_id?: string;
    goal_text: string;
    mon?: string;
    tue?: string;
    wed?: string;
    thu?: string;
    fri?: string;
  }>;
};

export type DailyTracker = {
  type: "daily";
  student: StudentRef;
  date: string;
  service_type?: string; // e.g., "SpEd Inclusion", "Resource", "Speech", etc.
  required_minutes_per_2wks?: number; // IEP mandated minutes per 2-week cycle
  rows: Array<{
    goal_id?: string;
    goal_text: string;
    advisory?: string; // Advisory period (block schedule)
    period_1?: string; // minutes per class period
    period_2?: string;
    period_3?: string;
    period_4?: string;
    period_5?: string;
    period_6?: string;
    period_7?: string;
    period_8?: string;
    notes?: string;
  }>;
};

export type TrialNoteFlag = "A" | "U" | "M" | "NM";

export type TrialTracker = {
  type: "trials";
  student: StudentRef;
  goal_text: string;
  trials: Array<{
    date?: string;
    score?: number;
    note?: TrialNoteFlag;
  }>;
  notes?: string;
};

export type ProgressTracker = {
  type: "progress";
  student: StudentRef;
  goal_text: string;
  baseline?: string;
  target?: string;
  measurement?: string;
  datapoints: Array<{
    date: string;
    value: string;
    note?: string;
  }>;
};

export type AnyTracker = WeeklyTracker | DailyTracker | TrialTracker | ProgressTracker;

export function blankWeekly(student: StudentRef, week_of: string): WeeklyTracker {
  return {
    type: "weekly",
    student,
    week_of,
    goals: [{ goal_text: "" }, { goal_text: "" }, { goal_text: "" }],
  };
}

export function blankDaily(student: StudentRef, date: string): DailyTracker {
  return {
    type: "daily",
    student,
    date,
    service_type: "",
    required_minutes_per_2wks: 0,
    rows: [{ goal_text: "" }, { goal_text: "" }, { goal_text: "" }],
  };
}

export function blankTrials(student: StudentRef): TrialTracker {
  return {
    type: "trials",
    student,
    goal_text: "",
    trials: Array.from({ length: 12 }).map(() => ({})),
    notes: "",
  };
}

export function blankProgress(student: StudentRef): ProgressTracker {
  return {
    type: "progress",
    student,
    goal_text: "",
    baseline: "",
    target: "",
    measurement: "",
    datapoints: [],
  };
}

export function ymd(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
