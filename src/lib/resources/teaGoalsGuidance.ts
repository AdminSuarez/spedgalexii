export type GuidanceSection = {
  id: string;
  title: string;
  bullets: string[];
};

export const TEA_GOALS_GUIDANCE: GuidanceSection[] = [
  {
    id: "intro-standards-based",
    title: "Standards-based IEP foundation",
    bullets: [
      "An IEP must include measurable annual goals addressing needs resulting from disability so the student can be involved in and make progress in the general education curriculum, plus other disability-related needs.",
      "Progress monitoring must be described: how progress will be measured and when progress reports will be provided to parents/guardians.",
      "Expectations emphasize goals that are measurable, individualized, challenging, and ambitious.",
      "IEP is not the student’s curriculum. It documents services, supports, and specially designed instruction to access and progress in grade-level curriculum.",
      "Focus is closing the gap between present levels (PLAAFP baseline) and expected performance based on grade-level standards.",
      "Endrew F. principle: meaningful progress on challenging, ambitious goals aligned to enrolled grade-level curriculum.",
    ],
  },
  {
    id: "components-tcbc",
    title: "Four critical components of a measurable annual goal",
    bullets: [
      "Timeframe: the period for mastery (often within 12 months, can be expressed in weeks or a date).",
      "Condition: the supports/resources present when measuring progress (must be specific and used every time measurement occurs). Avoid vague conditions like “with accommodations listed.”",
      "Behavior: an observable, measurable action (what the student will do).",
      "Criterion: how much/how often/to what level behavior must occur for mastery (percent, trials, rubric score, time, etc.).",
    ],
  },
  {
    id: "measurable-check",
    title: "Measurable goal quality checks",
    bullets: [
      "Observable and yields the same conclusion if measured by multiple people.",
      "Allows calculation of progress (needs baseline data in PLAAFP using same measurement method).",
      "Includes enough detail to implement consistently across staff/settings.",
      "Can be measured without needing extra unwritten information.",
      "Criterion should reflect growth from baseline, not a generic passing rate for assignments/courses.",
    ],
  },
  {
    id: "plaafp-role",
    title: "PLAAFP is the goal engine",
    bullets: [
      "Goals are developed from PLAAFP baseline data.",
      "PLAAFP should reflect FIE, progress on previous goals, parent/student input, and other data sources.",
      "Measurement method for baseline should match measurement method for the goal to calculate growth accurately.",
    ],
  },
  {
    id: "goal-count",
    title: "How many goals?",
    bullets: [
      "IDEA does not mandate a specific number; must have at least one measurable annual goal.",
      "Number varies by severity and needs; goals address critical needs that prevent access/progress in general curriculum.",
      "Goals are not a full curriculum and not just activities; they target measurable skills/knowledge.",
    ],
  },
  {
    id: "academic-vs-functional",
    title: "Academic vs functional goals",
    bullets: [
      "Academic goals align with enrolled grade-level curriculum standards and focus on progress in that curriculum.",
      "Functional goals are non-academic and support access to the curriculum (behavior, social, related services, organization, AT, etc.).",
      "K–12: goals are typically either academic or functional (not both). PK may blur due to developmental standards.",
      "Related service goals are generally functional; sometimes OT/counseling etc. can be a condition aligned to an academic/functional goal.",
    ],
  },
  {
    id: "progress-reporting",
    title: "Progress reporting expectations",
    bullets: [
      "Progress should be reported in the same format as the goal criterion (e.g., % or x/y trials or rubric score).",
      "Vague progress notes like “progress being made” are not sufficient alone.",
      "Reporting schedule is an ARD decision; can align to report card cycles but is distinct from grades.",
    ],
  },
  {
    id: "objectives-benchmarks",
    title: "Short-term objectives/benchmarks",
    bullets: [
      "Benchmarks are intermediate steps toward the annual goal and include timeframe, condition, behavior, criterion.",
      "Required for students taking STAAR Alternate 2: at least two objectives/benchmarks per annual goal.",
      "Benchmarks cannot be the annual goal mastery criterion by themselves.",
    ],
  },
];
