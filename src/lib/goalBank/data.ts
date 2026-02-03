import type { GoalTemplate } from "./types";

export const GOAL_TEMPLATES: GoalTemplate[] = [
  // ---- From your structured table (Executive Functioning style) ----
  {
    id: "ef-attn-001",
    source: "Executive Functioning Bank",
    skillArea: "Attentional Control",
    domain: "Social",
    subdomain: "Speaking and Listening",
    text:
      "By the end of the IEP period, when engaged in conversation with a peer or adult, [Student Name] will make eye contact, ask relevant questions, and wait for turn-taking cues, demonstrating all three behaviors with 100% accuracy in 4 out of 5 observed conversations in natural school settings as measured by teacher and student observation.",
    tags: ["executive-functioning"],
  },
  {
    id: "ef-attn-002",
    source: "Executive Functioning Bank",
    skillArea: "Attentional Control",
    domain: "Social",
    subdomain: "Speaking and Listening",
    text:
      "By the end of the IEP period, during small-group discussions, [Student Name] will follow at least two verbal cues with 85% consistency over the academic quarter as measured by teacher observation.",
    tags: ["executive-functioning"],
  },
  {
    id: "ef-org-001",
    source: "Executive Functioning Bank",
    skillArea: "Organization",
    domain: "Adaptive",
    text:
      "By the end of the IEP period, when provided a written planner, [Student Name] will record and reference assignments independently with 100% consistency across all classes as measured by teacher logs.",
    tags: ["executive-functioning"],
  },
  {
    id: "ef-time-001",
    source: "Executive Functioning Bank",
    skillArea: "Time Management",
    domain: "Adaptive",
    text:
      "By the end of the IEP period, when provided assigned tasks and time limits, [Student Name] will complete tasks within the allotted time in 80% of opportunities (4 out of 5) as measured by teacher records.",
    tags: ["executive-functioning"],
  },
  {
    id: "ef-wm-001",
    source: "Executive Functioning Bank",
    skillArea: "Working Memory",
    domain: "Math",
    subdomain: "Operations and Algebraic Thinking",
    text:
      "By the end of the IEP period, when presented with two- and three-step math word problems, [Student Name] will complete each step without additional prompts with 90% accuracy in 4 of 5 classroom opportunities as measured by teacher data.",
    tags: ["executive-functioning"],
  },

  // ---- A few templated Goal Bank items (easy to expand) ----
  {
    id: "bank-read-phon-001",
    source: "Foundational Reading Skills Bank",
    skillArea: "Foundational Reading",
    domain: "ELA",
    subdomain: "Phonological Awareness",
    text:
      "By [DATE], given a word with [NUMBER] sounds, [STUDENT] will [BLEND OR SEGMENT] the sounds orally to [PRODUCE OR SEGMENT] the word.",
    tags: ["template", "foundational-reading"],
  },
  {
    id: "bank-vocab-001",
    source: "Vocabulary Bank",
    skillArea: "Vocabulary",
    domain: "ELA",
    subdomain: "Word Knowledge",
    text:
      "[STUDENT] will use context clues to determine the meaning of an unfamiliar word in text with [PERCENT] accuracy.",
    tags: ["template", "vocabulary"],
  },
  {
    id: "bank-math-001",
    source: "Math Bank",
    skillArea: "Math",
    domain: "Math",
    subdomain: "Number Sense",
    text:
      "Given 10 addition problems, [STUDENT] will independently add single-digit numbers with (or without) regrouping.",
    tags: ["template", "math"],
  },
];
