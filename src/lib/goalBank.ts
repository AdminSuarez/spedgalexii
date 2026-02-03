// src/lib/goalBank.ts
import { FUNCTIONAL_MATH_GOAL_BANK } from "@/lib/goalBank.functionalMath";
import { TRANSITION_GOAL_BANK } from "@/lib/goalBank.transition";
import { FUNCTIONAL_READING_GOAL_BANK } from "@/lib/goalBank.functionalReading";
import { READING_COMPREHENSION_GOAL_BANK } from "@/lib/goalBank.readingComprehension";
import { PHONEMIC_AWARENESS_GOAL_BANK } from "@/lib/goalBank.phonemicAwareness";
import { VOCABULARY_GOAL_BANK } from "@/lib/goalBank.vocabulary";

export type GoalBankCategory =
  | "Foundational Reading"
  | "Vocabulary"
  | "Reading Comprehension"
  | "Math"
  | "Writing"
  | "Behavior"
  | "Social Skills"
  | "Social-Emotional"
  | "Executive Functioning"
  | "Self-Advocacy"
  | "Speech Therapy"
  | "Occupational Therapy";

export type GoalTemplate = {
  id: string;
  category: string;
  subcategory?: string;
  text: string;
  tags: string[];
};

export const GOAL_PLACEHOLDERS = [
  "STUDENT",
  "DATE",
  "NUMBER",
  "TOTAL",
  "PERCENT",
  "PHONICS PATTERN",
  "BLEND OR SEGMENT",
  "PRODUCE OR SEGMENT",
  "CURRENT NUMBER",
  "TARGET NUMBER",
  "SOUND",
  "POSITION",
  "WORDS/PHRASES/SENTENCES",
  "INITIAL/MEDIAL/FINAL",
  "ACTIVITY",
  "TIME",
] as const;

export function extractPlaceholders(template: string): string[] {
  const matches = template.match(/\[([^\]]+)\]/g) ?? [];
  const uniq = new Set(matches.map((m) => m.slice(1, -1).trim()));
  return Array.from(uniq);
}

