"use client";

import React, { useState, useEffect } from "react";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { GXCard } from "@/components/ui/GXCard";
import {
  FileArchive,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Sparkles,
  Presentation,
  BookOpen,
  Target,
  ShieldCheck,
  BarChart3,
  ClipboardList,
  User,
  Calendar,
} from "lucide-react";

type DeepDiveAnalysis = Record<string, unknown>;

const SLIDE_LIST = [
  { num: 1,  label: "Title Slide",                     icon: "✦" },
  { num: 2,  label: "Eligibility & Impact of Disability", icon: "⚖️" },
  { num: 3,  label: "Evaluation History / FIE & REED", icon: "📋" },
  { num: 4,  label: "Student Strengths",               icon: "💪" },
  { num: 5,  label: "Areas of Growth / Needs",         icon: "📈" },
  { num: 6,  label: "Student & Parent Input",          icon: "💬" },
  { num: 7,  label: "Teacher Feedback",                icon: "🎓" },
  { num: 8,  label: "Grades – Prior & Current Year",   icon: "📊" },
  { num: 9,  label: "Attendance / Absences",           icon: "📅" },
  { num: 10, label: "Dyslexia / Reading Services",     icon: "📖" },
  { num: 11, label: "STAAR Performance & Focus",       icon: "⭐" },
  { num: 12, label: "MAP Performance & Projections",   icon: "🗺️" },
  { num: 13, label: "Progress on Prior Year Goals",    icon: "✅" },
  { num: 14, label: "New Annual Goals",                icon: "🎯" },
  { num: 15, label: "Accommodations",                  icon: "🛡️" },
  { num: 16, label: "Assistive Technology",            icon: "💻" },
  { num: 17, label: "LRE, Placement, AIP & ESY",      icon: "🏫" },
  { num: 18, label: "Compensatory & Transportation",   icon: "🚌" },
  { num: 19, label: "Transition & Post-Secondary",     icon: "🚀" },
  { num: 20, label: "Consent, Medicaid & Closing",     icon: "🔒" },
];

