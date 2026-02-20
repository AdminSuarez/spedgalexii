"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { UploadCard } from "@/components/galaxy/UploadCard";
import { Search, Sparkles, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import goalBankData from "@/data/goals/galexii-goalbank.json";

// GoalBank categories for the browser
const GOAL_CATEGORIES = [
  { key: "english", label: "English", color: "violet" },
  { key: "reading", label: "Reading", color: "cyan" },
  { key: "writing", label: "Writing", color: "emerald" },
  { key: "dyslexia_intervention", label: "Dyslexia", color: "amber" },
  { key: "math", label: "Math", color: "rose" },
  { key: "math_calculation", label: "Math Calc", color: "pink" },
  { key: "word_problems", label: "Word Problems", color: "orange" },
  { key: "science", label: "Science", color: "teal" },
] as const;

type CategoryKey = typeof GOAL_CATEGORIES[number]["key"];

// Map component keys → actual JSON keys (JSON uses title-case with spaces)
const CATEGORY_KEY_MAP: Record<CategoryKey, string> = {
  english: "English",
  reading: "Reading",
  writing: "Writing",
  dyslexia_intervention: "Dyslexia Intervention",
  math: "Math",
  math_calculation: "Math Calculation",
  word_problems: "Word Problems",
  science: "Science",
};

type Severity = "info" | "warn" | "fail";

type GoalComponent = {
  timeframe?: string;
  condition?: string;
  behavior?: string;
  criterion?: string;
};

type GoalScoreFlag = {
  code:
    | "missing_timeframe"
    | "missing_condition"
    | "missing_behavior"
    | "missing_criterion"
    | "vague_condition"
    | "baseline_missing"
    | "baseline_method_mismatch"
    | "criterion_range_ambiguous"
    | "plaafp_alignment_risk";
  severity: Severity;
  message: string;
  fixHint?: string;
};

type ScoredGoal = {
  components: GoalComponent;
  score: number; // 0-100
  flags: GoalScoreFlag[];
  suggestedRewrite?: string;
};

type ScoreGoalOpts = {
  goalText: string;
  baselineText: string;
  plaafpText: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function extractGoalComponents(goalText: string): GoalComponent {
  const t = goalText.replace(/\s+/g, " ").trim();

  const timeframe =
    t.match(/^(By the end of[^,]*|Within[^,]*|By\s+\d{1,2}\/\d{1,2}\/\d{2,4})/i)?.[0] ??
    undefined;

  const condition =
    t.match(
      /\b(when|given|during|while)\b\s+(.+?)(?=,\s*\[?Student Name\]?|\s+[A-Z][a-z]+\s+will\b)/i
    )?.[0] ?? undefined;

  const behaviorMatch = t.match(
    /\bwill\b\s+(.+?)(?=,?\s+(with|for|on)\b|,?\s+\d+%|,?\s+\d+\s*out\s*of\s*\d+|$)/i
  );
  const behaviorText = behaviorMatch?.[1]?.trim();
  const behavior = behaviorText ? `will ${behaviorText}` : undefined;

  const criterion =
    t.match(
      /(\d+\s*out\s*of\s*\d+|\d+\s*\/\s*\d+|\d+%|\bWCPM\b.+?|on\s+\d+\s*out\s*of\s*\d+.+)$/i
    )?.[0] ?? undefined;

  return {
    ...(timeframe ? { timeframe } : {}),
    ...(condition ? { condition } : {}),
    ...(behavior ? { behavior } : {}),
    ...(criterion ? { criterion } : {}),
  };
}

function makeSuggestedRewrite(input: GoalComponent) {
  const tf = input.timeframe ? input.timeframe.replace(/,$/, "") : "Within 12 months";
  const cond = input.condition ? input.condition.replace(/,$/, "") : "when provided the required supports";
  const beh = input.behavior ? input.behavior.replace(/^will\s+/i, "").trim() : "demonstrate the target skill";
  const crit = input.criterion ? input.criterion.replace(/^\s*[,]/, "").trim() : "with stated mastery criteria";

  return `${tf}, ${cond}, [Student Name] will ${beh}, ${crit} as measured by teacher data collection.`;
}

function scoreGoal(opts: ScoreGoalOpts): ScoredGoal {
  const components = extractGoalComponents(opts.goalText);
  const flags: GoalScoreFlag[] = [];
  let score = 0;

  // Components (40 pts)
  if (components.timeframe) score += 10;
  else
    flags.push({
      code: "missing_timeframe",
      severity: "fail",
      message: "Missing timeframe (ex: “By the end of the IEP period…”).",
      fixHint: "Add a clear timeframe (12 months or a specific date range).",
    });

  if (components.condition) score += 10;
  else
    flags.push({
      code: "missing_condition",
      severity: "fail",
      message: "Missing condition (when/given/during + specific supports).",
      fixHint: "State the exact materials/supports used every time you measure the goal.",
    });

  if (components.behavior) score += 10;
  else
    flags.push({
      code: "missing_behavior",
      severity: "fail",
      message: "Missing observable behavior (an action you can see/count/score).",
      fixHint: "Use a measurable verb (identify, solve, write, correct, summarize, etc.).",
    });

  if (components.criterion) score += 10;
  else
    flags.push({
      code: "missing_criterion",
      severity: "fail",
      message: "Missing criterion (how much/how often/what level = mastery).",
      fixHint: "Add % accuracy, x/y trials, rubric score, WCPM, etc.",
    });

  // Baseline (20 pts)
  const baselineExists = opts.baselineText.trim().length > 0;
  if (baselineExists) score += 10;
  else
    flags.push({
      code: "baseline_missing",
      severity: "warn",
      message:
        "Baseline missing. TEA best practice expects baseline data measured the same way as the goal.",
      fixHint: "Add baseline in the same format as your criterion (%, x/y, WCPM, rubric).",
    });

  // Vague condition (10 pts)
  if (components.condition) {
    const vague =
      /as needed|support as needed|accommodations listed|with accommodations|with support/i.test(
        components.condition
      );
    if (vague) {
      flags.push({
        code: "vague_condition",
        severity: "warn",
        message:
          "Condition is vague. Conditions must be specific and used every time it is measured.",
        fixHint:
          "Name the tool/support (graphic organizer, checklist, rubric, equation mat, etc.).",
      });
      score += 5;
    } else {
      score += 10;
    }
  }

  // Criterion range ambiguity (5 pts)
  if (components.criterion && /\bbetween\b|\b\d+\s*-\s*\d+\b/i.test(components.criterion)) {
    flags.push({
      code: "criterion_range_ambiguous",
      severity: "warn",
      message:
        "Criterion uses a range (ex: “between 100–120”). This can be misread as a ceiling.",
      fixHint: "Use “at least X” or “increase by X from baseline.”",
    });
  } else {
    if (components.criterion) score += 5;
  }

  // PLAAFP alignment (15 pts)
  if (opts.plaafpText.trim().length > 0) score += 10;
  else
    flags.push({
      code: "plaafp_alignment_risk",
      severity: "warn",
      message:
        "PLAAFP excerpt not included. Link goal to baseline/evidence so it’s clearly individualized.",
      fixHint:
        "Paste the PLAAFP baseline sentence(s) that match the goal’s measurement method.",
    });

  // Baseline method match (heuristic)
  const crit = (components.criterion ?? "").toLowerCase();
  const base = opts.baselineText.toLowerCase();

  const matchesMetric =
    (!!crit && !!base && (crit.includes("wcpm") ? base.includes("wcpm") : false)) ||
    (!!crit && !!base && (/%/.test(components.criterion ?? "") ? /%/.test(opts.baselineText) : false)) ||
    (!!crit &&
      !!base &&
      (/out\s*of|\/\s*\d+/.test(components.criterion ?? "")
        ? /out\s*of|\/\s*\d+/.test(opts.baselineText)
        : false));

  if (baselineExists && matchesMetric) {
    score += 5;
  } else if (baselineExists && !matchesMetric && (components.criterion || components.behavior)) {
    flags.push({
      code: "baseline_method_mismatch",
      severity: "info",
      message: "Baseline may not match the goal’s measurement format (heuristic check).",
      fixHint:
        "Make baseline use the same metric as the criterion (ex: WCPM+accuracy; x/y trials; rubric score).",
    });
  }

  const suggestedRewrite = makeSuggestedRewrite(components);

  return {
    components,
    score: Math.max(0, Math.min(100, score)),
    flags,
    suggestedRewrite,
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
      className={cx(
        "inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold",
        cls
      )}
    >
      {label}
    </span>
  );
}

function readParam(sp: URLSearchParams, key: string): string {
  const v = sp.get(key);
  return typeof v === "string" ? v : "";
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🌌 GOALBANK BROWSER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function GoalBankBrowser({
  onInsertGoal,
}: {
  onInsertGoal: (goal: string) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("reading");
  const [searchQuery, setSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Get goals for the active category
  const categoryGoals = useMemo(() => {
    const jsonKey = CATEGORY_KEY_MAP[activeCategory] || activeCategory;
    const goals = (goalBankData.categories as Record<string, string[]>)[jsonKey] || [];
    if (!searchQuery.trim()) return goals;
    const q = searchQuery.toLowerCase();
    return goals.filter((g) => g.toLowerCase().includes(q));
  }, [activeCategory, searchQuery]);

  const handleCopy = async (goal: string, index: number) => {
    await navigator.clipboard.writeText(goal);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const categoryMeta = GOAL_CATEGORIES.find((c) => c.key === activeCategory);

  return (
    <div className="sidebarTile sidebarTile--starfield p-5 mt-8">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
          <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-violet-500/30 to-cyan-500/30 border border-white/15 grid place-items-center">
            <Sparkles className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <div className="cardTitle text-white flex items-center gap-2">
              GoalBank Galexii
              <span className="rounded-full border border-amber-300/30 bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.3)]">
                240 Goals
              </span>
            </div>
            <div className="cardMeta text-white/60">
              TEA-style goals • 7-9th grade • Ready to customize
            </div>
          </div>
        </div>
        <button className="p-2 rounded-lg hover:bg-white/10 transition">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-white/60" />
          ) : (
            <ChevronDown className="h-5 w-5 text-white/60" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-5 space-y-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {GOAL_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.key;
              const jsonKey = CATEGORY_KEY_MAP[cat.key] || cat.key;
              const count = ((goalBankData.categories as Record<string, string[]>)[jsonKey] || []).length;

              return (
                <button
                  key={cat.key}
                  onClick={() => {
                    setActiveCategory(cat.key);
                    setSearchQuery("");
                  }}
                  className={cx(
                    "relative px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                    isActive
                      ? "bg-linear-to-r from-cyan-500/25 to-violet-500/25 border-cyan-400/40 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.3)]"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {cat.label}
                  <span className="ml-1 text-[10px] opacity-60">({count})</span>

                  {/* Active glow bar */}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-0.5 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.5)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              placeholder={`Search ${categoryMeta?.label || ""} goals...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-black/30 text-white/90 placeholder-white/40 text-sm outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/20 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Goals List */}
          <div className="space-y-2 max-h-80 overflow-y-auto scrollCosmic pr-2">
            {categoryGoals.length === 0 ? (
              <div className="text-center py-8 text-white/50">
                {searchQuery ? `No goals match "${searchQuery}"` : "No goals in this category"}
              </div>
            ) : (
              categoryGoals.map((goal, idx) => (
                <div
                  key={idx}
                  className="group relative rounded-xl border border-white/8 bg-black/20 p-3 hover:border-cyan-400/25 hover:bg-white/5 transition"
                >
                  <p className="text-white/85 text-sm leading-relaxed pr-20">{goal}</p>

                  {/* Actions */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleCopy(goal, idx)}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
                      title="Copy to clipboard"
                    >
                      {copiedIndex === idx ? (
                        <Check className="h-3.5 w-3.5 text-emerald-300" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-white/70" />
                      )}
                    </button>
                    <button
                      onClick={() => onInsertGoal(goal)}
                      className="px-2.5 py-1.5 rounded-lg bg-linear-to-r from-cyan-500/30 to-violet-500/30 border border-cyan-400/30 text-cyan-100 text-xs font-semibold hover:from-cyan-500/40 hover:to-violet-500/40 transition shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                    >
                      Insert
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/8">
            <div className="text-white/50 text-xs">
              Showing {categoryGoals.length} of {((goalBankData.categories as Record<string, string[]>)[CATEGORY_KEY_MAP[activeCategory] || activeCategory] || []).length} goals
            </div>
            <div className="text-white/40 text-xs italic">
              Click "Insert" to add to Goal intake
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GoalsPageInner() {
  const searchParams = useSearchParams();

  const [goalText, setGoalText] = useState<string>(
    "By the end of the IEP period, when given a grade-level passage, [Student Name] will identify the main idea with 85% accuracy in 4 out of 5 attempts in classroom reading sessions as measured by teacher data collection."
  );
  const [baselineText, setBaselineText] = useState<string>("");
  const [plaafpText, setPlaafpText] = useState<string>("");
  const [result, setResult] = useState<ScoredGoal | null>(null);

  // ✅ Prefill from query string once
  useEffect(() => {
    if (!searchParams) return;

    const g = readParam(searchParams, "goalText");
    const b = readParam(searchParams, "baselineText");
    const p = readParam(searchParams, "plaafpText");

    let changed = false;

    if (g.trim().length > 0) {
      setGoalText(g);
      changed = true;
    }
    if (b.trim().length > 0) {
      setBaselineText(b);
      changed = true;
    }
    if (p.trim().length > 0) {
      setPlaafpText(p);
      changed = true;
    }

    if (changed) setResult(null);
  }, [searchParams]);

  const scoreColor = useMemo(() => {
    const s = result?.score ?? 0;
    if (s >= 85) return "text-emerald-200";
    if (s >= 70) return "text-amber-200";
    return "text-rose-200";
  }, [result?.score]);

  // Handler to insert goal from GoalBank
  const handleInsertGoalFromBank = (goal: string) => {
    setGoalText(goal);
    setResult(null);
    // Scroll to intake area
    const intakeEl = document.getElementById("goal-intake-area");
    if (intakeEl) {
      intakeEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <GalaxyShell>
      <div className="page w-full">
        {/* Universe Header */}
        <div className="mb-10">
          <div className="heroBrandRow">
            <div className="heroIconWrap">
              <Image
                src="/brand/galexii-logo-round.png"
                alt="SpEdGalexii"
                width={140}
                height={140}
                priority
                className="heroIcon rounded-full bg-black"
              />
            </div>

            <div className="min-w-0 heroAura">
              <h1 className="heroTitle wrap-break-word">
                Goals Galexii
              </h1>

              <div className="cardMeta mt-3 text-white/70">
                Target Range — Where vague intentions become measurable outcomes
              </div>
            </div>
          </div>

          <p className="cardBody mt-5 max-w-5xl text-white/85">
            The <span className="text-white/95 font-semibold">Goals Galexii</span> scores 
            IEP goals against the TEA 4-component rubric: Timeframe, Condition, Behavior, and Criterion. 
            Upload your FULLGoals_By_Student export to score goals automatically, or paste a single goal below.
          </p>

          <p className="cardBody mt-3 max-w-4xl text-rose-300/80 italic">
            "A goal without a baseline is just a wish. A goal without a criterion is a dream. Let's make them real."
          </p>
        </div>

        {/* Upload Card */}
        <UploadCard module="goals" />

        {/* ═══════════════════════════════════════════════════════════════════
            🌌 GOALBANK BROWSER - 240 TEA-style goals ready to customize
        ═══════════════════════════════════════════════════════════════════ */}
        <GoalBankBrowser onInsertGoal={handleInsertGoalFromBank} />

        <div id="goal-intake-area" className="mt-8 border-t border-white/10 pt-6 scroll-mt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl font-bold text-white/90">Manual Goal Scoring</div>
            <span className="rounded-full border border-cyan-300/30 bg-cyan-400/15 px-2 py-0.5 text-xs font-semibold text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.25)]">
              Analyzer
            </span>
          </div>
          <div className="text-white/70 mb-4">
            Paste a goal (or select from GoalBank above), score it against the TEA-style components (timeframe, condition,
            behavior, criterion), and get a cleaner rewrite.
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7 sidebarTile sidebarTile--violet p-5">
            <div className="cardTitle text-white">Goal intake</div>
            <div className="cardBody mt-2 text-white/80">
              Paste text now. Next: multi-goal paste, scoring table, exports, sessions.
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="uiLabel text-white/70">Goal text</div>
                  <textarea
                  className="mt-2 w-full min-h-40 rounded-2xl border border-white/10 bg-black/30 p-3 text-white/90 outline-none focus:border-white/20"
                  value={goalText}
                  onChange={(e) => setGoalText(e.target.value)}
                  placeholder="Paste a measurable annual goal here…"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <div className="uiLabel text-white/70">Baseline (optional)</div>
                  <textarea
                    className="mt-2 w-full min-h-27.5 rounded-2xl border border-white/10 bg-black/30 p-3 text-white/90 outline-none focus:border-white/20"
                    value={baselineText}
                    onChange={(e) => setBaselineText(e.target.value)}
                    placeholder="Example: Baseline: 0/5 correct across 2 probes…"
                  />
                </div>

                <div>
                  <div className="uiLabel text-white/70">PLAAFP excerpt (optional)</div>
                  <textarea
                    className="mt-2 w-full min-h-27.5 rounded-2xl border border-white/10 bg-black/30 p-3 text-white/90 outline-none focus:border-white/20"
                    value={plaafpText}
                    onChange={(e) => setPlaafpText(e.target.value)}
                    placeholder="Paste PLAAFP baseline sentence(s) that justify this goal…"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setResult(scoreGoal({ goalText, baselineText, plaafpText }))}
                  className="rounded-2xl border border-white/12 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
                >
                  Score goal
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGoalText("");
                    setBaselineText("");
                    setPlaafpText("");
                    setResult(null);
                  }}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-white/80 hover:text-white"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 sidebarTile sidebarTile--solar p-5">
            <div className="cardTitle text-white">Goal Quality</div>
            <div className="cardBody mt-2 text-white/80">
              Deterministic heuristics (fast + stable). Later: optional AI extraction.
            </div>

            <div className="mt-4 sidebarTile sidebarTile--violet p-4">
              <div className="uiLabel text-white/70">Score</div>
              <div className={cx("mt-1 text-4xl font-black tracking-tight", scoreColor)}>
                {result ? `${result.score}/100` : "—"}
              </div>

              <div className="mt-4 grid gap-2">
                <div className="uiLabel text-white/70">Components found</div>
                <div className="space-y-2 text-white/80">
                  <div>
                    <span className="font-semibold text-white">Timeframe:</span>{" "}
                    <span className="text-white/80">{result?.components.timeframe ?? "—"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white">Condition:</span>{" "}
                    <span className="text-white/80">{result?.components.condition ?? "—"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white">Behavior:</span>{" "}
                    <span className="text-white/80">{result?.components.behavior ?? "—"}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-white">Criterion:</span>{" "}
                    <span className="text-white/80">{result?.components.criterion ?? "—"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="uiLabel text-white/70">Flags</div>
                {result?.flags?.length ? (
                  <div className="mt-2 space-y-2">
                    {result.flags.map((f, idx) => (
                      <div
                        key={`${f.code}-${idx}`}
                        className="rounded-2xl border border-white/10 bg-black/25 p-3 text-white/85"
                      >
                        <div className="flex items-center gap-2">
                          <SeverityBadge severity={f.severity} />
                          <div className="font-semibold text-white">{f.message}</div>
                        </div>
                        {f.fixHint ? <div className="mt-2 text-white/70">{f.fixHint}</div> : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-white/70">Run “Score goal” to see flags.</div>
                )}
              </div>

              <div className="mt-4">
                <div className="uiLabel text-white/70">Suggested rewrite</div>
                <div className="mt-2 rounded-2xl border border-white/10 bg-black/25 p-3 text-white/85">
                  {result?.suggestedRewrite ?? "—"}
                </div>
              </div>

              <div className="mt-4 text-white/60 text-xs">
                Next upgrade: multi-goal paste, export CSV/JSON, TEKS attach, benchmarks generator.
              </div>
            </div>
          </div>
        </div>

        <div className="h-6" />
      </div>
    </GalaxyShell>
  );
}

export default function GoalsPage() {
  return (
    <Suspense fallback={<GalaxyShell><div className="p-8 text-white/60">Loading Goals Galexii...</div></GalaxyShell>}>
      <GoalsPageInner />
    </Suspense>
  );
}
