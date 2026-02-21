"use client";

/**
 * /ard-preview
 *
 * Live HTML mockup of every Galexii ARD slide so you can see the exact
 * look-and-feel before generating the .pptx download.
 *
 * Uses the same color tokens as the PPT generator:
 *   bgDeep  #0f0c29   bgMid   #1a1040   bgCard  #16103a
 *   violet  #9b5cfb   cyan    #22d3ee   mint    #34d399
 *   amber   #fbbf24   red     #f87171   white70 #b3b3cc
 */

import React, { useState } from "react";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import {
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Presentation,
  Download,
} from "lucide-react";
import Link from "next/link";

// ── Brand tokens (mirrors route.ts COLORS) ─────────────────────────────────
const C = {
  deep:   "#0f0c29",
  mid:    "#1a1040",
  card:   "#16103a",
  violet: "#9b5cfb",
  cyan:   "#22d3ee",
  mint:   "#34d399",
  amber:  "#fbbf24",
  red:    "#f87171",
  white:  "#ffffff",
  w70:    "#b3b3cc",
  w40:    "#6666aa",
  lavender: "#c4b5fd",
};

// ── Slide frame wrapper ────────────────────────────────────────────────────
function SlideFrame({
  children,
  accent = C.violet,
  num,
  active = false,
  onClick,
}: {
  children: React.ReactNode;
  accent?: string;
  num: number;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.deep,
        border: `2px solid ${active ? accent : "rgba(155,92,251,0.25)"}`,
        borderRadius: 12,
        overflow: "hidden",
        aspectRatio: "16/9",
        position: "relative",
        cursor: onClick ? "pointer" : "default",
        boxShadow: active ? `0 0 28px ${accent}55` : "0 4px 24px rgba(0,0,0,0.5)",
        transition: "all 0.2s",
        flexShrink: 0,
      }}
    >
      {/* top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, background: accent }} />
      {/* bottom bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: accent }} />
      {/* left stripe */}
      <div style={{ position: "absolute", top: 5, left: 0, width: 5, bottom: 4, background: accent, opacity: 0.7 }} />
      {/* slide number */}
      <div style={{ position: "absolute", bottom: 10, right: 12, fontSize: 10, color: C.w40, fontWeight: 700 }}>
        {num}
      </div>
      {/* inner glow */}
      <div style={{
        position: "absolute",
        top: "30%", left: "30%",
        width: "40%", height: "40%",
        borderRadius: "50%",
        background: accent,
        opacity: 0.05,
        filter: "blur(40px)",
        pointerEvents: "none",
      }} />
      <div style={{ padding: "12px 14px 8px 16px", height: "100%", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}

// ── Section header block ────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, accent = C.violet }: { title: string; subtitle?: string; accent?: string }) {
  return (
    <div style={{
      background: C.card,
      border: `1.5px solid ${accent}`,
      borderRadius: 6,
      padding: "5px 10px 5px 6px",
      marginBottom: 8,
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
    }}>
      <div style={{ width: 4, background: accent, borderRadius: 3, alignSelf: "stretch", flexShrink: 0, minHeight: 28 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.white, letterSpacing: -0.2, lineHeight: 1.3 }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 9, color: C.w70, marginTop: 1 }}>{subtitle}</div>
        )}
      </div>
    </div>
  );
}

