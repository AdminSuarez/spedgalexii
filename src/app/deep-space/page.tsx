"use client";

import React, { useState, useCallback } from "react";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { GXCard } from "@/components/ui/GXCard";
import ReactMarkdown from "react-markdown";

type AlertSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

type Alert = {
  severity: AlertSeverity;
  category: string;
  message: string;
};

type DeepDiveAnalysis = {
  student_id: string;
  document_count: number;
  documents: Array<{
    filename: string;
    type: string;
    date: string | null;
  }>;
  alerts: Alert[];
  critical_count: number;
  high_count: number;
  medium_count: number;
  evaluation_status: {
    initial_fie_date: string | null;
    days_since_full_eval: number | null;
    eval_overdue: boolean;
    last_reed_date: string | null;
  };
  copy_paste_issues: Array<{
    severity: string;
    type: string;
    found_name?: string;
    expected_name?: string;
    document: string;
    context?: string;
  }>;
  attention_red_flags: {
    indicators_found: Array<{
      indicator: string;
      document: string;
      date: string | null;
    }>;
    evaluation_exists: boolean;
    recommendation: string | null;
  };
  dyslexia_status: {
    receives_services: boolean;
    in_dyslexia_class: boolean;
    phonological_eval_exists: boolean;
    recommendation: string | null;
  };
  attendance_analysis: {
    history: Array<{ date: string; days_absent: number }>;
    chronic_pattern: boolean;
    improving: boolean;
    housing_barriers: boolean;
  };
  student_info: {
    name: string | null;
    dob: string | null;
    grade: string | null;
    disability: string | null;
  };
};

type ApiResponse = {
  success: boolean;
  studentId: string;
  filesProcessed: number;
  analysis: DeepDiveAnalysis | null;
  report: string | null;
  error?: string;
};