export default function PacketsPage() {
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [analysisJson, setAnalysisJson] = useState<DeepDiveAnalysis | null>(null);
  const [studentName, setStudentName] = useState("");
  const [previewMode, setPreviewMode] = useState(false);

  // Auto-load Deep Dive results from localStorage (set by Deep Space page after analysis)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("galexii-last-deep-dive");
      if (stored) {
        const parsed = JSON.parse(stored) as { studentId?: string; analysis?: DeepDiveAnalysis };
        if (parsed.studentId) setStudentId(parsed.studentId);
        if (parsed.analysis) {
          setAnalysisJson(parsed.analysis);
          const info = parsed.analysis.student_info as Record<string, string> | undefined;
          if (info?.name) setStudentName(info.name);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const raw = studentId.trim();
    if (!raw) {
      setStatus("error");
      setMessage("Enter a Student ID first.");
      return;
    }

    setStatus("generating");
    setMessage("Contacting SpEdGalexii AI to generate your ARD presentation…");

    try {
      const resp = await fetch("/api/ard-packet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: raw,
          analysisJson: analysisJson ?? undefined,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error || `Server error ${resp.status}`);
      }

      // Download the PPTX
      const blob = await resp.blob();
      const disposition = resp.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `ARD_${raw}_${new Date().toISOString().slice(0, 10)}.pptx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setStatus("done");
      setMessage(`✅ ${filename} downloaded! Open it in PowerPoint or Google Slides.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus("error");
      setMessage(msg || "PPT generation failed.");
    }
  }

  const hasAnalysis = !!analysisJson;

  return (
    <GalaxyShell>
      <div className="mx-auto max-w-3xl space-y-6 py-4">

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-violet-400/30 bg-violet-500/10">
            <Presentation className="h-7 w-7 text-violet-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              ARD Packet Generator
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Generate a full 20-slide Galexii-branded ARD presentation deck using AI — 
              ready to print, present, or share as deliberation proceedings.
            </p>
          </div>
        </div>

        {/* Analysis status */}
        {hasAnalysis ? (
          <GXCard className="popCard popCard--mint">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-emerald-200">
                  Deep Dive Analysis Loaded
                </div>
                <div className="text-xs text-white/60 truncate">
                  {studentName ? `${studentName} (${studentId})` : `Student ${studentId}`} — AI will use your analysis data to fill every slide
                </div>
              </div>
            </div>
          </GXCard>
        ) : (
          <GXCard className="popCard popCard--solar">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <div className="text-sm text-amber-200/90">
                <strong>No Deep Dive analysis detected.</strong> Run a Deep Space analysis first for 
                AI-generated content. Without it, the PPT will still build but with placeholder text.
              </div>
            </div>
          </GXCard>
        )}

        {/* Main form */}
        <GXCard className="popCard popCard--violet">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Student ID
              </label>
              <input
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 focus:border-violet-400/60 focus:outline-none focus:ring-1 focus:ring-violet-400/40 transition"
                placeholder="e.g. 10178924"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={status === "generating"}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "generating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Building ARD presentation…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate ARD Presentation (.pptx)
                </>
              )}
            </button>
          </form>

          {status !== "idle" && (
            <div
              className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
                status === "done"
                  ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-200"
                  : status === "error"
                    ? "border-rose-500/40 bg-rose-950/40 text-rose-200"
                    : "border-violet-500/30 bg-violet-950/30 text-violet-200"
              }`}
            >
              {status === "done" ? (
                <Download className="mt-0.5 h-4 w-4 shrink-0" />
              ) : status === "error" ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
              )}
              <p className="leading-snug">{message}</p>
            </div>
          )}
        </GXCard>

        {/* Slide preview toggle */}
        <div>
          <button
            type="button"
            onClick={() => setPreviewMode(v => !v)}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition mb-3"
          >
            <BookOpen className="h-4 w-4" />
            {previewMode ? "Hide" : "Show"} slide outline ({SLIDE_LIST.length} slides)
          </button>

          {previewMode && (
            <div className="grid gap-2 sm:grid-cols-2">
              {SLIDE_LIST.map((s) => (
                <div
                  key={s.num}
                  className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-3 py-2"
                >
                  <span className="w-6 text-center text-xs font-bold text-violet-400/70">
                    {s.num}
                  </span>
                  <span className="text-base">{s.icon}</span>
                  <span className="text-xs text-white/70">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How it works */}
        <GXCard className="popCard popCard--violet">
          <h3 className="text-sm font-semibold text-violet-200 mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> How It Works
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 text-xs text-white/65">
            <div className="flex gap-2">
              <Target className="h-4 w-4 shrink-0 text-violet-400 mt-0.5" />
              <span>Run <strong className="text-white/80">Deep Space</strong> on a student first — the analysis feeds every slide with real data</span>
            </div>
            <div className="flex gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
              <span>GPT-4o writes professional ARD narratives for all 20 slides in the Galexii color scheme</span>
            </div>
            <div className="flex gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>The deck includes eligibility, STAAR/MAP, goals, accommodations, LRE, transitions, and consent</span>
            </div>
            <div className="flex gap-2">
              <Download className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <span>Downloads as a <strong className="text-white/80">.pptx</strong> file — open in PowerPoint, Google Slides, or Keynote</span>
            </div>
            <div className="flex gap-2">
              <BarChart3 className="h-4 w-4 shrink-0 text-violet-400 mt-0.5" />
              <span>Print the slides as-is for <strong className="text-white/80">ARD deliberation documents</strong> — they match the app's galaxy look</span>
            </div>
            <div className="flex gap-2">
              <ClipboardList className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
              <span>Each slide has a confidentiality footer and slide number for meeting use</span>
            </div>
          </div>
        </GXCard>

        {/* Workflow tip */}
        <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-xs text-white/50 leading-relaxed">
          <span className="font-semibold text-white/70">Recommended workflow: </span>
          Deep Space (upload IEPs) → IEP Prep → Goals → Accommodations → 
          <strong className="text-violet-300"> ARD Packets</strong> (this page) → print or present at meeting.
        </div>

      </div>
    </GalaxyShell>
  );
}

