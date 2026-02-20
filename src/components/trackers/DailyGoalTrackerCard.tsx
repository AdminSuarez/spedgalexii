"use client";

import React, { useMemo, useState } from "react";
import { blankDaily, type DailyTracker, type StudentRef, ymd } from "@/lib/trackers";
import { exportTrackerToXlsx } from "@/lib/exportXlsx";
import { GXCard } from "@/components/ui/GXCard";

type ScheduleType = "block" | "full-45" | "full-55";

const SCHEDULE_OPTIONS: { key: ScheduleType; label: string; periodLength: number }[] = [
  { key: "block", label: "Block Schedule (90 min)", periodLength: 90 },
  { key: "full-45", label: "Full Schedule (45 min)", periodLength: 45 },
  { key: "full-55", label: "Full Schedule (55 min)", periodLength: 55 },
];

// Block schedule: A Day and B Day
const A_DAY_PERIODS = [
  { key: "advisory", label: "Advisory", color: "text-white/80" },
  { key: "period_1", label: "1st", color: "text-amber-300" },
  { key: "period_2", label: "2nd", color: "text-emerald-300" },
  { key: "period_3", label: "3rd", color: "text-cyan-300" },
  { key: "period_4", label: "4th", color: "text-violet-300" },
] as const;

const B_DAY_PERIODS = [
  { key: "advisory", label: "Advisory", color: "text-white/80" },
  { key: "period_5", label: "5th", color: "text-pink-300" },
  { key: "period_6", label: "6th", color: "text-orange-300" },
  { key: "period_7", label: "7th", color: "text-blue-300" },
  { key: "period_8", label: "8th", color: "text-rose-300" },
] as const;

// Full schedule: all periods
const FULL_SCHEDULE_PERIODS = [
  { key: "period_1", label: "1st", color: "text-amber-300" },
  { key: "period_2", label: "2nd", color: "text-emerald-300" },
  { key: "period_3", label: "3rd", color: "text-cyan-300" },
  { key: "period_4", label: "4th", color: "text-violet-300" },
  { key: "period_5", label: "5th", color: "text-pink-300" },
  { key: "period_6", label: "6th", color: "text-orange-300" },
  { key: "period_7", label: "7th", color: "text-blue-300" },
  { key: "period_8", label: "8th", color: "text-rose-300" },
] as const;

type PeriodConfig = { key: string; label: string; color: string };

