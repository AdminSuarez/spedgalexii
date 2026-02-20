"use client";

import React, { useState, useCallback, useMemo } from "react";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { Upload, FileText, Copy, Check, Sparkles } from "lucide-react";

// Minimal Deep Dive shape needed for Dlibs
interface DeepDiveData {
  student_info?: {
    name?: string | null;
    grade?: string | null;
    disability?: string | null;
  };
  evaluation_status?: {
    initial_fie_date?: string | null;
    last_full_eval_date?: string | null;
    days_since_full_eval?: number | null;
    eval_overdue?: boolean;
    last_reed_date?: string | null;
  };
  deliberations?: {
    meeting_info?: {
      ard_date?: string | null;
      purpose?: string | null;
    };
    evaluation_review?: {
      fie_date?: string | null;
      eligibility?: string | null;
      reed_due_date?: string | null;
    };
    plaafp_sections?: Array<{
      subject: string;
      grades?: string;
      teacher_comment?: string;
      goal_progress?: string;
      concerns?: string;
    }>;
    parent_concerns?: string[];
  };
  goal_analysis?: {
    current_goals?: Array<{
      text_preview: string;
      complete: boolean;
    }>;
    previous_goals_not_met?: number;
    previous_goals_met?: number;
  };
  fie_data?: {
    sld_eligibility?: {
      areas_identified?: string[];
    };
  };
  map_assessment?: {
    summary?: Record<string, {
      rit_score?: number;
      percentile?: number;
      achievement_level?: string;
      lexile?: string;
    }>;
    staar_projection?: {
      projection?: string;
      subject?: string;
    };
  };
  attendance_analysis?: {
    history?: Array<{ date: string; days_absent: number }>;
    chronic_pattern?: boolean;
    improving?: boolean;
    housing_barriers?: boolean;
  };
  student_profile?: {
    current_year_courses?: Array<{
      teacher?: string;
      course_title?: string;
      first_9wk?: string;
      second_9wk?: string;
      s1_avg?: string;
      s2_avg?: string;
      year_avg?: string;
      year_attendance?: string;
    }>;
    prior_year_courses?: Array<{
      teacher?: string;
      course_title?: string;
      first_9wk?: string;
      second_9wk?: string;
      s1_avg?: string;
      s2_avg?: string;
      year_avg?: string;
      year_attendance?: string;
    }>;
    staar?: Array<{
      date?: string;
      subject?: string;
      percentile?: string;
      scaled_score?: string;
      lexile?: string;
      meets?: string;
      masters?: string;
    }>;
  };
}

interface DlibBlock {
  id: string;
  title: string;
  body: string;
}