export const GOAL_BANK: GoalTemplate[] = [
  // ---------------- Foundational Reading ----------------
  {
    id: "fr-01",
    category: "Foundational Reading",
    text: "By [DATE], given a word with [NUMBER] sounds, [STUDENT] will [BLEND OR SEGMENT] the sounds orally to [PRODUCE OR SEGMENT] the word.",
    tags: ["phonological awareness"],
  },
  {
    id: "fr-02",
    category: "Foundational Reading",
    text: "Given [NUMBER] pairs of words, [STUDENT] will identify if they rhyme or not with [PERCENT] accuracy.",
    tags: ["rhyming"],
  },
  {
    id: "fr-03",
    category: "Foundational Reading",
    text: "By [DATE], given a list of [NUMBER] words with [PHONICS PATTERN], [STUDENT] will segment and blend the sounds with [PERCENT] accuracy.",
    tags: ["phonics"],
  },
  {
    id: "fr-04",
    category: "Foundational Reading",
    text: "By [DATE], [STUDENT] will correctly decode [NUMBER] out of [TOTAL] given words with [PHONICS PATTERN].",
    tags: ["decoding"],
  },
  {
    id: "fr-05",
    category: "Foundational Reading",
    text: "[STUDENT] will read [PHONICS PATTERN] correctly in text with [PERCENT] accuracy.",
    tags: ["phonics"],
  },
  {
    id: "fr-06",
    category: "Foundational Reading",
    text: "[STUDENT] will apply decoding strategies to sound out unfamiliar words in [PERCENT] of opportunities.",
    tags: ["decoding strategies"],
  },
  {
    id: "fr-07",
    category: "Foundational Reading",
    text: "Given a grade-level passage, [STUDENT] will read [NUMBER] words per minute with [PERCENT] accuracy by [DATE].",
    tags: ["fluency"],
  },
  {
    id: "fr-08",
    category: "Foundational Reading",
    text: "Given a grade-level passage, [STUDENT] will read with [PERCENT] accuracy by [DATE].",
    tags: ["accuracy"],
  },
  {
    id: "fr-09",
    category: "Foundational Reading",
    text: "By [DATE], [STUDENT] will demonstrate appropriate expression and intonation when reading aloud in [NUMBER] out of [TOTAL] trials.",
    tags: ["prosody"],
  },

  // ---------------- Vocabulary ----------------
  {
    id: "v-01",
    category: "Vocabulary",
    text: "[STUDENT] will increase their sight word vocabulary from [CURRENT NUMBER] to [TARGET NUMBER] by [DATE].",
    tags: ["sight words"],
  },
  {
    id: "v-02",
    category: "Vocabulary",
    text: "[STUDENT] will use context clues to determine the meaning of an unfamiliar word in text with [PERCENT] accuracy.",
    tags: ["context clues"],
  },
  {
    id: "v-03",
    category: "Vocabulary",
    text: "[STUDENT] will apply a vocabulary strategy to define and use an unfamiliar word in [NUMBER] out of [TOTAL] trials.",
    tags: ["vocabulary strategy"],
  },
  {
    id: "v-04",
    category: "Vocabulary",
    text: "By [DATE], [STUDENT] will expand their receptive and expressive vocabulary by learning and correctly using at least 50 new grade-appropriate words in written and oral communication.",
    tags: ["expressive", "receptive"],
  },

  // ---------------- Reading Comprehension ----------------
  {
    id: "rc-01",
    category: "Reading Comprehension",
    text: "When given a story at their reading level, [STUDENT] will use a storyboard or story map to outline the story’s main elements.",
    tags: ["story map"],
  },
  {
    id: "rc-02",
    category: "Reading Comprehension",
    text: "When given a nonfiction text at their reading level, [STUDENT] will select and use the appropriate graphic organizer to identify key information.",
    tags: ["graphic organizer"],
  },
  {
    id: "rc-03",
    category: "Reading Comprehension",
    text: "When given a paragraph at their reading level, [STUDENT] will apply the RAP strategy (Reading a single paragraph, Asking oneself to define the main idea and supporting details, Putting the information into the reader’s language).",
    tags: ["RAP"],
  },
  {
    id: "rc-04",
    category: "Reading Comprehension",
    text: "When given a paragraph at their reading level, [STUDENT] will apply QAR (question-and-answer relationship) strategy to answer questions.",
    tags: ["QAR"],
  },
  {
    id: "rc-05",
    category: "Reading Comprehension",
    text: "When given a passage at their reading level, [STUDENT] will use an outline strategy to summarize the content or retell the story.",
    tags: ["summarize", "retell"],
  },
  {
    id: "rc-06",
    category: "Reading Comprehension",
    text: "When given a text at their reading level, [STUDENT] will read and demonstrate literal knowledge by answering five literal questions.",
    tags: ["literal"],
  },
  {
    id: "rc-07",
    category: "Reading Comprehension",
    text: "[STUDENT] will demonstrate understanding of text using total communication (AAC devices, PECS, verbalization, sign language) to answer five literal questions about the text.",
    tags: ["AAC", "PECS"],
  },
  {
    id: "rc-08",
    category: "Reading Comprehension",
    text: "When given a passage at their reading level, [STUDENT] will use context clues to identify the meaning of unknown words.",
    tags: ["context clues"],
  },
  {
    id: "rc-09",
    category: "Reading Comprehension",
    text: "When given a passage at their instructional level, [STUDENT] will make a prediction and read to confirm or adjust their prediction with information from the text.",
    tags: ["prediction"],
  },
  {
    id: "rc-10",
    category: "Reading Comprehension",
    text: "When given a text at their reading level, [STUDENT] will identify the main idea and two supporting details.",
    tags: ["main idea"],
  },
  {
    id: "rc-11",
    category: "Reading Comprehension",
    text: "When [STUDENT] is given pictures and word cards, they will match 15 new functional vocabulary words with pictures.",
    tags: ["functional vocab"],
  },
  {
    id: "rc-12",
    category: "Reading Comprehension",
    text: "Given a sentence, [STUDENT] will combine background knowledge with information from the text to infer the author’s meaning.",
    tags: ["infer"],
  },
  {
    id: "rc-13",
    category: "Reading Comprehension",
    text: "Given a passage at their reading level, [STUDENT] will answer five inferential questions.",
    tags: ["infer"],
  },
  {
    id: "rc-14",
    category: "Reading Comprehension",
    text: "After reading a passage with visual supports (e.g., highlighting), [STUDENT] will answer literal questions with minimal assistance.",
    tags: ["visual supports"],
  },
  {
    id: "rc-15",
    category: "Reading Comprehension",
    text: "After reading a passage at their reading level, [STUDENT] will identify the author’s purpose for writing.",
    tags: ["author's purpose"],
  },
  {
    id: "rc-16",
    category: "Reading Comprehension",
    text: "Given a list of author’s purposes and a text, [STUDENT] will select the correct author’s purpose for writing.",
    tags: ["author's purpose"],
  },

  // ---------------- Math ----------------
  { id: "m-01", category: "Math", text: "[STUDENT] will identify a one- or two-digit number (verbally, pointing, written).", tags: ["number ID"] },
  { id: "m-02", category: "Math", text: "[STUDENT] will rote-count from 1 to 25 (or higher).", tags: ["counting"] },
  { id: "m-03", category: "Math", text: "[STUDENT] will skip-count by 2, 3, 5, and 10 to 50 (verbal or written).", tags: ["skip count"] },
  { id: "m-04", category: "Math", text: "When given up to 10 objects, [STUDENT] will count and state how many objects there are (verbally, pointing).", tags: ["count objects"] },
  { id: "m-05", category: "Math", text: "Given 10 addition problems, [STUDENT] will independently add single-digit numbers with (or without) regrouping.", tags: ["addition"] },
  { id: "m-06", category: "Math", text: "[STUDENT] will independently subtract a single-digit number from a double-digit number with (or without) regrouping.", tags: ["subtraction"] },
  { id: "m-07", category: "Math", text: "Given 10 subtraction problems, [STUDENT] will independently subtract double-digit numbers from double-digit numbers with (or without) regrouping.", tags: ["subtraction"] },
  { id: "m-08", category: "Math", text: "[STUDENT] will independently tell time to the half hour (or quarter hour, etc.) on an analog clock (verbal or written).", tags: ["time"] },
  { id: "m-09", category: "Math", text: "[STUDENT] will independently identify the next dollar amount when given a price, determine how much is needed to make a purchase, and count out the necessary amount using school money.", tags: ["money"] },
  { id: "m-10", category: "Math", text: "Given a quarter, dime, nickel, and penny, [STUDENT] will identify the coin and value.", tags: ["coins"] },
  { id: "m-11", category: "Math", text: "Given a random amount of coins (all one type or mixed), [STUDENT] will independently count the coins.", tags: ["coins"] },
  { id: "m-12", category: "Math", text: "When given a mix of coins and dollar bills, [STUDENT] will independently count the money.", tags: ["money"] },
  { id: "m-13", category: "Math", text: "When given two-digit (or three- or four-digit) numbers, [STUDENT] will round to the nearest tens (or hundreds or thousands).", tags: ["rounding"] },
  { id: "m-14", category: "Math", text: "Given two numbers (pictures, groups of items), [STUDENT] will determine which number is greater than/less than/equal to by selecting or drawing the appropriate symbol.", tags: ["compare"] },
  { id: "m-15", category: "Math", text: "Given data and a graph (bar, pie), [STUDENT] will complete the graph to display the data.", tags: ["graph"] },
  { id: "m-16", category: "Math", text: "Given a graph (bar, pie, line), [STUDENT] will answer three questions about the data.", tags: ["graph"] },
  { id: "m-17", category: "Math", text: "[STUDENT] will identify the numerator and denominator in a fraction.", tags: ["fractions"] },
  { id: "m-18", category: "Math", text: "When given a picture of a shape divided into parts, [STUDENT] will color the correct number of sections to represent the fraction given.", tags: ["fractions"] },
  { id: "m-19", category: "Math", text: "When given five addition problems with fractions, [STUDENT] will add fractions with like denominators.", tags: ["fractions"] },
  { id: "m-20", category: "Math", text: "[STUDENT] will solve one-step word problems using addition and subtraction (or multiplication and division).", tags: ["word problems"] },
  { id: "m-21", category: "Math", text: "[STUDENT] will independently solve 15 multiplication facts (up to 9).", tags: ["multiplication"] },
  { id: "m-22", category: "Math", text: "Given a fact-fluency tracker, [STUDENT] will track mastery of multiplication facts up to 12.", tags: ["fluency"] },
  { id: "m-23", category: "Math", text: "Given a problem-solving checklist, [STUDENT] will use the checklist to solve a one-step or two-step word problem.", tags: ["checklist"] },

  // ---------------- Writing ----------------
  { id: "w-01", category: "Writing", text: "Given a topic, [STUDENT] will write a sentence that accurately addresses the topic.", tags: ["sentence"] },
  { id: "w-02", category: "Writing", text: "Given a word bank, [STUDENT] will select the appropriate words to complete a sentence or paragraph about a topic.", tags: ["word bank"] },
  { id: "w-03", category: "Writing", text: "[STUDENT] will use a keyword outline to write a paragraph with at least [NUMBER] sentences, including an introduction/topic sentence and conclusion sentence.", tags: ["paragraph"] },
  { id: "w-04", category: "Writing", text: "When given a writing assignment, [STUDENT] will apply an editing checklist (grammar, punctuation, capitalization, full sentences) to review and revise a paragraph.", tags: ["editing"] },
  { id: "w-05", category: "Writing", text: "[STUDENT] will dictate a response and use talk-to-text to communicate at least three sentences about a topic.", tags: ["assistive tech"] },
  { id: "w-06", category: "Writing", text: "[STUDENT] will write a three-paragraph essay including introductory sentence, main idea, supporting details, and conclusion.", tags: ["essay"] },
  { id: "w-07", category: "Writing", text: "[STUDENT] will select and use appropriate graphic organizers to organize ideas in response to a writing topic.", tags: ["graphic organizer"] },
  { id: "w-08", category: "Writing", text: "When given a paragraph to revise, [STUDENT] will edit their writing to organize sentences into paragraphs.", tags: ["organization"] },
  { id: "w-09", category: "Writing", text: "When given a paragraph to revise, [STUDENT] will add transitional words and phrases to connect ideas.", tags: ["transitions"] },
  { id: "w-10", category: "Writing", text: "When given a prompt, [STUDENT] will maintain writing for [TIME] as measured by observation and student writing output.", tags: ["stamina"] },

  // ---------------- Behavior ----------------
  { id: "b-01", category: "Behavior", text: "Given a self-monitoring checklist, [STUDENT] will demonstrate self-regulation during [NUMBER] sessions across [NUMBER] months.", tags: ["self-monitor"] },
  { id: "b-02", category: "Behavior", text: "Given a task and verbal/written/picture instructions, [STUDENT] will begin the task within [NUMBER] minutes.", tags: ["initiation"] },
  { id: "b-03", category: "Behavior", text: "Given a token board, [STUDENT] will follow class rules to earn [NUMBER] tokens for each 30-minute period.", tags: ["token"] },
  { id: "b-04", category: "Behavior", text: "Given a self-regulation strategy (e.g., zones of regulation), [STUDENT] will identify escalation and apply a strategy to maintain regulation.", tags: ["zones"] },
  { id: "b-05", category: "Behavior", text: "Given support and a visual model, [STUDENT] will implement an organizational system for locker/desk/backpack/binder.", tags: ["organization"] },
  { id: "b-06", category: "Behavior", text: "Given a multistep assignment, [STUDENT] will break the task into parts and organize steps, materials, and time frame.", tags: ["task analysis"] },
  { id: "b-07", category: "Behavior", text: "Given scripts and reminders, [STUDENT] will manage frustration and disruptions to routine during classroom activities.", tags: ["coping"] },
  { id: "b-08", category: "Behavior", text: "Given a social story, [STUDENT] will adjust to new routines and procedures in the classroom.", tags: ["social story"] },
  { id: "b-09", category: "Behavior", text: "By the end of the IEP, [STUDENT] will manage conflicts independent of teacher support four out of five occurrences over a [TIME] period.", tags: ["conflict"] },
  { id: "b-10", category: "Behavior", text: "Given a work assignment, [STUDENT] will initiate work tasks as measured by observation and work completion.", tags: ["initiation"] },
  { id: "b-11", category: "Behavior", text: "Given a work assignment, [STUDENT] will complete work tasks as measured by observation and work completion.", tags: ["completion"] },
  { id: "b-12", category: "Behavior", text: "Given a token board and visual rules, [STUDENT] will follow rules and earn tokens throughout the total school environment.", tags: ["generalization"] },

  // For brevity, you can keep adding the remaining categories the same way.
  // If you want, paste the rest of your goal bank text and I’ll convert
  // it into the remaining GOAL_BANK entries in one shot.
  ...FUNCTIONAL_MATH_GOAL_BANK,
  ...TRANSITION_GOAL_BANK,
  ...FUNCTIONAL_READING_GOAL_BANK,
  ...READING_COMPREHENSION_GOAL_BANK,
  ...PHONEMIC_AWARENESS_GOAL_BANK,
  ...VOCABULARY_GOAL_BANK,
];