function PeriodTable({
  title,
  titleColor,
  periods,
  periodLength,
  tracker,
  setTracker,
}: {
  title: string;
  titleColor: string;
  periods: readonly PeriodConfig[];
  periodLength: number;
  tracker: DailyTracker;
  setTracker: React.Dispatch<React.SetStateAction<DailyTracker>>;
}) {
  const tableTotal = tracker.rows.reduce((sum, row) => {
    return sum + periods.reduce((rowSum, p) => {
      const val = (row as Record<string, string | undefined>)[p.key];
      return rowSum + (parseInt(val || "0", 10) || 0);
    }, 0);
  }, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className={`cardTitle ${titleColor}`}>{title}</div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50">{periodLength} min periods</span>
          <div className="px-3 py-1 rounded-lg bg-emerald-900/40 border border-emerald-500/30">
            <span className="text-sm text-white/70">Total: </span>
            <span className="font-bold text-emerald-300">{tableTotal} min</span>
          </div>
        </div>
      </div>

      <div className="overflow-auto gx-table-wrap">
        <table className="min-w-full w-full text-sm">
          <thead>
            <tr className="gx-table-header">
              <th className="text-left p-3 w-[28%] font-bold text-white">Goal / Objective</th>
              {periods.map((p) => (
                <th key={p.key} className={`text-center p-3 font-bold ${p.color}`}>
                  {p.label}
                  <div className="text-[10px] text-white/50 font-normal">mins</div>
                </th>
              ))}
              <th className="text-left p-3 font-bold text-white/70 w-[12%]">Notes</th>
              <th className="text-center p-3 font-bold text-emerald-300 w-[8%]">Row</th>
            </tr>
          </thead>
          <tbody>
            {tracker.rows.map((row, idx) => {
              const rowTotal = periods.reduce((sum, p) => {
                const val = (row as Record<string, string | undefined>)[p.key];
                return sum + (parseInt(val || "0", 10) || 0);
              }, 0);

              return (
                <tr key={idx} className="gx-table-row">
                  <td className="p-2 align-top">
                    <textarea
                      className="gx-textarea min-h-12"
                      value={row.goal_text ?? ""}
                      onChange={(e) =>
                        setTracker((t) => {
                          const next = { ...t, rows: [...t.rows] };
                          next.rows[idx] = { ...next.rows[idx], goal_text: e.target.value };
                          return next;
                        })
                      }
                      placeholder="Enter goal or objective..."
                    />
                  </td>
                  {periods.map((p) => (
                    <td key={p.key} className="p-2 align-top text-center">
                      <input
                        type="number"
                        min="0"
                        max={periodLength}
                        className="gx-input text-center w-16 mx-auto"
                        value={(row as Record<string, string | undefined>)[p.key] ?? ""}
                        onChange={(e) =>
                          setTracker((t) => {
                            const next = { ...t, rows: [...t.rows] };
                            (next.rows[idx] as Record<string, string>)[p.key] = e.target.value;
                            return next;
                          })
                        }
                        placeholder="0"
                      />
                    </td>
                  ))}
                  <td className="p-2 align-top">
                    <textarea
                      className="gx-textarea min-h-12"
                      value={row.notes ?? ""}
                      onChange={(e) =>
                        setTracker((t) => {
                          const next = { ...t, rows: [...t.rows] };
                          const currentRow = next.rows[idx];
                          if (currentRow) {
                            next.rows[idx] = { 
                              ...currentRow,
                              notes: e.target.value 
                            };
                          }
                          return next;
                        })
                      }
                      placeholder="Notes..."
                    />
                  </td>
                  <td className="p-2 align-middle text-center">
                    {rowTotal > 0 && (
                      <span className="text-emerald-300 font-bold">{rowTotal}m</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DailyGoalTrackerCard() {
  const [student, setStudent] = useState<StudentRef>({
    student_id: "",
    student_first_name: "",
    student_last_name: "",
    grade: "",
  });

  const [date, setDate] = useState<string>(ymd());
  const [tracker, setTracker] = useState<DailyTracker>(() => blankDaily(student, date));
  const [scheduleType, setScheduleType] = useState<ScheduleType>("block");

  const currentSchedule = SCHEDULE_OPTIONS.find((s) => s.key === scheduleType)!;

  useMemo(() => {
    setTracker((t) => ({
      ...t,
      student,
      date,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.student_id, student.student_first_name, student.student_last_name, student.grade, date]);

  // Calculate grand total across all periods
  const allPeriodKeys = scheduleType === "block" 
    ? [...A_DAY_PERIODS, ...B_DAY_PERIODS.filter(p => p.key !== "advisory")]
    : FULL_SCHEDULE_PERIODS;
  
  const grandTotal = tracker.rows.reduce((sum, row) => {
    return sum + allPeriodKeys.reduce((rowSum, p) => {
      const val = (row as Record<string, string | undefined>)[p.key];
      return rowSum + (parseInt(val || "0", 10) || 0);
    }, 0);
  }, 0);

  return (
    <GXCard className="popCard popCard--cyan rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="uiLabel text-white/70">Service Minutes Tracking</div>
          <div className="cardTitle mt-1 text-white">Daily Progress Monitor</div>
          <div className="cardMeta mt-1 text-cyan-300/80">
            Track minutes per class period · IEP service delivery log
          </div>
        </div>

        <button
          onClick={() => exportTrackerToXlsx(tracker)}
          className="ctaBtn ctaBtn--auto ctaBtn--solar"
          disabled={!student.student_id}
          title={!student.student_id ? "Enter a Student ID first" : "Export to Excel"}
        >
          Export XLSX
        </button>
      </div>

      {/* Schedule Type Selector */}
      <div className="flex flex-wrap gap-2">
        {SCHEDULE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setScheduleType(opt.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              scheduleType === opt.key
                ? "bg-linear-to-r from-cyan-500/80 to-violet-500/80 text-white shadow-lg shadow-cyan-500/25"
                : "bg-white/5 border border-white/15 text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Student Info Inputs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <input
          className="gx-input"
          placeholder="Student ID"
          value={student.student_id}
          onChange={(e) => setStudent((s) => ({ ...s, student_id: e.target.value }))}
        />
        <input
          className="gx-input"
          placeholder="First Name"
          value={student.student_first_name ?? ""}
          onChange={(e) => setStudent((s) => ({ ...s, student_first_name: e.target.value }))}
        />
        <input
          className="gx-input"
          placeholder="Last Name"
          value={student.student_last_name ?? ""}
          onChange={(e) => setStudent((s) => ({ ...s, student_last_name: e.target.value }))}
        />
        <input
          className="gx-input"
          placeholder="Grade"
          value={student.grade ?? ""}
          onChange={(e) => setStudent((s) => ({ ...s, grade: e.target.value }))}
        />
        <input
          type="date"
          className="gx-input"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Service Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          className="gx-input"
          placeholder="Service Type (e.g., SpEd Inclusion, Resource, Speech)"
          value={tracker.service_type ?? ""}
          onChange={(e) => setTracker((t) => ({ ...t, service_type: e.target.value }))}
        />
        <input
          className="gx-input"
          type="number"
          placeholder="Required mins per 2 weeks (from IEP)"
          value={tracker.required_minutes_per_2wks || ""}
          onChange={(e) => setTracker((t) => ({ ...t, required_minutes_per_2wks: Number(e.target.value) || 0 }))}
        />
        <div className="gx-input flex items-center justify-between bg-emerald-900/30 border-emerald-500/30">
          <span className="text-white/70">Grand Total:</span>
          <span className="font-bold text-emerald-300 text-lg">{grandTotal} min</span>
        </div>
      </div>

      {/* Tables based on schedule type */}
      {scheduleType === "block" ? (
        <div className="space-y-6">
          {/* A Day Table */}
          <PeriodTable
            title="A Day"
            titleColor="text-amber-300"
            periods={A_DAY_PERIODS}
            periodLength={currentSchedule.periodLength}
            tracker={tracker}
            setTracker={setTracker}
          />

          {/* B Day Table */}
          <PeriodTable
            title="B Day"
            titleColor="text-pink-300"
            periods={B_DAY_PERIODS}
            periodLength={currentSchedule.periodLength}
            tracker={tracker}
            setTracker={setTracker}
          />
        </div>
      ) : (
        /* Full Schedule - Single Table */
        <PeriodTable
          title="Full Day"
          titleColor="text-cyan-300"
          periods={FULL_SCHEDULE_PERIODS}
          periodLength={currentSchedule.periodLength}
          tracker={tracker}
          setTracker={setTracker}
        />
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          className="ctaBtn ctaBtn--auto ctaBtn--violet"
          onClick={() => setTracker((t) => ({ ...t, rows: [...t.rows, { goal_text: "" }] }))}
        >
          + Add Goal Row
        </button>

        <button
          className="ctaBtn ctaBtn--auto ctaBtn--pink"
          onClick={() => setTracker(blankDaily(student, date))}
        >
          Reset
        </button>

        {tracker.required_minutes_per_2wks ? (
          <div className="ml-auto flex items-center gap-2 text-sm text-white/70">
            <span>2-Week Target:</span>
            <span className="font-bold text-amber-300">{tracker.required_minutes_per_2wks} min</span>
          </div>
        ) : null}
      </div>
    </GXCard>
  );
}
