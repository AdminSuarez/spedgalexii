"use client";

import React, { useMemo, useState } from "react";
import { blankDaily, type DailyTracker, type StudentRef, ymd } from "@/lib/trackers";
import { exportTrackerToXlsx } from "@/lib/exportXlsx";

export default function DailyGoalTrackerCard() {
  const [student, setStudent] = useState<StudentRef>({
    student_id: "",
    student_first_name: "",
    student_last_name: "",
    grade: "",
  });

  const [date, setDate] = useState<string>(ymd());
  const [tracker, setTracker] = useState<DailyTracker>(() => blankDaily(student, date));

  useMemo(() => {
    setTracker((t) => ({
      ...t,
      student,
      date,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student.student_id, student.student_first_name, student.student_last_name, student.grade, date]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">Daily Goal Tracking</div>
          <div className="text-sm text-white/70">Morning · Lunch · Afternoon · Specials</div>
        </div>

        <button
          onClick={() => exportTrackerToXlsx(tracker)}
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm hover:border-white/20"
          disabled={!student.student_id}
          title={!student.student_id ? "Enter a Student ID first" : "Export to Excel"}
        >
          Export XLSX
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
        <input
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
          placeholder="Student ID"
          value={student.student_id}
          onChange={(e) => setStudent((s) => ({ ...s, student_id: e.target.value }))}
        />
        <input
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
          placeholder="First"
          value={student.student_first_name ?? ""}
          onChange={(e) => setStudent((s) => ({ ...s, student_first_name: e.target.value }))}
        />
        <input
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
          placeholder="Last"
          value={student.student_last_name ?? ""}
          onChange={(e) => setStudent((s) => ({ ...s, student_last_name: e.target.value }))}
        />
        <input
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
          placeholder="Grade"
          value={student.grade ?? ""}
          onChange={(e) => setStudent((s) => ({ ...s, grade: e.target.value }))}
        />
        <input
          type="date"
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="overflow-auto rounded-xl border border-white/10">
        <table className="min-w-[860px] w-full text-sm">
          <thead className="bg-black/40">
            <tr>
              <th className="text-left p-2 w-[36%]">Goal</th>
              <th className="text-left p-2">Morning</th>
              <th className="text-left p-2">Lunch</th>
              <th className="text-left p-2">Afternoon</th>
              <th className="text-left p-2">Specials</th>
            </tr>
          </thead>
          <tbody>
            {tracker.rows.map((row, idx) => (
              <tr key={idx} className="border-t border-white/10">
                {(["goal_text", "morning", "lunch", "afternoon", "specials"] as const).map((k) => (
                  <td key={k} className="p-2 align-top">
                    <textarea
                      className="w-full min-h-[52px] rounded-lg border border-white/10 bg-black/25 p-2 outline-none focus:border-white/25"
                      value={(row as Record<string, string | undefined>)[k] ?? ""}
                      onChange={(e) =>
                        setTracker((t) => {
                          const next = { ...t, rows: [...t.rows] };
                          (next.rows[idx] as Record<string, string>)[k] = e.target.value;
                          return next;
                        })
                      }
                      placeholder={k === "goal_text" ? "Type goal..." : "Data/notes..."}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm hover:border-white/20"
          onClick={() => setTracker((t) => ({ ...t, rows: [...t.rows, { goal_text: "" }] }))}
        >
          + Add Goal Row
        </button>

        <button
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm hover:border-white/20"
          onClick={() => setTracker(blankDaily(student, date))}
        >
          Reset
        </button>
      </div>
    </div>
  );
}