// ── Body card ─────────────────────────────────────────────────────────────
function BodyCard({ children, accent = C.violet, style = {} }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.card,
      border: `0.5px solid ${accent}44`,
      borderRadius: 6,
      padding: "8px 10px",
      fontSize: 10,
      color: C.white,
      lineHeight: 1.55,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Two-column layout ─────────────────────────────────────────────────────
function TwoCol({ left, right, leftTitle, rightTitle, accent = C.cyan }: {
  left: React.ReactNode; right: React.ReactNode; leftTitle: string; rightTitle: string; accent?: string;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {[{ title: leftTitle, body: left }, { title: rightTitle, body: right }].map(({ title, body }) => (
        <div key={title} style={{
          background: C.card,
          border: `0.5px solid ${accent}55`,
          borderRadius: 6,
          padding: "6px 8px",
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: accent, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 10, color: C.white, lineHeight: 1.5 }}>{body}</div>
        </div>
      ))}
    </div>
  );
}

// ── Pill / badge ──────────────────────────────────────────────────────────
function Pill({ label, color = C.violet }: { label: string; color?: string }) {
  return (
    <span style={{
      display: "inline-block",
      background: `${color}22`,
      border: `1px solid ${color}55`,
      borderRadius: 20,
      padding: "1px 8px",
      fontSize: 9,
      color,
      fontWeight: 600,
      marginRight: 4,
      marginBottom: 3,
    }}>
      {label}
    </span>
  );
}

// ── Checkmark row ─────────────────────────────────────────────────────────
function CheckRow({ label, checked = true, color = C.mint }: { label: string; checked?: boolean; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
      <span style={{ color: checked ? color : C.w40, fontSize: 11, lineHeight: 1 }}>{checked ? "✓" : "○"}</span>
      <span style={{ fontSize: 10, color: checked ? C.white : C.w70 }}>{label}</span>
    </div>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────
function ScoreBar({ label, score, max = 100, color = C.cyan }: { label: string; score: number; max?: number; color?: string }) {
  const pct = Math.min(100, (score / max) * 100);
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.w70, marginBottom: 2 }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{score}</span>
      </div>
      <div style={{ background: `${color}22`, borderRadius: 4, height: 5 }}>
        <div style={{ background: color, borderRadius: 4, height: 5, width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Confidentiality footer ─────────────────────────────────────────────────
function ConfidFoot({ name = "STUDENT NAME" }: { name?: string }) {
  return (
    <div style={{
      position: "absolute", bottom: 10, left: 14, right: 24,
      fontSize: 7, color: C.w40, textAlign: "center", letterSpacing: 0.3,
    }}>
      CONFIDENTIAL — {name.toUpperCase()} — ARD DELIBERATIONS — NOT A PUBLIC RECORD
    </div>
  );
}

// ─── Individual slide definitions ──────────────────────────────────────────

type Slide = {
  num: number;
  label: string;
  accent: string;
  render: () => React.ReactNode;
};

const STUDENT = "Alex Rivera";
const SID = "10178924";
const TODAY = "February 21, 2026";

const SLIDES: Slide[] = [
  {
    num: 1, label: "Title Slide", accent: C.violet,
    render: () => (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "88%", gap: 0 }}>
        {/* orbit ring */}
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          border: `2px solid ${C.violet}`,
          background: C.card,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, marginBottom: 8,
          boxShadow: `0 0 18px ${C.violet}44`,
        }}>✦</div>
        <div style={{ fontSize: 10, color: C.cyan, letterSpacing: 3, fontWeight: 600, marginBottom: 4 }}>
          SpEdGalexii
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.white, textAlign: "center", textShadow: `0 0 20px ${C.violet}`, marginBottom: 4 }}>
          {STUDENT}
        </div>
        <div style={{ fontSize: 11, color: C.lavender, marginBottom: 6, textAlign: "center" }}>
          Grade 7  •  Specific Learning Disability  •  ID: {SID}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.amber, marginBottom: 3 }}>
          ARD Annual Meeting
        </div>
        <div style={{ fontSize: 10, color: C.w70, marginBottom: 12 }}>{TODAY}</div>
        <div style={{
          background: C.card, border: `1px solid ${C.red}`,
          borderRadius: 5, padding: "3px 16px", fontSize: 7,
          color: C.red, fontWeight: 700, letterSpacing: 1,
        }}>
          CONFIDENTIAL — ARD DELIBERATIONS — NOT A PUBLIC RECORD
        </div>
      </div>
    ),
  },
  {
    num: 2, label: "Eligibility & Impact", accent: C.violet,
    render: () => (
      <>
        <SectionHeader title="Eligibility & Impact of Disability" subtitle="How disability impacts access to general curriculum" accent={C.violet} />
        <BodyCard accent={C.violet}>
          <div style={{ marginBottom: 6 }}>
            <Pill label="Specific Learning Disability" color={C.violet} />
            <Pill label="Other Health Impairment" color={C.cyan} />
          </div>
          <div style={{ color: C.w70, fontSize: 9, marginBottom: 6 }}>
            Alex is eligible for special education under IDEA under the category of Specific Learning Disability,
            impacting reading fluency, reading comprehension, and written expression. A secondary eligibility
            of Other Health Impairment (ADHD) was confirmed in the most recent FIE.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.cyan, marginBottom: 3 }}>IDEA Categories Considered</div>
              <CheckRow label="Specific Learning Disability" color={C.violet} />
              <CheckRow label="Other Health Impairment" color={C.cyan} />
              <CheckRow label="Emotional Disturbance" checked={false} />
              <CheckRow label="Intellectual Disability" checked={false} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.amber, marginBottom: 3 }}>Impact Areas</div>
              <CheckRow label="Reading / ELA" color={C.amber} />
              <CheckRow label="Written Language" color={C.amber} />
              <CheckRow label="Attention & Executive Function" color={C.amber} />
              <CheckRow label="Math" checked={false} />
            </div>
          </div>
        </BodyCard>
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 3, label: "FIE & REED", accent: C.cyan,
    render: () => (
      <>
        <SectionHeader title="Evaluation History, FIE & REED" subtitle="Full Individual Evaluation and Review of Existing Evaluation Data" accent={C.cyan} />
        <TwoCol
          leftTitle="📋 FIE / FIIE"
          left={
            <>
              <CheckRow label="Evaluator: Dr. M. Garza, LSSP" color={C.cyan} />
              <CheckRow label="Consent Date: 09/04/2024" color={C.cyan} />
              <CheckRow label="Eval Date: 10/15/2024" color={C.cyan} />
              <CheckRow label="Re-eval Due: 10/15/2027" color={C.mint} />
              <div style={{ marginTop: 5 }}>
                <div style={{ fontSize: 9, color: C.w70, marginBottom: 2 }}>Tests Administered</div>
                <Pill label="WISC-V" color={C.cyan} />
                <Pill label="WJ-IV" color={C.cyan} />
                <Pill label="BASC-3" color={C.cyan} />
                <Pill label="CTOPP-2" color={C.cyan} />
              </div>
            </>
          }
          rightTitle="🔄 REED"
          right={
            <>
              <CheckRow label="REED Date: 01/10/2025" color={C.mint} />
              <CheckRow label="Parent Notified: ✓" color={C.mint} />
              <CheckRow label="No Additional Data Needed" color={C.mint} />
              <CheckRow label="Eligibility Continues" color={C.mint} />
              <div style={{ marginTop: 5, fontSize: 9, color: C.w70 }}>
                Existing data reviewed: STAAR, MAP, report cards, teacher input, progress monitoring
              </div>
            </>
          }
          accent={C.cyan}
        />
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 4, label: "Student Strengths", accent: C.mint,
    render: () => (
      <>
        <SectionHeader title="Student Strengths" subtitle="Academic, behavioral, and social-emotional assets" accent={C.mint} />
        <BodyCard accent={C.mint}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.mint, marginBottom: 4 }}>Academic Strengths</div>
              <CheckRow label="Strong verbal reasoning (WISC-V VCI: 105)" color={C.mint} />
              <CheckRow label="Mathematical problem-solving" color={C.mint} />
              <CheckRow label="Visual-spatial processing" color={C.mint} />
              <CheckRow label="Science content knowledge" color={C.mint} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.cyan, marginBottom: 4 }}>Behavioral & Social</div>
              <CheckRow label="Positive peer relationships" color={C.cyan} />
              <CheckRow label="Motivated when engaged" color={C.cyan} />
              <CheckRow label="Responds well to praise" color={C.cyan} />
              <CheckRow label="Family is highly involved" color={C.cyan} />
            </div>
          </div>
          <div style={{ marginTop: 8, fontSize: 9, color: C.w70, fontStyle: "italic", borderTop: `1px solid ${C.mint}33`, paddingTop: 6 }}>
            "Alex shows genuine curiosity and persistence when given appropriate scaffolding. 
             Strengths in verbal reasoning and math are a strong foundation for goal-setting."
          </div>
        </BodyCard>
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 5, label: "Areas of Growth", accent: C.amber,
    render: () => (
      <>
        <SectionHeader title="Areas of Growth / Needs (PLAAFP)" subtitle="Present levels of academic achievement and functional performance" accent={C.amber} />
        <BodyCard accent={C.amber}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              {[
                { domain: "Reading/ELA", summary: "Reading at ~4th grade level. Decoding: 78 SS, Fluency: 72 SS" },
                { domain: "Written Expression", summary: "Written expression at 5th grade. Organization and grammar needs" },
                { domain: "Math", summary: "Performing on grade level. Calculation: 98 SS, Problem Solving: 94 SS" },
              ].map(({ domain, summary }) => (
                <div key={domain} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.amber }}>{domain}</div>
                  <div style={{ fontSize: 9, color: C.w70 }}>{summary}</div>
                </div>
              ))}
            </div>
            <div>
              {[
                { domain: "Attention/Executive Function", summary: "BASC-3 Attention: Clinically Significant. Difficulty sustaining focus >15 min" },
                { domain: "Speech/Language", summary: "Not evaluated this cycle. Previous CELF-5: Core: 88 SS" },
                { domain: "Adaptive Behavior", summary: "Age-appropriate daily living skills per parent report" },
              ].map(({ domain, summary }) => (
                <div key={domain} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: C.amber }}>{domain}</div>
                  <div style={{ fontSize: 9, color: C.w70 }}>{summary}</div>
                </div>
              ))}
            </div>
          </div>
        </BodyCard>
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 6, label: "Student & Parent Input", accent: C.violet,
    render: () => (
      <>
        <SectionHeader title="Student & Parent Input" subtitle="Concerns, hopes, and priorities shared by the family" accent={C.violet} />
        <TwoCol
          leftTitle="👤 Student"
          left={
            <div style={{ color: C.w70, fontSize: 9, fontStyle: "italic" }}>
              "I want to be able to read like my friends. I like science and video games.
              I want to get better at writing so I can tell my stories."
              <div style={{ marginTop: 8, color: C.lavender, fontStyle: "normal" }}>
                Priority: Reading fluency, social participation
              </div>
            </div>
          }
          rightTitle="👪 Parent / Guardian"
          right={
            <div style={{ color: C.w70, fontSize: 9, fontStyle: "italic" }}>
              "We want Alex to have the accommodations he needs on STAAR and in class.
              We're concerned about the transition to 8th grade. We want weekly progress reports."
              <div style={{ marginTop: 8, color: C.lavender, fontStyle: "normal" }}>
                Priority: Communication, testing accommodations, transition planning
              </div>
            </div>
          }
          accent={C.violet}
        />
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 7, label: "Teacher Feedback", accent: C.cyan,
    render: () => (
      <>
        <SectionHeader title="Teacher Feedback" subtitle="Cross-subject observations and behavioral reports" accent={C.cyan} />
        <BodyCard accent={C.cyan}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[
              { teacher: "ELA – Ms. Johnson", note: "Below grade in fluency/comprehension. Responds to graphic organizers. Needs extended time consistently." },
              { teacher: "Math – Mr. Torres", note: "On-grade performance. Shows strong reasoning. Occasionally off-task but recovers quickly." },
              { teacher: "Science – Ms. Park", note: "Strong participation. Written work is below level. Verbal contributions are excellent." },
            ].map(({ teacher, note }) => (
              <div key={teacher} style={{ background: `${C.cyan}11`, borderRadius: 5, padding: "6px 8px" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: C.cyan, marginBottom: 3 }}>{teacher}</div>
                <div style={{ fontSize: 9, color: C.w70 }}>{note}</div>
              </div>
            ))}
          </div>
        </BodyCard>
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 8, label: "Grades", accent: C.amber,
    render: () => (
      <>
        <SectionHeader title="Grades – Prior & Current Year" subtitle="Academic performance by grading period" accent={C.amber} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            {
              year: "2023–2024 (Prior Year)",
              rows: [["ELA 6", "72", "68", "71", "74"], ["Math 6", "88", "85", "90", "92"], ["Science 6", "80", "78", "82", "85"]],
            },
            {
              year: "2024–2025 (Current)",
              rows: [["ELA 7", "70", "74", "—", "—"], ["Math 7", "91", "89", "—", "—"], ["Science 7", "84", "87", "—", "—"]],
            },
          ].map(({ year, rows }) => (
            <div key={year} style={{ background: C.card, borderRadius: 6, overflow: "hidden", border: `0.5px solid ${C.amber}44` }}>
              <div style={{ background: `${C.amber}22`, padding: "4px 8px", fontSize: 9, fontWeight: 700, color: C.amber }}>{year}</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9 }}>
                <thead>
                  <tr style={{ color: C.w40 }}>
                    <td style={{ padding: "3px 8px" }}>Course</td>
                    <td style={{ textAlign: "center", padding: "3px 4px" }}>Q1</td>
                    <td style={{ textAlign: "center", padding: "3px 4px" }}>Q2</td>
                    <td style={{ textAlign: "center", padding: "3px 4px" }}>Q3</td>
                    <td style={{ textAlign: "center", padding: "3px 4px" }}>Q4</td>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([course, q1, q2, q3, q4]) => (
                    <tr key={course} style={{ borderTop: `0.5px solid ${C.amber}22` }}>
                      <td style={{ padding: "3px 8px", color: C.white }}>{course}</td>
                      {[q1, q2, q3, q4].map((v, i) => (
                        <td key={i} style={{ textAlign: "center", padding: "3px 4px", color: v === "—" ? C.w40 : Number(v) >= 70 ? C.mint : C.red, fontWeight: 600 }}>{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 9, label: "Attendance", accent: C.amber,
    render: () => (
      <>
        <SectionHeader title="Attendance / Absences" subtitle="Attendance patterns and impact on learning" accent={C.amber} />
        <BodyCard accent={C.amber}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
            {[
              { label: "Total Days", value: "172", sub: "enrolled" },
              { label: "Absences", value: "18", sub: "days missed", color: C.red },
              { label: "Attendance Rate", value: "89.5%", sub: "below 90% threshold", color: C.amber },
              { label: "Tardies", value: "7", sub: "this year" },
            ].map(({ label, value, sub, color = C.white }) => (
              <div key={label} style={{ background: `${C.amber}11`, borderRadius: 5, padding: "6px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: 8, fontWeight: 600, color: C.w70, marginTop: 1 }}>{label}</div>
                <div style={{ fontSize: 7, color: C.w40 }}>{sub}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 9, color: C.w70 }}>
            ⚠️ Attendance below 90% may qualify as a factor in educational impact. Patterns of absences
            cluster around Mondays and Fridays, suggesting possible avoidance behavior. Team should discuss
            whether a functional assessment is warranted.
          </div>
        </BodyCard>
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 10, label: "Dyslexia / Reading", accent: C.cyan,
    render: () => (
      <>
        <SectionHeader title="Dyslexia / Reading Services Progression" subtitle="Identification, services, and phonological awareness data" accent={C.cyan} />
        <TwoCol
          leftTitle="📖 Dyslexia Profile"
          left={
            <>
              <CheckRow label="Dyslexia Risk Identified: Yes" color={C.cyan} />
              <CheckRow label="Dyslexia Instructional Program: Active" color={C.cyan} />
              <CheckRow label="CTOPP-2 Phonological Memory: 78 SS" color={C.cyan} />
              <CheckRow label="CTOPP-2 Rapid Naming: 72 SS" color={C.cyan} />
              <CheckRow label="GORT-5 Fluency: 3rd %ile" color={C.amber} />
            </>
          }
          rightTitle="📈 Progress in Services"
          right={
            <>
              <div style={{ fontSize: 9, fontWeight: 600, color: C.w70, marginBottom: 4 }}>Dyslexia Program – Progress</div>
              <ScoreBar label="Decoding (DIBELS)" score={62} max={100} color={C.cyan} />
              <ScoreBar label="Phonemic Awareness" score={71} max={100} color={C.mint} />
              <ScoreBar label="Oral Reading Fluency" score={55} max={100} color={C.amber} />
              <div style={{ fontSize: 8, color: C.w40, marginTop: 4 }}>Scores shown as percentile-equivalent. Target ≥ 70.</div>
            </>
          }
          accent={C.cyan}
        />
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 11, label: "STAAR Performance", accent: C.violet,
    render: () => (
      <>
        <SectionHeader title="STAAR Performance & Focus" subtitle="State assessment history and instructional implications" accent={C.violet} />
        <BodyCard accent={C.violet}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 9, marginBottom: 8 }}>
            <thead>
              <tr style={{ color: C.w40, borderBottom: `1px solid ${C.violet}33` }}>
                {["Year", "Subject", "Grade", "Performance Level", "Score", "Accommodations Used"].map(h => (
                  <td key={h} style={{ padding: "3px 6px", fontWeight: 600 }}>{h}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["2022–23", "Reading", "5", "Did Not Meet", "1,315", "Extended time, read aloud"],
                ["2023–24", "Reading", "6", "Approaches", "1,482", "Extended time, read aloud, separate setting"],
                ["2023–24", "Math",    "6", "Meets",        "1,548", "Extended time, calculator"],
                ["2024–25", "Reading", "7", "Projected",    "—",     "See current accommodations"],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: `0.5px solid ${C.violet}22` }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{
                      padding: "3px 6px",
                      color: j === 3 ? (cell === "Meets" ? C.mint : cell === "Did Not Meet" ? C.red : cell === "Projected" ? C.amber : C.w70) : C.white,
                      fontWeight: j === 3 ? 700 : 400,
                    }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 8, color: C.w40, fontStyle: "italic" }}>
            Reading performance shows upward trend from Not Met → Approaches. Target: Meets in 2024–25.
          </div>
        </BodyCard>
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 12, label: "MAP Performance", accent: C.mint,
    render: () => (
      <>
        <SectionHeader title="MAP / NWEA Performance & Projections" subtitle="RIT scores, percentile rankings, and growth projections" accent={C.mint} />
        <BodyCard accent={C.mint}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.mint, marginBottom: 6 }}>Reading RIT History</div>
              <ScoreBar label="Fall 2022 (Gr 5)" score={56} max={100} color={C.w40} />
              <ScoreBar label="Spring 2023 (Gr 5)" score={62} max={100} color={C.w70} />
              <ScoreBar label="Fall 2023 (Gr 6)" score={67} max={100} color={C.cyan} />
              <ScoreBar label="Spring 2024 (Gr 6)" score={71} max={100} color={C.mint} />
              <div style={{ fontSize: 8, color: C.w40, marginTop: 4 }}>
                RIT normalized to 100-pt scale. Actual RIT: 201 → 208 → 213 → 216
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.cyan, marginBottom: 6 }}>Current Status</div>
              {[
                { label: "Reading RIT", value: "216", sub: "28th %ile  •  Spring '24" },
                { label: "Math RIT", value: "228", sub: "54th %ile  •  Spring '24" },
                { label: "Growth (Reading)", value: "+7 RIT", sub: "Expected: +4.2" },
                { label: "Lexile Estimate", value: "640L", sub: "Target: 820L for Gr 7" },
              ].map(({ label, value, sub }) => (
                <div key={label} style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `0.5px solid ${C.mint}22`, paddingBottom: 4 }}>
                  <div>
                    <div style={{ fontSize: 9, color: C.w70 }}>{label}</div>
                    <div style={{ fontSize: 7, color: C.w40 }}>{sub}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.mint }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </BodyCard>
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 13, label: "Prior Year Goals", accent: C.cyan,
    render: () => (
      <>
        <SectionHeader title="Progress on Prior Year Goals" subtitle="Annual goal mastery data from previous IEP" accent={C.cyan} />
        <BodyCard accent={C.cyan}>
          {[
            { goal: "Reading Fluency — Alex will read 120 wcpm with 95% accuracy given a grade-level passage.", status: "In Progress", pct: 72, note: "Current: 87 wcpm. Consistent growth but target not yet met." },
            { goal: "Written Expression — Alex will write a 5-sentence paragraph with intro, 3 details, and conclusion with 80% accuracy.", status: "Mastered", pct: 100, note: "Met 09/2024. Strong paragraph structure observed across subjects." },
            { goal: "Reading Comprehension — Alex will answer literal and inferential questions with 75% accuracy.", status: "In Progress", pct: 60, note: "Current: 63%. Inferential questions remain a challenge." },
          ].map(({ goal, status, pct, note }) => (
            <div key={goal} style={{ marginBottom: 8, borderBottom: `0.5px solid ${C.cyan}22`, paddingBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                <div style={{ fontSize: 9, color: C.white, flex: 1, paddingRight: 12 }}>{goal}</div>
                <Pill label={status} color={status === "Mastered" ? C.mint : C.amber} />
              </div>
              <div style={{ background: `${C.cyan}22`, borderRadius: 3, height: 5, marginBottom: 3 }}>
                <div style={{ background: pct === 100 ? C.mint : C.cyan, borderRadius: 3, height: 5, width: `${pct}%` }} />
              </div>
              <div style={{ fontSize: 8, color: C.w40 }}>{note}</div>
            </div>
          ))}
        </BodyCard>
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 14, label: "New Annual Goals", accent: C.mint,
    render: () => (
      <>
        <SectionHeader title="New Annual Goals" subtitle="Proposed goals with all 4 TEA required components" accent={C.mint} />
        <BodyCard accent={C.mint}>
          {[
            {
              num: "G1", area: "Reading Fluency", color: C.mint,
              text: "By the end of the IEP period, given a grade-level reading passage, Alex will read aloud at 130 words per minute with ≥95% accuracy on 4 out of 5 probes.",
              components: ["✓ Timeframe", "✓ Condition", "✓ Behavior", "✓ Criterion"],
            },
            {
              num: "G2", area: "Reading Comprehension", color: C.cyan,
              text: "Given a leveled informational text, Alex will answer inferential comprehension questions with 80% accuracy across 3 consecutive probes by the end of the IEP year.",
              components: ["✓ Timeframe", "✓ Condition", "✓ Behavior", "✓ Criterion"],
            },
          ].map(({ num: gn, area, color, text, components }) => (
            <div key={gn} style={{ marginBottom: 8, borderLeft: `3px solid ${color}`, paddingLeft: 8 }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color }}>{gn}</span>
                <Pill label={area} color={color} />
                {components.map(c => <span key={c} style={{ fontSize: 7, color: C.mint }}>{c}</span>)}
              </div>
              <div style={{ fontSize: 9, color: C.w70 }}>{text}</div>
            </div>
          ))}
        </BodyCard>
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 15, label: "Accommodations", accent: C.violet,
    render: () => (
      <>
        <SectionHeader title="Accommodations – Classroom & Testing" subtitle="Instructional and state/district testing accommodations" accent={C.violet} />
        <TwoCol
          leftTitle="📚 Classroom Accommodations"
          left={
            <>
              {["Extended time (1.5×) on all assignments", "Preferential seating (front, away from distractions)", "Chunked directions (no more than 2 steps)", "Copy of notes / graphic organizers provided", "Check-ins every 20 minutes", "Read-aloud for written directions"].map(a => (
                <CheckRow key={a} label={a} color={C.violet} />
              ))}
            </>
          }
          rightTitle="📝 State/District Testing"
          right={
            <>
              {["Extended time — time and a half (STAAR)", "Oral administration — read aloud", "Separate setting / small group", "Breaks as needed", "Scratch paper", "Math: Four-function calculator"].map(a => (
                <CheckRow key={a} label={a} color={C.cyan} />
              ))}
            </>
          }
          accent={C.violet}
        />
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 16, label: "Assistive Technology", accent: C.cyan,
    render: () => (
      <>
        <SectionHeader title="Assistive Technology" subtitle="Devices, software, and supports considered and recommended" accent={C.cyan} />
        <TwoCol
          leftTitle="✅ AT Considered"
          left={
            <>
              <CheckRow label="Text-to-speech software (considered)" color={C.cyan} />
              <CheckRow label="Speech-to-text for written assignments" color={C.cyan} />
              <CheckRow label="Word prediction software" color={C.cyan} />
              <CheckRow label="Digital graphic organizer tools" color={C.cyan} />
              <CheckRow label="FM system / hearing loop" checked={false} />
              <div style={{ marginTop: 6, fontSize: 8, color: C.w40 }}>
                AT needs re-evaluated based on current SDI goals.
              </div>
            </>
          }
          rightTitle="🖥 Provided / Active"
          right={
            <>
              <div style={{ fontSize: 9, color: C.white, marginBottom: 4 }}>
                <Pill label="Read&Write for Google" color={C.cyan} />
                <Pill label="Co:Writer" color={C.mint} />
              </div>
              <div style={{ fontSize: 9, color: C.w70 }}>
                Student is proficient in Read&Write. Co:Writer is being trialed for written expression goals.
                No high-tech AAC needs identified at this time.
              </div>
              <div style={{ marginTop: 6 }}>
                <CheckRow label="AT training for student: Complete" color={C.mint} />
                <CheckRow label="AT training for parent: In progress" color={C.amber} />
              </div>
            </>
          }
          accent={C.cyan}
        />
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 17, label: "LRE / Placement", accent: C.amber,
    render: () => (
      <>
        <SectionHeader title="LRE, Academic Placement, AIP & ESY" subtitle="Least Restrictive Environment and supplementary aids determination" accent={C.amber} />
        <BodyCard accent={C.amber}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.amber, marginBottom: 5 }}>LRE Placement</div>
              {[
                { label: "General Ed %", value: "80%", color: C.mint },
                { label: "Special Ed (Pull-out)", value: "20%", color: C.amber },
                { label: "Minutes/Day (SDI)", value: "90 min", color: C.cyan },
                { label: "Setting", value: "Resource Room (ELA)" },
              ].map(({ label, value, color = C.white }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 9 }}>
                  <span style={{ color: C.w70 }}>{label}</span>
                  <span style={{ color, fontWeight: 700 }}>{value}</span>
                </div>
              ))}
              <div style={{ fontSize: 8, color: C.w40, marginTop: 4, fontStyle: "italic" }}>
                Nonparticipation justified: Intensive reading support requires small-group instruction
                in a structured setting that cannot be replicated in general education.
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.cyan, marginBottom: 5 }}>ESY & AIP</div>
              <CheckRow label="ESY Considered: Yes" color={C.cyan} />
              <CheckRow label="ESY Eligible: No — data does not indicate regression" color={C.mint} />
              <CheckRow label="AIP Active: Yes (reading)" color={C.amber} />
              <div style={{ fontSize: 9, fontWeight: 700, color: C.mint, marginBottom: 3, marginTop: 8 }}>Supplementary Aids</div>
              <CheckRow label="Peer support / co-teaching in science" color={C.mint} />
              <CheckRow label="Structured flexible grouping" color={C.mint} />
            </div>
          </div>
        </BodyCard>
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 18, label: "Comp & Transportation", accent: C.violet,
    render: () => (
      <>
        <SectionHeader title="Compensatory Services & Transportation" subtitle="Compensatory education and transportation needs" accent={C.violet} />
        <TwoCol
          leftTitle="📋 Compensatory Services"
          left={
            <>
              <CheckRow label="Compensatory services considered" color={C.violet} />
              <CheckRow label="No services owed at this time" color={C.mint} />
              <CheckRow label="Prior year services: Fully delivered" color={C.mint} />
              <div style={{ fontSize: 8, color: C.w40, marginTop: 6 }}>
                No COVID-era or absence-related compensatory hours pending.
                All SDI services were delivered as documented.
              </div>
            </>
          }
          rightTitle="🚌 Transportation"
          right={
            <>
              <CheckRow label="Special transportation considered" color={C.violet} />
              <CheckRow label="Transportation as related service: No" checked={false} />
              <CheckRow label="Student uses regular bus route" color={C.mint} />
              <div style={{ fontSize: 8, color: C.w40, marginTop: 6 }}>
                No transportation-related disability accommodations required at this time.
                Parent transports on days of small-group testing.
              </div>
            </>
          }
          accent={C.violet}
        />
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 19, label: "Transition Planning", accent: C.mint,
    render: () => (
      <>
        <SectionHeader title="Transition & Post-Secondary Goals" subtitle="Age-appropriate transition assessments and post-secondary planning (age 14+)" accent={C.mint} />
        <TwoCol
          leftTitle="🎓 Post-Secondary Goals"
          left={
            <>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.mint, marginBottom: 3 }}>Education / Training</div>
              <div style={{ fontSize: 9, color: C.w70, marginBottom: 8 }}>After graduating high school, Alex will enroll in a community college or vocational program in technology or gaming design.</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.cyan, marginBottom: 3 }}>Employment</div>
              <div style={{ fontSize: 9, color: C.w70, marginBottom: 8 }}>Alex will obtain part-time employment in a technology or creative field by age 18.</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.amber, marginBottom: 3 }}>Independent Living</div>
              <div style={{ fontSize: 9, color: C.w70 }}>Alex will demonstrate self-advocacy skills and independently manage daily living tasks.</div>
            </>
          }
          rightTitle="🗺 Course of Study"
          right={
            <>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.lavender, marginBottom: 5 }}>Credits / Diploma Track</div>
              {[
                { label: "Diploma Track", value: "Distinguished Achievement" },
                { label: "Current Credits", value: "5.0" },
                { label: "Required Credits", value: "26" },
                { label: "On Track", value: "Yes" },
                { label: "Agency Linkages", value: "DARS – referral pending" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 9 }}>
                  <span style={{ color: C.w70 }}>{label}</span>
                  <span style={{ color: C.white, fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </>
          }
          accent={C.mint}
        />
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
  {
    num: 20, label: "Consent & Closing", accent: C.mint,
    render: () => (
      <>
        <SectionHeader title="Medicaid, 5-Day Waiver, Consent & Closing" subtitle="Parental consent, billing authorization, and meeting closure" accent={C.mint} />
        <BodyCard accent={C.mint}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.mint, marginBottom: 5 }}>Consent & Rights</div>
              <CheckRow label="Parent rights provided" color={C.mint} />
              <CheckRow label="IEP consent obtained" color={C.mint} />
              <CheckRow label="5-Day Prior Written Notice issued" color={C.mint} />
              <CheckRow label="Medicaid consent discussed" color={C.cyan} />
              <CheckRow label="Medicaid: Parent declined at this time" checked={false} color={C.amber} />
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.cyan, marginBottom: 5 }}>Closing Notes</div>
              <div style={{ fontSize: 9, color: C.w70, marginBottom: 6 }}>
                The committee reviewed all items on the agenda. All required team members were present.
                Parent questions were addressed. Next ARD is scheduled for February 2027.
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.lavender, marginBottom: 3 }}>IEP Dates</div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
                <span style={{ color: C.w70 }}>Start Date:</span>
                <span style={{ color: C.white }}>Feb 21, 2026</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
                <span style={{ color: C.w70 }}>End Date:</span>
                <span style={{ color: C.white }}>Feb 20, 2027</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 10, background: `${C.mint}11`, borderRadius: 5, padding: "6px 10px", textAlign: "center", fontSize: 8, color: C.w70, borderTop: `1px solid ${C.mint}33` }}>
            Generated by SpEdGalexii  •  spedgalexii.com  •  {TODAY}  •  FOR ARD USE ONLY
          </div>
        </BodyCard>
        <ConfidFoot name={STUDENT} />
      </>
    ),
  },
];

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ARDPreviewPage() {
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<"single" | "grid">("single");

  const slide = SLIDES[active]!;

  return (
    <GalaxyShell>
      <div className="mx-auto max-w-5xl space-y-4 py-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-violet-400/30 bg-violet-500/10">
              <Presentation className="h-5 w-5 text-violet-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ARD Slide Preview</h1>
              <p className="text-xs text-white/50">Galexii deep-space design — 20-slide ARD deck</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(m => m === "single" ? "grid" : "single")}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:text-white transition"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              {mode === "single" ? "Grid view" : "Single view"}
            </button>
            <Link
              href="/packets"
              className="flex items-center gap-1.5 rounded-lg bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-400 transition"
            >
              <Download className="h-3.5 w-3.5" />
              Generate .pptx
            </Link>
          </div>
        </div>

        {mode === "single" ? (
          <>
            {/* Single slide view */}
            <div
              style={{
                background: C.deep,
                border: `2px solid ${slide.accent}`,
                borderRadius: 16,
                overflow: "hidden",
                aspectRatio: "16/9",
                position: "relative",
                boxShadow: `0 0 40px ${slide.accent}33`,
                fontFamily: "Calibri, 'Segoe UI', sans-serif",
              }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: slide.accent }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 5, background: slide.accent }} />
              <div style={{ position: "absolute", top: 6, left: 0, width: 6, bottom: 5, background: slide.accent, opacity: 0.7 }} />
              {/* glow */}
              <div style={{ position: "absolute", top: "25%", left: "25%", width: "50%", height: "50%", borderRadius: "50%", background: slide.accent, opacity: 0.04, filter: "blur(60px)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: 14, right: 16, fontSize: 12, color: "#6666aa", fontWeight: 700 }}>{slide.num}</div>
              <div style={{ padding: "14px 18px 10px 20px", height: "100%", boxSizing: "border-box", overflow: "hidden" }}>
                {slide.render()}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActive(a => Math.max(0, a - 1))}
                disabled={active === 0}
                className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/70 hover:text-white disabled:opacity-30 transition"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>

              <div className="flex items-center gap-1.5 overflow-x-auto max-w-sm">
                {SLIDES.map((s, i) => (
                  <button
                    key={s.num}
                    onClick={() => setActive(i)}
                    style={{ background: i === active ? s.accent : undefined, borderColor: i === active ? s.accent : undefined }}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-bold transition
                      ${i === active ? "text-white" : "border border-white/15 bg-white/5 text-white/40 hover:text-white/70"}`}
                  >
                    {s.num}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setActive(a => Math.min(SLIDES.length - 1, a + 1))}
                disabled={active === SLIDES.length - 1}
                className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/70 hover:text-white disabled:opacity-30 transition"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Slide label */}
            <div className="text-center text-sm text-white/50">
              Slide {slide.num} of 20 — <span className="text-white/80 font-semibold">{slide.label}</span>
            </div>
          </>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {SLIDES.map((s, i) => (
              <div key={s.num} className="space-y-1">
                <div
                  style={{ fontFamily: "Calibri, 'Segoe UI', sans-serif", aspectRatio: "16/9", overflow: "hidden", position: "relative" }}
                  className="rounded-lg cursor-pointer"
                  onClick={() => { setActive(i); setMode("single"); }}
                >
                  <SlideFrame num={s.num} accent={s.accent} active={active === i}>
                    <div style={{ transform: "scale(0.42)", transformOrigin: "top left", width: "238%", height: "238%", pointerEvents: "none" }}>
                      {s.render()}
                    </div>
                  </SlideFrame>
                </div>
                <div className="text-center text-xs text-white/50">{s.num}. {s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-xs text-white/50 text-center">
          This is a <strong className="text-white/70">sample preview</strong> with placeholder data.{" "}
          Run <strong className="text-violet-300">Deep Space</strong> on a real student first, then{" "}
          <Link href="/packets" className="text-violet-300 hover:text-violet-200 underline underline-offset-2">generate the .pptx</Link>{" "}
          to get every slide filled with that student&apos;s actual data.
        </div>

      </div>
    </GalaxyShell>
  );
}
