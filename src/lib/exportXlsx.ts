// src/lib/exportXlsx.ts
import * as XLSX from "xlsx";
import type { AnyTracker } from "@/lib/trackers";

function safe(s: string) {
  return (s || "").replace(/[^\w\-]+/g, "_").slice(0, 80);
}

export function trackerFilename(t: AnyTracker) {
  const sid = safe(t.student.student_id || "UNKNOWN");
  const date =
    (t.type === "weekly" ? t.week_of : "date" in t ? (t as { date?: string }).date : undefined) ||
    "YYYY-MM-DD";
  const stamp = safe(date);
  const kind = t.type.toUpperCase();
  return `TRACKER_${kind}__${sid}__${stamp}.xlsx`;
}

export function exportTrackerToXlsx(t: AnyTracker) {
  const wb = XLSX.utils.book_new();

  if (t.type === "weekly") {
    const rows = [
      ["Student ID", t.student.student_id],
      ["Student", `${t.student.student_last_name ?? ""}, ${t.student.student_first_name ?? ""}`.trim()],
      ["Week Of", t.week_of],
      [],
      ["GOAL", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      ...t.goals.map((g) => [g.goal_text, g.mon ?? "", g.tue ?? "", g.wed ?? "", g.thu ?? "", g.fri ?? ""]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Weekly");
  }

  if (t.type === "daily") {
    const rows = [
      ["Student ID", t.student.student_id],
      ["Student", `${t.student.student_last_name ?? ""}, ${t.student.student_first_name ?? ""}`.trim()],
      ["Date", t.date],
      ["Service Type", t.service_type ?? ""],
      ["Required Minutes/2wks", t.required_minutes_per_2wks ?? ""],
      [],
      ["GOAL", "Advisory", "P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "Notes"],
      ...t.rows.map((r) => [
        r.goal_text, 
        r.advisory ?? "", 
        r.period_1 ?? "", 
        r.period_2 ?? "", 
        r.period_3 ?? "", 
        r.period_4 ?? "", 
        r.period_5 ?? "", 
        r.period_6 ?? "", 
        r.period_7 ?? "", 
        r.period_8 ?? "",
        r.notes ?? ""
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Daily");
  }

  if (t.type === "trials") {
    const header = ["Trial #", "Date", "Score (0-100)", "Note (A/U/M/NM)"];
    const body = t.trials.map((tr, idx) => [idx + 1, tr.date ?? "", tr.score ?? "", tr.note ?? ""]);
    const rows = [
      ["Student ID", t.student.student_id],
      ["Student", `${t.student.student_last_name ?? ""}, ${t.student.student_first_name ?? ""}`.trim()],
      ["Grade", t.student.grade ?? ""],
      [],
      ["GOAL", t.goal_text],
      [],
      header,
      ...body,
      [],
      ["Notes", t.notes ?? ""],
      [],
      ["Legend", "A=Assisted, U=Unassisted, M=Modified, NM=Not Modified"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Trials");
  }

  if (t.type === "progress") {
    const rows = [
      ["Student ID", t.student.student_id],
      ["Student", `${t.student.student_last_name ?? ""}, ${t.student.student_first_name ?? ""}`.trim()],
      ["Grade", t.student.grade ?? ""],
      [],
      ["GOAL", t.goal_text],
      ["Baseline", t.baseline ?? ""],
      ["Target", t.target ?? ""],
      ["Measurement", t.measurement ?? ""],
      [],
      ["Date", "Value", "Note"],
      ...t.datapoints.map((d) => [d.date, d.value, d.note ?? ""]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Progress");
  }

  const filename = trackerFilename(t);
  XLSX.writeFile(wb, filename);
}