export default function DeepDivePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [studentId, setStudentId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"summary" | "report">("summary");

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
    );
    setFiles((prev) => [...prev, ...droppedFiles]);

    // Try to extract student ID from first filename
    const firstFile = droppedFiles[0];
    if (firstFile && !studentId) {
      const match = firstFile.name.match(/^(\d{8})/);
      if (match?.[1]) {
        setStudentId(match[1]);
      }
    }
  }, [studentId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);

      const firstFile = selectedFiles[0];
      if (firstFile && !studentId) {
        const match = firstFile.name.match(/^(\d{8})/);
        if (match?.[1]) {
          setStudentId(match[1]);
        }
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const runAnalysis = async () => {
    if (files.length === 0 || !studentId) {
      setError("Please upload files and enter a student ID");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("studentId", studentId);
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/deep-space", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Analysis failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-500/20 border-red-500 text-red-200";
      case "HIGH":
        return "bg-orange-500/20 border-orange-500 text-orange-200";
      case "MEDIUM":
        return "bg-yellow-500/20 border-yellow-500 text-yellow-200";
      default:
        return "bg-blue-500/20 border-blue-500 text-blue-200";
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    // Returns JSX element for space-themed severity indicators
    const baseStyle = "inline-block w-3 h-3 rounded-full";
    switch (severity) {
      case "CRITICAL":
        return <span className={baseStyle} style={{background: 'radial-gradient(circle, #f87171 0%, #ef4444 60%, transparent 70%)', boxShadow: '0 0 6px #f87171'}}></span>;
      case "HIGH":
        return <span className={baseStyle} style={{background: 'radial-gradient(circle, #fb923c 0%, #f97316 60%, transparent 70%)', boxShadow: '0 0 6px #fb923c'}}></span>;
      case "MEDIUM":
        return <span className={baseStyle} style={{background: 'radial-gradient(circle, #fbbf24 0%, #f59e0b 60%, transparent 70%)', boxShadow: '0 0 6px #fbbf24'}}></span>;
      default:
        return <span className={baseStyle} style={{background: 'radial-gradient(circle, #60a5fa 0%, #3b82f6 60%, transparent 70%)', boxShadow: '0 0 6px #60a5fa'}}></span>;
    }
  };

  return (
    <GalaxyShell>
      <div className="page w-full px-2 pt-8 pb-4 md:px-4 md:pt-12 md:pb-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <img
              src="/brand/galexii-logo-round.png"
              alt="SpEdGalexii"
              className="h-12 w-12 rounded-full"
            />
            <h1 className="heroTitle">Deep Space</h1>
          </div>
          <p className="text-lg text-violet-200/90 font-medium mb-3">
            Beyond the surface — where clarity meets advocacy
          </p>
          <p className="cardBody text-white/80 max-w-3xl">
            Upload all documents for a single student and let Deep Space conduct a rigorous 
            analysis that no checklist can match. We detect <strong>copy/paste errors</strong>, 
            <strong>stale data</strong>, <strong>missing evaluations</strong>, and 
            <strong>patterns across years of IEPs</strong> — building toward your child's 
            academic stability through evidence-based clarity.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="gx-badge-active">
              Wrong-name detection
            </span>
            <span className="gx-badge-active">
              FIE age tracking
            </span>
            <span className="gx-badge-active">
              Attention indicator count
            </span>
            <span className="gx-badge-active">
              Attendance pattern analysis
            </span>
            <span className="gx-badge-active">
              SLD consistency check
            </span>
          </div>
        </div>

        {/* Upload Section */}
        {!result && (
          <GXCard className="mb-6 rounded-2xl popCard popCard--violet">
            <h2 className="cardTitle text-white mb-4">Initiate Deep Space Scan</h2>

            {/* Student ID Input */}
            <div className="mb-4">
              <label className="block text-white/70 text-sm mb-2">
                Student ID (8 digits)
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="e.g., 10147287"
                className="w-full md:w-64 px-4 py-2 rounded-lg bg-white/10 border border-white/20 
                           text-white placeholder-white/40 focus:outline-none focus:border-violet-400"
              />
            </div>

            {/* Drop Zone */}
            <div
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center
                         hover:border-violet-400/50 hover:bg-violet-500/5 transition-colors cursor-pointer"
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="text-4xl mb-3 text-violet-300/80">◎</div>
              <p className="text-white/80">
                Drag & drop student PDF files here, or click to select
              </p>
              <p className="text-white/50 text-sm mt-2">
                IEPs, FIE, REED, classroom observations, speech referrals, evaluations...
              </p>
              <p className="text-violet-300/70 text-xs mt-3 italic">
                "Every document tells part of the story. Deep Space reads them all."
              </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-white/70 text-sm">{files.length} file(s) selected:</div>
                {files.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
                  >
                    <span className="text-white/80 text-sm truncate">{file.name}</span>
                    <button
                      onClick={() => removeFile(i)}
                      className="gx-status-remove ml-2"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-200">
                {error}
              </div>
            )}

            {/* Run Button */}
            <button
              onClick={runAnalysis}
              disabled={isProcessing || files.length === 0 || !studentId}
              className="mt-6 ctaBtn ctaBtn--deep disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <span className="animate-spin mr-2">◎</span>
                  Scanning Deep Space...
                </>
              ) : (
                <>Launch Deep Space Analysis</>
              )}
            </button>
          </GXCard>
        )}

        {/* Results Section */}
        {result && result.analysis && (
          <div className="space-y-6">
            {/* Student Header */}
            <GXCard className="rounded-2xl popCard popCard--solar">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="cardTitle text-white text-2xl">
                      {result.analysis.student_info.name || `Student ${result.studentId}`}
                    </h2>
                  </div>
                  <div className="text-white/60 mt-1">
                    ID: {result.studentId} | Grade: {result.analysis.student_info.grade || "?"} |
                    Documents Scanned: {result.analysis.document_count}
                  </div>
                  <div className="text-violet-300/80 text-sm mt-2 italic">
                    "Clarity achieved through rigorous analysis"
                  </div>
                </div>
                <button
                  onClick={() => {
                    setResult(null);
                    setFiles([]);
                    setStudentId("");
                  }}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                >
                  New Scan
                </button>
              </div>
            </GXCard>

            {/* Alert Summary */}
            <GXCard className="rounded-2xl popCard popCard--ember">
              <h3 className="cardTitle text-white mb-4">Findings Summary</h3>
              <p className="text-white/60 text-sm mb-4">Issues discovered that require attention for academic stability</p>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-red-500/20 rounded-xl border border-red-500/30">
                  <div className="text-3xl font-bold text-red-300">
                    {result.analysis.critical_count}
                  </div>
                  <div className="text-red-200/70 text-sm">Critical</div>
                </div>
                <div className="text-center p-4 bg-orange-500/20 rounded-xl border border-orange-500/30">
                  <div className="text-3xl font-bold text-orange-300">
                    {result.analysis.high_count}
                  </div>
                  <div className="text-orange-200/70 text-sm">High</div>
                </div>
                <div className="text-center p-4 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
                  <div className="text-3xl font-bold text-yellow-300">
                    {result.analysis.medium_count}
                  </div>
                  <div className="text-yellow-200/70 text-sm">Medium</div>
                </div>
              </div>

              {/* Individual Alerts */}
              <div className="space-y-2">
                {result.analysis.alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
                  >
                    <span className="mr-2">{getSeverityIcon(alert.severity)}</span>
                    <strong>{alert.category}:</strong> {alert.message}
                  </div>
                ))}
              </div>
            </GXCard>

            {/* View Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("summary")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === "summary"
                    ? "bg-violet-500 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                Summary View
              </button>
              <button
                onClick={() => setViewMode("report")}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === "report"
                    ? "bg-violet-500 text-white"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                Full Report
              </button>
            </div>

            {viewMode === "summary" ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Evaluation Status */}
                <GXCard className="rounded-2xl popCard popCard--violet">
                  <h3 className="cardTitle text-white mb-4">Evaluation Status</h3>
                  <p className="text-white/50 text-xs mb-3">FIE + REED timeline tracking</p>
                  <div className="space-y-3 text-white/80">
                    <div className="flex justify-between">
                      <span>Initial FIE:</span>
                      <span>{result.analysis.evaluation_status.initial_fie_date || "Unknown"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Days Since Eval:</span>
                      <span>{result.analysis.evaluation_status.days_since_full_eval || "?"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overdue:</span>
                      <span className={result.analysis.evaluation_status.eval_overdue ? "text-red-400" : "text-green-400"}>
                        {result.analysis.evaluation_status.eval_overdue ? "YES" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last REED:</span>
                      <span>{result.analysis.evaluation_status.last_reed_date || "None"}</span>
                    </div>
                  </div>
                </GXCard>

                {/* Attention/ADHD */}
                <GXCard className="rounded-2xl popCard popCard--violet">
                  <h3 className="cardTitle text-white mb-4">Attention Analysis</h3>
                  <p className="text-white/50 text-xs mb-3">ADHD indicator detection</p>
                  <div className="space-y-3 text-white/80">
                    <div className="flex justify-between">
                      <span>Indicators Found:</span>
                      <span className="font-bold">
                        {result.analysis.attention_red_flags.indicators_found.length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Formal Eval Exists:</span>
                      <span className={result.analysis.attention_red_flags.evaluation_exists ? "text-green-400" : "text-red-400"}>
                        {result.analysis.attention_red_flags.evaluation_exists ? "Yes" : "❌ No"}
                      </span>
                    </div>
                    {result.analysis.attention_red_flags.recommendation && (
                      <div className="mt-3 p-2 bg-orange-500/20 rounded text-orange-200 text-sm">
                        ⚠️ {result.analysis.attention_red_flags.recommendation}
                      </div>
                    )}
                  </div>
                </GXCard>

                {/* Attendance */}
                <GXCard className="rounded-2xl popCard popCard--violet">
                  <h3 className="cardTitle text-white mb-4">Attendance History</h3>
                  <p className="text-white/50 text-xs mb-3">Chronic absenteeism pattern detection</p>
                  {result.analysis.attendance_analysis.history.length > 0 ? (
                    <div className="space-y-2">
                      {result.analysis.attendance_analysis.history.map((entry, i) => (
                        <div key={i} className="flex justify-between text-white/80">
                          <span>{entry.date}</span>
                          <span className={entry.days_absent > 18 ? "text-red-400" : ""}>
                            {entry.days_absent} days
                          </span>
                        </div>
                      ))}
                      <div className="mt-3 pt-3 border-t border-white/20 flex justify-between">
                        <span>Chronic Pattern:</span>
                        <span className={result.analysis.attendance_analysis.chronic_pattern ? "text-red-400" : "text-green-400"}>
                          {result.analysis.attendance_analysis.chronic_pattern ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/60">No attendance data found</p>
                  )}
                </GXCard>

                {/* Dyslexia */}
                <GXCard className="rounded-2xl popCard popCard--violet">
                  <h3 className="cardTitle text-white mb-4">Dyslexia Status</h3>
                  <p className="text-white/50 text-xs mb-3">Reading disability service mapping</p>
                  <div className="space-y-3 text-white/80">
                    <div className="flex justify-between">
                      <span>Receives Services:</span>
                      <span>{result.analysis.dyslexia_status.receives_services ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>In Dyslexia Class:</span>
                      <span>{result.analysis.dyslexia_status.in_dyslexia_class ? "Yes" : "No"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Phonological Eval:</span>
                      <span className={result.analysis.dyslexia_status.phonological_eval_exists ? "text-green-400" : "text-red-400"}>
                        {result.analysis.dyslexia_status.phonological_eval_exists ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </GXCard>

                {/* Documents Analyzed */}
                <GXCard className="rounded-2xl popCard popCard--violet md:col-span-2">
                  <h3 className="cardTitle text-white mb-4">Documents Scanned</h3>
                  <p className="text-white/50 text-xs mb-3">Source materials processed during analysis</p>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {result.analysis.documents.map((doc, i) => (
                      <div key={i} className="bg-white/5 rounded-lg p-2 text-sm border border-white/10">
                        <div className="text-white/80 truncate">{doc.type}</div>
                        <div className="text-white/50 text-xs">{doc.date || "No date"}</div>
                      </div>
                    ))}
                  </div>
                </GXCard>
              </div>
            ) : (
              /* Full Report View */
              <GXCard className="rounded-2xl popCard popCard--violet">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="cardTitle text-white">Deep Space Transmission</h3>
                  <span className="text-xs text-violet-300/60">Full analysis report</span>
                </div>
                <div className="prose prose-invert prose-violet max-w-none">
                  <ReactMarkdown>{result.report || "No report generated"}</ReactMarkdown>
                </div>
              </GXCard>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(result.analysis, null, 2)], {
                    type: "application/json",
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `DEEP_SPACE_${result.studentId}.json`;
                  a.click();
                }}
                className="ctaBtn ctaBtn--outline"
              >
                Export Data (JSON)
              </button>
              <button
                onClick={() => {
                  const blob = new Blob([result.report || ""], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `DEEP_SPACE_${result.studentId}_REPORT.md`;
                  a.click();
                }}
                className="ctaBtn ctaBtn--outline"
              >
                Export Report (MD)
              </button>
            </div>
          </div>
        )}

        {/* Feature Roadmap - Always visible */}
        <div className="mt-10 border-t border-white/10 pt-8">
          <h2 className="text-2xl font-bold text-white mb-2">Deep Space Mission Roadmap</h2>
          <p className="text-white/60 mb-6">Features in development to make SpEdGalexii the most powerful IEP analysis platform on the market.</p>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Tier 1 - Essential */}
            <GXCard className="rounded-2xl popCard popCard--solar">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="cardTitle text-yellow-200">Tier 1: Essential</h3>
              </div>
              <p className="text-white/50 text-xs mb-4">Before Launch</p>
              <ul className="space-y-3 text-white/80 text-sm">
                <li className="flex items-start gap-2">
                  <span className="gx-status-done mt-0.5"></span>
                  <span>Document analysis engine</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="gx-status-done mt-0.5"></span>
                  <span>Wrong-name & copy/paste detection</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="gx-status-done mt-0.5"></span>
                  <span>Parent-Friendly PDF Report</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="gx-status-pending mt-0.5"></span>
                  <span>Goal Bank Integration</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="gx-status-pending mt-0.5"></span>
                  <span>PLAAFP Auto-Draft Generator</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="gx-status-pending mt-0.5"></span>
                  <span>IEP Comparison Mode (2+ years)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="gx-status-pending mt-0.5"></span>
                  <span>Advocacy Letter Generator</span>
                </li>
              </ul>
            </GXCard>

            {/* Tier 2 - Competitive Edge */}
            <GXCard className="rounded-2xl popCard popCard--violet">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="cardTitle text-violet-200">Tier 2: Competitive Edge</h3>
              </div>
              <p className="text-white/50 text-xs mb-4">Post-Launch Enhancement</p>
              <ul className="space-y-3 text-white/80 text-sm">
                <li className="flex items-start gap-2">
                  <span className="gx-status-pending mt-0.5"></span>
                  <span>Multi-Student Batch Analysis</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="gx-status-pending mt-0.5"></span>
                  <span>Timeline Visualization (Calendar)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="gx-status-pending mt-0.5"></span>
                  <span>Compliance Countdown Dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="gx-status-pending mt-0.5"></span>
                  <span>Red Flag Email Alerts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="gx-status-pending mt-0.5"></span>
                  <span>Progress Monitoring Tracker</span>
                </li>
              </ul>
            </GXCard>

            {/* Tier 3 - Premium */}
            <GXCard className="rounded-2xl popCard popCard--ember">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="cardTitle text-orange-200">Tier 3: Premium</h3>
              </div>
              <p className="text-white/50 text-xs mb-4">Differentiators</p>
              <ul className="space-y-3 text-white/80 text-sm">
                <li className="flex items-start gap-2">
                  <span className="gx-status-pending mt-0.5"></span>
                  <span>AI Goal Scoring (TEA rubric)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="gx-status-pending mt-0.5"></span>
                  <span>Parent Portal (view-only)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="gx-status-pending mt-0.5"></span>
                  <span>District Admin Dashboard</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="gx-status-pending mt-0.5"></span>
                  <span>FERPA Audit Trail</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="gx-status-pending mt-0.5"></span>
                  <span>Export to eSped/Frontline</span>
                </li>
              </ul>
            </GXCard>
          </div>
        </div>
      </div>
    </GalaxyShell>
  );
}
