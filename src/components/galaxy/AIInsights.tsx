"use client";

import React, { useState, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  Star,
  Shield,
  Target,
  ListChecks,
  MessageSquareQuote,
  Copy,
  Check,
} from "lucide-react";

// ── Types (mirrors ai.ts AIAnalysisResult) ──

type AIAnalysisResult = {
  overallGrade: string;
  gradeSummary: string;
  strengths: string[];
  concerns: Array<{
    severity: string;
    area: string;
    finding: string;
    recommendation: string;
    legalBasis?: string;
  }>;
  parentQuestions: string[];
  accommodationGaps: string[];
  goalAnalysis: {
    quality: string;
    issues: string[];
    suggestions: string[];
  };
  nextSteps: Array<{
    priority: number;
    action: string;
    deadline: string;
    template?: string;
  }>;
};

// ── Helpers ──

const GRADE_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; emoji: string }
> = {
  A: { color: "text-emerald-300", bg: "bg-emerald-500/15", border: "border-emerald-500/30", emoji: "🌟" },
  B: { color: "text-cyan-300", bg: "bg-cyan-500/15", border: "border-cyan-500/30", emoji: "✨" },
  C: { color: "text-amber-300", bg: "bg-amber-500/15", border: "border-amber-500/30", emoji: "⚠️" },
  D: { color: "text-orange-300", bg: "bg-orange-500/15", border: "border-orange-500/30", emoji: "🔶" },
  F: { color: "text-red-300", bg: "bg-red-500/15", border: "border-red-500/30", emoji: "🚨" },
};

const SEVERITY_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ReactNode }
> = {
  critical: {
    color: "text-red-300",
    bg: "bg-red-500/10 border-red-500/20",
    icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
  },
  high: {
    color: "text-orange-300",
    bg: "bg-orange-500/10 border-orange-500/20",
    icon: <AlertTriangle className="h-4 w-4 text-orange-400" />,
  },
  medium: {
    color: "text-amber-300",
    bg: "bg-amber-500/10 border-amber-500/20",
    icon: <Info className="h-4 w-4 text-amber-400" />,
  },
  low: {
    color: "text-blue-300",
    bg: "bg-blue-500/10 border-blue-500/20",
    icon: <Info className="h-4 w-4 text-blue-400" />,
  },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white/60 transition"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-white/[0.03] hover:bg-white/[0.05] transition text-left"
      >
        {icon}
        <span className="flex-1 font-semibold text-sm text-white/90">{title}</span>
        {badge}
        {open ? (
          <ChevronUp className="h-4 w-4 text-white/40" />
        ) : (
          <ChevronDown className="h-4 w-4 text-white/40" />
        )}
      </button>
      {open && <div className="px-4 py-3 space-y-3">{children}</div>}
    </div>
  );
}

// ── Main Component ──

