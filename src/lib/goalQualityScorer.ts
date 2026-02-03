export type GoalComponent = {
  timeframe?: string;
  condition?: string;
  behavior?: string;
  criterion?: string;
};

export type Baseline = {
  exists: boolean;
  metric?: string;
  value?: string;
  methodMatch: boolean;
  notes?: string;
};

export type GoalScoreFlag = {
  code:
    | "missing_timeframe"
    | "missing_condition"
    | "missing_behavior"
    | "missing_criterion"
    | "vague_condition"
    | "criterion_is_passing_rate"
    | "baseline_missing"
    | "baseline_method_mismatch"
    | "progress_measure_mismatch"
    | "not_repeatable"
    | "plaaafp_alignment_risk"
    | "criterion_range_ambiguous";
  severity: "info" | "warn" | "fail";
  message: string;
  fixHint?: string;
};

export type ScoredGoal = {
  id: string;
  area: string;
  type: "academic" | "functional";
  duration?: { start?: string; end?: string };
  components: GoalComponent;
  baseline: Baseline;
  progress: { frequency?: string; procedures?: string[] };
  score: number;
  flags: GoalScoreFlag[];
  suggestedRewrite?: string;
};

export function extractGoalComponents(goalText: string): GoalComponent {
  const text = goalText.replace(/\s+/g, " ").trim();

  const timeframeMatch =
    text.match(/^(By the end of[^,]*|Within[^,]*|By\s+\d{1,2}\/\d{1,2}\/\d{4})/i) ??
    null;

  const conditionMatch =
    text.match(
      /(when\s+[^,]*|given\s+[^,]*)(?=,\s*[A-Z][a-z]+|\s+[A-Z][a-z]+\s+will)/i
    ) ?? null;

  const behaviorMatch = text.match(
    /\bwill\b\s+(.+?)(?=,?\s+for\s+\d|\s+with\s+\d|,?\s+on\s+\d)/i
  );

  const critMatch = text.match(/(\d+\s*out of\s*\d+|\d+%|\bWCPM\b.+?)(.*)$/i);

  const timeframe = timeframeMatch?.[0];
  const condition = conditionMatch?.[0];
  const behaviorText = behaviorMatch?.[1]?.trim();
  const behavior = behaviorText ? `will ${behaviorText}` : undefined;
  const criterion = critMatch?.[0];

  return {
    ...(timeframe ? { timeframe } : {}),
    ...(condition ? { condition } : {}),
    ...(behavior ? { behavior } : {}),
    ...(criterion ? { criterion } : {}),
  };
}

function detectMetricTokens(text: string) {
  const tokens = new Set<string>();
  const lowered = text.toLowerCase();

  if (lowered.includes("wcpm")) tokens.add("wcpm");
  if (lowered.includes("%")) tokens.add("percent");
  if (/\b\d+\s*out of\s*\d+/i.test(lowered)) tokens.add("out-of");
  if (/(rubric|score|rating)/i.test(lowered)) tokens.add("rubric");
  if (/(trials?|attempts?)/i.test(lowered)) tokens.add("trials");

  return tokens;
}

function pickBaselineMetric(baselineText?: string) {
  if (!baselineText) return undefined;
  if (/\bwcpm\b/i.test(baselineText)) return "WCPM";
  if (/%/.test(baselineText)) return "% accuracy";
  if (/\b\d+\s*out of\s*\d+/i.test(baselineText)) return "x/y trials";
  if (/(rubric|rating|scale)/i.test(baselineText)) return "rubric score";
  return undefined;
}