export default function DlibsPage() {
  const [deepDive, setDeepDive] = useState<DeepDiveData | null>(null);
  const [blocks, setBlocks] = useState<DlibBlock[]>([]);
  const [copiedId, setCopiedId] = useState<string | "all" | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const buildBlocks = useCallback((data: DeepDiveData): DlibBlock[] => {
    const results: DlibBlock[] = [];

    const disability = data.student_info?.disability || "";
    const grade = data.student_info?.grade || "";
    const gradeNum = parseInt(grade, 10);

    // 1. Event & Due Dates
    const evalStatus = data.evaluation_status;
    const dMeet = data.deliberations?.meeting_info;
    const dEval = data.deliberations?.evaluation_review;
    const eventLines: string[] = [];
    if (dMeet?.ard_date) {
      eventLines.push(`The ARD committee convened on ${dMeet.ard_date} to review the student's program.`);
    }
    if (dMeet?.purpose) {
      eventLines.push(`Meeting purpose: ${dMeet.purpose}.`);
    }
    if (evalStatus?.initial_fie_date) {
      eventLines.push(`The most recent full individual evaluation on record is dated ${evalStatus.initial_fie_date}.`);
    }
    if (evalStatus?.days_since_full_eval != null) {
      eventLines.push(
        `This places the evaluation approximately ${evalStatus.days_since_full_eval} days in the past, ` +
        `${evalStatus.eval_overdue ? "and a re-evaluation is overdue under the three-year timeline." : "which remains within the current three-year timeline."}`
      );
    }
    if (evalStatus?.last_reed_date) {
      eventLines.push(`The last REED on file is dated ${evalStatus.last_reed_date}.`);
    }
    if (dEval?.reed_due_date) {
      eventLines.push(`The documented REED due date is ${dEval.reed_due_date}.`);
    }
    if (eventLines.length > 0) {
      results.push({
        id: "events",
        title: "Event & Evaluation Timeline",
        body: eventLines.join(" \n"),
      });
    }

    // 2. Impact of Disability (mirrors IEP Prep impact builder)
    const mapSummary = data.map_assessment;
    const att = data.attendance_analysis;
    const impactParts: string[] = [];
    if (disability) {
      impactParts.push(
        `The student is identified with ${disability}, which impacts access to grade-level TEKS and the pace at which new skills are acquired.`
      );
    }
    if (grade) {
      impactParts.push(
        `In the current grade (${grade}), the student requires specially designed instruction and accommodations to make progress in the general curriculum.`
      );
    }
    if (mapSummary?.summary && Object.keys(mapSummary.summary).length > 0) {
      const mapLines: string[] = [];
      for (const [subject, s] of Object.entries(mapSummary.summary)) {
        const parts: string[] = [];
        if (s.rit_score != null) parts.push(`RIT ${s.rit_score}`);
        if (s.percentile != null) parts.push(`${s.percentile}th %ile`);
        if (s.achievement_level) parts.push(s.achievement_level);
        if (s.lexile) parts.push(`Lexile ${s.lexile}`);
        mapLines.push(`${subject[0].toUpperCase() + subject.slice(1)}: ${parts.join(", ")}`);
      }
      if (mapLines.length > 0) {
        impactParts.push(
          "Recent district assessment data (MAP) indicates the following performance levels:" +
            "\n" +
            mapLines.join("\n")
        );
      }
    }
    if (att && (att.chronic_pattern || att.housing_barriers)) {
      const attBits: string[] = [];
      if (att.chronic_pattern) attBits.push("a pattern of chronic absenteeism");
      if (att.housing_barriers) attBits.push("documented housing/transportation barriers");
      if (attBits.length > 0) {
        impactParts.push(
          `Access to instruction is further impacted by ${attBits.join(" and ")}, which reduces time in class and opportunities for re-teaching.`
        );
      }
    }
    if (impactParts.length > 0) {
      results.push({
        id: "impact",
        title: "Impact of Disability",
        body: impactParts.join("\n\n"),
      });
    }

    // 3. PLAAFP & Present Levels
    const plaafpLines: string[] = [];
    const plaafp = data.deliberations?.plaafp_sections || [];
    for (const sec of plaafp) {
      const pieces: string[] = [];
      pieces.push(`${sec.subject} – Present Levels:`);
      if (sec.grades) pieces.push(`Grades/Performance: ${sec.grades}`);
      if (sec.teacher_comment) pieces.push(`Teacher notes: ${sec.teacher_comment}`);
      if (sec.concerns) pieces.push(`Concerns/needs: ${sec.concerns}`);
      if (sec.goal_progress) pieces.push(`Prior goal progress: ${sec.goal_progress}`);
      plaafpLines.push(pieces.join(" "));
    }
    // Grade/attendance from student_profile courses
    const sp = data.student_profile;
    const formatCourse = (c: {
      teacher?: string;
      course_title?: string;
      first_9wk?: string;
      second_9wk?: string;
      s1_avg?: string;
      s2_avg?: string;
      year_avg?: string;
      year_attendance?: string;
    }) => {
      const parts: string[] = [];
      if (c.first_9wk || c.second_9wk || c.s1_avg || c.s2_avg || c.year_avg) {
        const bits: string[] = [];
        if (c.first_9wk) bits.push(`Q1 ${c.first_9wk}`);
        if (c.second_9wk) bits.push(`Q2 ${c.second_9wk}`);
        if (c.s1_avg) bits.push(`S1 ${c.s1_avg}`);
        if (c.s2_avg) bits.push(`S2 ${c.s2_avg}`);
        if (c.year_avg) bits.push(`YR ${c.year_avg}`);
        parts.push(bits.join(", "));
      }
      if (c.year_attendance) parts.push(`Attendance ${c.year_attendance}`);
      const label = c.course_title || "Course";
      const t = c.teacher ? ` (${c.teacher})` : "";
      return parts.length > 0 ? `${label}${t}: ${parts.join("; ")}` : "";
    };
    const courseLines: string[] = [];
    if (sp?.current_year_courses) {
      const lines = sp.current_year_courses.map(formatCourse).filter(Boolean);
      if (lines.length > 0) {
        courseLines.push("Current year courses:");
        courseLines.push(...lines);
      }
    }
    if (sp?.prior_year_courses) {
      const lines = sp.prior_year_courses.map(formatCourse).filter(Boolean);
      if (lines.length > 0) {
        courseLines.push("Prior year courses:");
        courseLines.push(...lines);
      }
    }
    const plaafpBodyParts: string[] = [];
    if (plaafpLines.length > 0) plaafpBodyParts.push(plaafpLines.join("\n"));
    if (courseLines.length > 0) plaafpBodyParts.push(courseLines.join("\n"));
    if (plaafpBodyParts.length > 0) {
      results.push({
        id: "plaafp",
        title: "Present Levels (PLAAFP)",
        body: plaafpBodyParts.join("\n\n"),
      });
    }

    // 4. SLD & Eligibility
    const sldAreas = data.fie_data?.sld_eligibility?.areas_identified || [];
    const eligText = data.deliberations?.evaluation_review?.eligibility;
    if (sldAreas.length > 0 || eligText) {
      const lines: string[] = [];
      if (eligText) lines.push(`Eligibility statement: ${eligText}`);
      if (sldAreas.length > 0) {
        lines.push(`Specific Learning Disability areas identified: ${sldAreas.join(", ")}.`);
      }
      results.push({
        id: "sld",
        title: "Eligibility & SLD Areas",
        body: lines.join(" \n"),
      });
    }

    // 5. Goals & Progress
    const ga = data.goal_analysis;
    if (ga?.current_goals && ga.current_goals.length > 0) {
      const lines: string[] = [];
      lines.push(
        `The current IEP includes ${ga.current_goals.length} measurable annual goal(s); ` +
          `${ga.previous_goals_met ?? 0} prior goals noted as met and ${ga.previous_goals_not_met ?? 0} noted as not met.`
      );
      ga.current_goals.slice(0, 6).forEach((g, idx) => {
        lines.push(
          `Goal ${idx + 1}: ${g.text_preview} (${g.complete ? "meets all TEA components" : "needs refinement on one or more components"}).`
        );
      });
      results.push({
        id: "goals",
        title: "Goals & Progress",
        body: lines.join(" \n"),
      });
    }

    // 6. Assessments (MAP & STAAR)
    const assessLines: string[] = [];
    if (mapSummary?.staar_projection?.projection) {
      const proj = mapSummary.staar_projection.projection;
      const subj = mapSummary.staar_projection.subject;
      assessLines.push(`MAP-based STAAR projection: ${proj}${subj ? ` in ${subj}` : ""}.`);
    }
    const staar = sp?.staar || [];
    if (staar.length > 0) {
      assessLines.push("Recent STAAR performance:");
      staar
        .filter(s => s.date && s.subject)
        .forEach(s => {
          const perf: string[] = [];
          if (s.meets) perf.push(`Meets: ${s.meets}`);
          if (s.masters) perf.push(`Masters: ${s.masters}`);
          const scaled = s.scaled_score ? `Scaled ${s.scaled_score}` : "";
          const pct = s.percentile ? `${s.percentile}th %ile` : "";
          const lex = s.lexile ? `Lexile ${s.lexile}` : "";
          const extra = [scaled, pct, lex, ...perf].filter(Boolean).join(", ");
          assessLines.push(`${s.date} – ${s.subject}${extra ? ` (${extra})` : ""}`);
        });
    }
    if (assessLines.length > 0) {
      results.push({
        id: "assessments",
        title: "Assessment Overview (MAP & STAAR)",
        body: assessLines.join("\n"),
      });
    }

    // 7. Attendance
    if (att && att.history && att.history.length > 0) {
      const total = att.history.reduce((sum, h) => sum + (h.days_absent || 0), 0);
      const lines: string[] = [];
      lines.push(`Documented absences across IEP years total approximately ${total} day(s).`);
      if (att.chronic_pattern) {
        lines.push("This reflects a chronic pattern of absenteeism (10%+ of the year in at least one year).");
      }
      if (att.improving) {
        lines.push("Most recent data suggest attendance is improving relative to prior years.");
      }
      if (att.housing_barriers) {
        lines.push("Records reference housing or transportation barriers contributing to absences.");
      }
      results.push({
        id: "attendance",
        title: "Attendance & Access to Instruction",
        body: lines.join(" \n"),
      });
    }

    // 8. Parent Input / Concerns
    const parentConcerns = data.deliberations?.parent_concerns || [];
    if (parentConcerns.length > 0) {
      results.push({
        id: "parent",
        title: "Parent Input & Concerns",
        body: parentConcerns.map(c => `• ${c}`).join("\n"),
      });
    }

    return results;
  }, []);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text) as DeepDiveData;
      setDeepDive(json);
      const built = buildBlocks(json);
      setBlocks(built);
    } catch (err) {
      console.error("Error loading Deep Dive JSON for Dlibs:", err);
      alert("Error parsing file. Please upload a valid Deep Dive JSON.");
    } finally {
      setIsLoading(false);
    }
  }, [buildBlocks]);

  const copyBlock = useCallback((block: DlibBlock) => {
    const text = `DELIBERATION – ${block.title}\n\n${block.body}`;
    navigator.clipboard.writeText(text);
    setCopiedId(block.id);
    setTimeout(() => setCopiedId(null), 1600);
  }, []);

  const copyAll = useCallback(() => {
    const text = blocks
      .map(b => `DELIBERATION – ${b.title}\n\n${b.body}`)
      .join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    setCopiedId("all");
    setTimeout(() => setCopiedId(null), 1600);
  }, [blocks]);

  const hasBlocks = useMemo(() => blocks.length > 0, [blocks]);

  return (
    <GalaxyShell>
      <div className="page w-full">
        {/* Hero */}
        <div className="mb-10">
          <div className="heroBrandRow">
            <div className="heroIconWrap">
              <img
                src="/brand/galexii-logo-round.png"
                alt="SpEdGalexii"
                width={140}
                height={140}
                className="heroIcon rounded-full bg-black"
              />
            </div>
            <div className="min-w-0 heroAura">
              <h1 className="heroTitle wrap-break-word">Dlibs – Deliberations Builder</h1>
              <p className="text-lg text-violet-200/90 font-medium mb-3 flex items-center gap-2">
                <Sparkles size={18} className="text-violet-300" />
                Turn Deep Dive data into ARD talking points
              </p>
              <p className="text-white/50 text-sm max-w-2xl">
                Upload a Deep Dive JSON to auto-build draft Deliberations ("Dlibs")
                grounded in evaluation dates, PLAAFP, SLD areas, grades, attendance,
                goals, MAP and STAAR results, and parent input.
              </p>
            </div>
          </div>
        </div>

        {/* Upload card */}
        <div className="galaxy-card popCard popCard--purple rounded-2xl p-6 mb-8">
          <h2 className="cardTitle text-purple-200 mb-4 flex items-center gap-2">
            <Upload size={20} className="text-purple-400" />
            Upload Deep Dive JSON
          </h2>

          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-purple-500/30 rounded-xl cursor-pointer hover:border-purple-400/60 hover:bg-purple-500/5 transition-all">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
                <FileText className="w-7 h-7 text-purple-400" />
              </div>
              <p className="mb-2 text-sm text-white/70">
                <span className="font-semibold text-purple-300">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-white/40">Deep Dive JSON file (DEEP_DIVE_*.json)</p>
            </div>
            <input type="file" className="hidden" accept=".json" onChange={handleUpload} />
          </label>

          {isLoading && <p className="mt-4 text-purple-400 text-center">Loading and synthesizing Dlibs...</p>}

          {deepDive && (
            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <p className="text-emerald-400 flex items-center gap-2">
                <span className="gx-status-done" />
                Loaded: {deepDive.student_info?.name || "Unknown Student"}
              </p>
              <p className="text-white/60 text-sm mt-1">
                {hasBlocks ? `${blocks.length} deliberation blocks ready to copy` : "No Dlibs yet – check JSON contents."}
              </p>
            </div>
          )}

          {hasBlocks && (
            <button
              onClick={copyAll}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-400/60 text-purple-100 text-sm hover:bg-purple-500/30 transition-colors"
            >
              <Copy size={16} />
              {copiedId === "all" ? "All Dlibs copied" : "Copy all Dlibs"}
            </button>
          )}
        </div>

        {/* Dlibs blocks */}
        {hasBlocks && (
          <div className="space-y-4">
            {blocks.map(block => (
              <div
                key={block.id}
                className="galaxy-card rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur-sm p-5 shadow-lg shadow-purple-500/20"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <Sparkles size={16} className="text-purple-300" />
                      {block.title}
                    </h3>
                  </div>
                  <button
                    onClick={() => copyBlock(block)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-white/10 bg-white/5 text-xs text-white/70 hover:bg-white/10"
                  >
                    <Copy size={12} />
                    {copiedId === block.id ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-sm text-white/80 whitespace-pre-line leading-relaxed">{block.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </GalaxyShell>
  );
}