export function AIInsights({
  analysisData,
}: {
  /** The raw analysis data from Deep Space to send for AI evaluation */
  analysisData: Record<string, unknown>;
}) {
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [parentSummary, setParentSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"insights" | "parent">("insights");

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisData, type: "full" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data: AIAnalysisResult = await res.json();
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [analysisData]);

  const runParentSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisData, type: "summary" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setParentSummary(data.summary);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSummaryLoading(false);
    }
  }, [analysisData]);

  // ── Pre-analysis state ──
  if (!result && !loading) {
    return (
      <div className="mt-8 border border-violet-500/20 rounded-2xl bg-violet-900/10 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/15">
            <Sparkles className="h-6 w-6 text-violet-300" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white/95">
              Galexii AI Insights
            </h3>
            <p className="text-sm text-white/50">
              Get AI-powered evaluation, recommendations & parent advocacy tips
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={runAnalysis}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl
            bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400
            text-white font-semibold text-sm shadow-lg shadow-violet-500/20
            hover:shadow-violet-500/40 transition-all duration-200"
        >
          <Sparkles className="h-4 w-4" />
          Generate AI Analysis
        </button>
        <p className="text-[11px] text-white/30 text-center">
          Uses GPT-4o · Analysis based on IDEA, Section 504 & TEA standards
        </p>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div className="mt-8 border border-violet-500/20 rounded-2xl bg-violet-900/10 p-8 flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
        <div className="text-center">
          <p className="text-white/80 font-semibold">
            Galexii is analyzing the IEP…
          </p>
          <p className="text-sm text-white/40 mt-1">
            Evaluating compliance, goals, accommodations & services
          </p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const defaultGrade = { color: "text-amber-300", bg: "bg-amber-500/15", border: "border-amber-500/30", emoji: "⚠️" };
  const grade = GRADE_CONFIG[result.overallGrade] ?? defaultGrade;

  // ── Full results ──
  return (
    <div className="mt-8 space-y-4">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-violet-300" />
          <h3 className="text-lg font-bold text-white/95">Galexii AI Insights</h3>
        </div>
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab("insights")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === "insights"
                ? "bg-violet-600/50 text-white"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            Full Analysis
          </button>
          <button
            onClick={() => {
              setActiveTab("parent");
              if (!parentSummary) runParentSummary();
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === "parent"
                ? "bg-violet-600/50 text-white"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            Parent Summary
          </button>
        </div>
      </div>

      {/* ── Parent Summary Tab ── */}
      {activeTab === "parent" && (
        <div className="border border-violet-500/20 rounded-2xl bg-violet-900/10 p-6">
          {summaryLoading ? (
            <div className="flex items-center gap-3 justify-center py-6">
              <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
              <span className="text-white/60 text-sm">Generating parent-friendly summary…</span>
            </div>
          ) : parentSummary ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-violet-300 flex items-center gap-2">
                  <MessageSquareQuote className="h-4 w-4" />
                  Parent-Friendly Summary
                </h4>
                <CopyButton text={parentSummary} />
              </div>
              <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                {parentSummary}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ── Insights Tab ── */}
      {activeTab === "insights" && (
        <div className="space-y-4">
          {/* Grade Card */}
          <div className={`${grade.bg} border ${grade.border} rounded-2xl p-5 flex items-center gap-4`}>
            <div className={`text-5xl font-black ${grade.color}`}>
              {grade.emoji} {result.overallGrade}
            </div>
            <div className="flex-1">
              <p className={`font-semibold ${grade.color}`}>Overall IEP Grade</p>
              <p className="text-sm text-white/60 mt-1">{result.gradeSummary}</p>
            </div>
            <button
              onClick={runAnalysis}
              className="text-xs text-white/40 hover:text-white/70 px-2 py-1 rounded-lg hover:bg-white/10 transition"
              title="Re-analyze"
            >
              Re-analyze
            </button>
          </div>

          {/* Strengths */}
          {result.strengths.length > 0 && (
            <CollapsibleSection
              title="Strengths"
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              defaultOpen
              badge={
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                  {result.strengths.length}
                </span>
              }
            >
              <ul className="space-y-2">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/75">
                    <Star className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {/* Concerns */}
          {result.concerns.length > 0 && (
            <CollapsibleSection
              title="Concerns & Recommendations"
              icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
              defaultOpen
              badge={
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                  {result.concerns.length}
                </span>
              }
            >
              <div className="space-y-3">
                {result.concerns
                  .sort((a, b) => {
                    const order = ["critical", "high", "medium", "low"];
                    return order.indexOf(a.severity) - order.indexOf(b.severity);
                  })
                  .map((c, i) => {
                    const defaultSev = { color: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/20", icon: <Info className="h-4 w-4 text-amber-400" /> };
                    const sev = SEVERITY_CONFIG[c.severity] ?? defaultSev;
                    return (
                      <div key={i} className={`border rounded-xl p-3 space-y-2 ${sev.bg}`}>
                        <div className="flex items-center gap-2">
                          {sev.icon}
                          <span className={`text-xs font-semibold uppercase ${sev.color}`}>
                            {c.severity}
                          </span>
                          <span className="text-xs text-white/40">·</span>
                          <span className="text-xs text-white/60">{c.area}</span>
                        </div>
                        <p className="text-sm text-white/80">{c.finding}</p>
                        <div className="bg-white/[0.04] rounded-lg p-2">
                          <p className="text-xs text-white/50 font-medium mb-1">
                            💡 Recommendation
                          </p>
                          <p className="text-sm text-white/75">{c.recommendation}</p>
                        </div>
                        {c.legalBasis && (
                          <p className="text-[11px] text-violet-300/70">
                            📜 {c.legalBasis}
                          </p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </CollapsibleSection>
          )}

          {/* Accommodation Gaps */}
          {result.accommodationGaps.length > 0 && (
            <CollapsibleSection
              title="Potential Accommodation Gaps"
              icon={<Shield className="h-4 w-4 text-cyan-400" />}
              badge={
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
                  {result.accommodationGaps.length}
                </span>
              }
            >
              <ul className="space-y-2">
                {result.accommodationGaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/75">
                    <Shield className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    {g}
                  </li>
                ))}
              </ul>
            </CollapsibleSection>
          )}

          {/* Goal Analysis */}
          {result.goalAnalysis && (
            <CollapsibleSection
              title="Goal Quality Analysis"
              icon={<Target className="h-4 w-4 text-violet-400" />}
              badge={
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    result.goalAnalysis.quality === "strong"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : result.goalAnalysis.quality === "adequate"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {result.goalAnalysis.quality}
                </span>
              }
            >
              {result.goalAnalysis.issues.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-white/50 font-medium">Issues:</p>
                  {result.goalAnalysis.issues.map((issue, i) => (
                    <p key={i} className="text-sm text-white/70 pl-4 border-l-2 border-amber-500/30">
                      {issue}
                    </p>
                  ))}
                </div>
              )}
              {result.goalAnalysis.suggestions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-white/50 font-medium">Suggestions:</p>
                  {result.goalAnalysis.suggestions.map((sug, i) => (
                    <p key={i} className="text-sm text-white/70 pl-4 border-l-2 border-emerald-500/30">
                      {sug}
                    </p>
                  ))}
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* Parent Questions */}
          {result.parentQuestions.length > 0 && (
            <CollapsibleSection
              title="Questions to Ask at Next ARD"
              icon={<MessageSquareQuote className="h-4 w-4 text-violet-400" />}
              badge={
                <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                  {result.parentQuestions.length}
                </span>
              }
            >
              <div className="space-y-2">
                {result.parentQuestions.map((q, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2 bg-white/[0.03] rounded-lg p-2.5"
                  >
                    <p className="text-sm text-white/80 flex-1">
                      <span className="text-violet-400 font-bold mr-1.5">{i + 1}.</span>
                      {q}
                    </p>
                    <CopyButton text={q} />
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Next Steps */}
          {result.nextSteps.length > 0 && (
            <CollapsibleSection
              title="Prioritized Next Steps"
              icon={<ListChecks className="h-4 w-4 text-cyan-400" />}
              defaultOpen
              badge={
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
                  {result.nextSteps.length}
                </span>
              }
            >
              <div className="space-y-3">
                {result.nextSteps
                  .sort((a, b) => a.priority - b.priority)
                  .map((step, i) => (
                    <div key={i} className="border border-white/[0.06] rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold">
                          {step.priority}
                        </span>
                        <p className="text-sm text-white/85 font-medium flex-1">
                          {step.action}
                        </p>
                      </div>
                      <p className="text-xs text-white/50 pl-8">
                        ⏰ {step.deadline}
                      </p>
                      {step.template && (
                        <div className="pl-8">
                          <div className="bg-white/[0.04] rounded-lg p-3 relative">
                            <div className="absolute top-2 right-2">
                              <CopyButton text={step.template} />
                            </div>
                            <p className="text-[11px] text-white/40 font-medium mb-1">
                              📝 Template:
                            </p>
                            <p className="text-xs text-white/65 whitespace-pre-wrap pr-8">
                              {step.template}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
}