function createId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function scoreGoal(input: {
  studentName?: string;
  area: string;
  goalText: string;
  baselineText?: string;
  progressFrequency?: string;
  evaluationProcedures?: string[];
  plaaafpEvidence?: string;
}): ScoredGoal {
  const components = extractGoalComponents(input.goalText);

  const flags: GoalScoreFlag[] = [];
  let score = 0;

  if (components.timeframe) score += 10;
  else
    flags.push({
      code: "missing_timeframe",
      severity: "fail",
      message: "Timeframe missing.",
    });

  if (components.condition) score += 10;
  else
    flags.push({
      code: "missing_condition",
      severity: "fail",
      message: "Condition missing (when/given + supports).",
    });

  if (components.behavior) score += 10;
  else
    flags.push({
      code: "missing_behavior",
      severity: "fail",
      message: "Behavior missing (observable action).",
    });

  if (components.criterion) score += 10;
  else
    flags.push({
      code: "missing_criterion",
      severity: "fail",
      message: "Criterion missing (how much/how often).",
    });

  const baselineExists = !!(input.baselineText && input.baselineText.trim().length > 0);
  const baselineMetric = pickBaselineMetric(input.baselineText);
  const baselineTokens = baselineExists ? detectMetricTokens(input.baselineText ?? "") : new Set();
  const criterionTokens = components.criterion
    ? detectMetricTokens(components.criterion)
    : new Set();
  const methodMatch =
    baselineExists && criterionTokens.size > 0
      ? [...criterionTokens].some((token) => baselineTokens.has(token))
      : false;

  if (baselineExists) score += 10;
  else
    flags.push({
      code: "baseline_missing",
      severity: "warn",
      message:
        "Baseline data missing. TEA expects PLAAFP baseline using the same measurement method as the goal.",
      fixHint: "Add baseline in same format (e.g., WCPM+accuracy; x/y trials; rubric score).",
    });

  if (baselineExists && methodMatch) score += 10;
  else if (baselineExists)
    flags.push({
      code: "baseline_method_mismatch",
      severity: "warn",
      message: "Baseline measurement does not match goal criterion method.",
      fixHint: "Align baseline measurement with the goal’s criterion format.",
    });

  if (components.condition) {
    if (/accommodations listed|support as needed|as needed/i.test(components.condition)) {
      flags.push({
        code: "vague_condition",
        severity: "warn",
        message:
          "Condition is vague. TEA recommends specific conditions used every time measurement occurs.",
        fixHint: "Name the exact tool/support and keep it consistent across probes.",
      });
    } else {
      score += 15;
    }
  }

  if (components.criterion) {
    if (/\bbetween\s+\d+\s*[-–]\s*\d+/i.test(components.criterion)) {
      flags.push({
        code: "criterion_range_ambiguous",
        severity: "warn",
        message: "Criterion uses a range that may be misread as a ceiling.",
        fixHint: "Use 'at least X WCPM' or 'increase by X from baseline'.",
      });
    } else if (/passing\s+grade|passing\b/i.test(components.criterion)) {
      flags.push({
        code: "criterion_is_passing_rate",
        severity: "warn",
        message: "Criterion reads like a passing grade instead of growth from baseline.",
        fixHint: "Use a measurable growth target tied to baseline data.",
      });
    } else {
      score += 15;
    }
  }

  if (!input.progressFrequency) {
    flags.push({
      code: "progress_measure_mismatch",
      severity: "info",
      message: "Progress report frequency not attached to goal record.",
      fixHint: "Store progress frequency (ex: every 9 weeks) and display in exports.",
    });
  }

  if (input.plaaafpEvidence && input.plaaafpEvidence.length > 0) {
    score += 10;
  } else {
    flags.push({
      code: "plaaafp_alignment_risk",
      severity: "warn",
      message: "Goal is not linked to PLAAFP evidence/baseline in this record.",
      fixHint: "Attach the PLAAFP excerpt and baseline that directly matches this goal’s method.",
    });
  }

  const baseline: Baseline = {
    exists: baselineExists,
    methodMatch,
    ...(baselineMetric ? { metric: baselineMetric } : {}),
    ...(input.baselineText ? { value: input.baselineText } : {}),
  };

  const progress = {
    ...(input.progressFrequency ? { frequency: input.progressFrequency } : {}),
    ...(input.evaluationProcedures?.length ? { procedures: input.evaluationProcedures } : {}),
  };

  return {
    id: createId(),
    area: input.area,
    type: "academic",
    components,
    baseline,
    progress,
    score: Math.min(100, score),
    flags,
  };
}
