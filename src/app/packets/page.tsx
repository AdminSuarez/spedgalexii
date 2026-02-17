"use client";

import React, { useState } from "react";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { FileArchive, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

export default function PacketsPage() {
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  async function handleBuild(e: React.FormEvent) {
    e.preventDefault();
    const raw = studentId.trim();
    if (!raw) {
      setStatus("error");
      setMessage("Enter a student ID first.");
      return;
    }

    setStatus("running");
    setMessage("");

    try {
      const resp = await fetch("/api/student-packet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: raw }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || "Packet build failed.");
        return;
      }

      setStatus("done");
      setMessage(
        `Built packet for ${data.studentId}. On disk at: ${data.packetDir}.`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus("error");
      setMessage(msg || "Packet build failed.");
    }
  }

  return (
    <GalaxyShell>
      <div className="mx-auto max-w-xl space-y-6 py-8">
        <div className="flex items-center gap-3">
          <FileArchive className="h-7 w-7 text-lime-400" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Build ARD Packet</h1>
            <p className="text-sm text-slate-300">
              Generate PPT + spreadsheets + PDFs into a single folder by student ID.
            </p>
          </div>
        </div>

        <form onSubmit={handleBuild} className="space-y-4 rounded-xl border border-slate-700/70 bg-slate-900/80 p-4">
          <label className="block text-sm font-medium text-slate-200">
            Student ID
            <input
              className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-50 shadow-sm focus:border-lime-400 focus:outline-none focus:ring-1 focus:ring-lime-400"
              placeholder="e.g. 10178924"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </label>

          <button
            type="submit"
            disabled={status === "running"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-lime-400 px-4 py-2 text-sm font-semibold text-black shadow-md transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "running" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Building packet...
              </>
            ) : (
              "Build packet for this student"
            )}
          </button>
        </form>

        {status !== "idle" && (
          <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
              status === "done"
                ? "border-emerald-500/60 bg-emerald-950/50 text-emerald-100"
                : status === "error"
                ? "border-rose-500/60 bg-rose-950/50 text-rose-100"
                : "border-slate-600 bg-slate-900 text-slate-100"
            }`}
          >
            {status === "done" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : status === "error" ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
            )}
            <p className="whitespace-pre-wrap text-xs sm:text-sm">{message}</p>
          </div>
        )}

        <p className="text-[11px] leading-snug text-slate-400">
          This button runs the same Python builders you&apos;ve been using in VS Code:
          it creates the ARD summary PPT and then bundles it with styled spreadsheets
          and IEP PDFs into <code className="mx-1 rounded bg-slate-800/80 px-1 py-0.5 text-[10px]">output/student_packets/&lt;ID&gt;/</code>.
        </p>
      </div>
    </GalaxyShell>
  );
}
