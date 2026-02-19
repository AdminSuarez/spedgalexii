"use client";

import React, { useState } from "react";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { FileText, Loader2, AlertTriangle, CheckCircle2, Copy } from "lucide-react";

export default function StudentNarrativePage() {
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [markdown, setMarkdown] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [tone, setTone] = useState<"case_manager" | "parent">("case_manager");
  const [parentMarkdown, setParentMarkdown] = useState<string>("");
  const [toneLoading, setToneLoading] = useState(false);
  const [toneError, setToneError] = useState<string | null>(null);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    const raw = studentId.trim();
    if (!raw) {
      setStatus("error");
      setMessage("Enter a student ID first.");
      setMarkdown("");
      return;
    }

    setStatus("running");
    setMessage("");
    setMarkdown("");
    setCopied(false);
    setTone("case_manager");
    setParentMarkdown("");
    setToneError(null);

    try {
      const resp = await fetch("/api/student-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: raw }),
      });

      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to generate narrative.");
        return;
      }

      setStatus("done");
      setMarkdown(typeof data.markdown === "string" ? data.markdown : "");
      setMessage(`Generated narrative for student ${data.studentId}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus("error");
      setMessage(msg || "Failed to generate narrative.");
    }
  }

  async function handleCopy() {
    const active = tone === "parent" && parentMarkdown ? parentMarkdown : markdown;
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <GalaxyShell>
      <div className="mx-auto max-w-3xl space-y-6 py-8">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-cyan-400" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Single-Student IEP Narrative</h1>
            <p className="text-sm text-slate-300">
              Generate a copy-paste-ready narrative for ARD/IEP from Deep Dive + IEP Prep Galexii.
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4 rounded-xl border border-slate-700/70 bg-slate-900/80 p-4">
          <label className="block text-sm font-medium text-slate-200">
            Student ID
            <input
              className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-50 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              placeholder="e.g. 10147287"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </label>

          <button
            type="submit"
            disabled={status === "running"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-black shadow-md transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "running" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating narrative...
              </>
            ) : (
              "Generate narrative for this student"
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

        {markdown && (
          <div className="space-y-2 rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-100">Narrative</div>
              <div className="flex items-center gap-2 text-[11px] text-slate-200">
                <span className="text-slate-400">Tone:</span>
                <div className="inline-flex rounded-full bg-slate-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => setTone("case_manager")}
                    className={`px-2 py-0.5 rounded-full border text-[11px] ${
                      tone === "case_manager"
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                        : "border-transparent text-slate-200"
                    }`}
                  >
                    Case manager
                  </button>
                  <button
                    type="button"
                    disabled={toneLoading}
                    onClick={async () => {
                      setTone("parent");
                      setToneError(null);
                      if (!parentMarkdown && !toneLoading) {
                        try {
                          setToneLoading(true);
                          const resp = await fetch("/api/student-narrative/rewrite", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ markdown, tone: "parent" }),
                          });
                          const data = await resp.json();
                          if (!resp.ok || !data.ok) {
                            setToneError(data.error || "Failed to create parent-friendly version.");
                          } else {
                            setParentMarkdown(typeof data.markdown === "string" ? data.markdown : "");
                          }
                        } catch (err) {
                          const msg = err instanceof Error ? err.message : String(err);
                          setToneError(msg || "Failed to create parent-friendly version.");
                        } finally {
                          setToneLoading(false);
                        }
                      }
                    }}
                    className={`ml-0.5 px-2 py-0.5 rounded-full border text-[11px] disabled:opacity-70 ${
                      tone === "parent"
                        ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                        : "border-transparent text-slate-200"
                    }`}
                  >
                    Parent-friendly {toneLoading && tone === "parent" ? "…" : ""}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700"
                >
                  <Copy className="h-3 w-3" />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            {toneError && (
              <p className="mt-1 text-[11px] text-rose-300">{toneError}</p>
            )}
            <pre className="max-h-130 overflow-auto rounded-xl border border-slate-700/60 bg-slate-950/70 p-3 text-xs leading-relaxed text-slate-100 whitespace-pre-wrap wrap-break-word">
              {tone === "parent" && parentMarkdown ? parentMarkdown : markdown}
            </pre>
          </div>
        )}

        <p className="text-[11px] leading-snug text-slate-400">
          This uses your existing <code className="mx-1 rounded bg-slate-800/80 px-1 py-0.5 text-[10px]">scripts/iep_prep_galexii.py</code>
          . Make sure a matching <code className="mx-1 rounded bg-slate-800/80 px-1 py-0.5 text-[10px]">audit/DEEP_DIVE_&lt;ID&gt;.json</code> exists
          before running.
        </p>
      </div>
    </GalaxyShell>
  );
}
