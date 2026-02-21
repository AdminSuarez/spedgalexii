"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { GXCard } from "@/components/ui/GXCard";
import ReactMarkdown from "react-markdown";
import {
  saveFiles,
  getSessionFiles,
  getAllSessions,
  saveSession,
  clearSession,
  generateSessionId,
  storedFileToFile,
  type StoredFile,
  type UploadSession,
} from "@/lib/fileStorage";
import {
  checkCloudSyncStatus,
  saveFilesHybrid,
  getAllSessionsHybrid,
  getSessionFilesHybrid,
  clearSessionHybrid,
  saveAnalysisResultsHybrid,
  type SyncStatus,
  type HybridSession,
} from "@/lib/hybridStorage";
import { CloudSyncStatus, SyncBadge } from "@/components/ui/CloudSyncStatus";
import { addToOutputRepository } from "@/lib/outputRepository";
import { AIInsights } from "@/components/galaxy/AIInsights";
import { useSharedFiles } from "@/lib/SharedFileContext";

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
  const shared = useSharedFiles();
  const [files, setFiles] = useState<File[]>([]);
  const [storedFiles, setStoredFiles] = useState<StoredFile[]>([]);
  const [studentId, setStudentId] = useState("");
  const [sessionId, setSessionId] = useState<string>("");
  const [previousSessions, setPreviousSessions] = useState<HybridSession[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"summary" | "report">("summary");
  const [showPreviousSessions, setShowPreviousSessions] = useState(false);
  const sessionInitialized = useRef(false);
  
  // Cloud sync state
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(false);
  const [currentSyncStatus, setCurrentSyncStatus] = useState<SyncStatus>('local-only');

  // Load previous sessions, auto-restore last active session, and check cloud sync on mount
  useEffect(() => {
    async function initPage() {
      try {
        // Check cloud sync status
        const cloudStatus = await checkCloudSyncStatus();
        setCloudSyncEnabled(cloudStatus.hasSubscription);
        
        // Load sessions using hybrid storage
        const sessions = await getAllSessionsHybrid();
        const activeSessions = sessions.filter(s => s.fileCount > 0);
        
        // Auto-restore the most recent incomplete session so files survive navigation
        const lastIncomplete = activeSessions
          .filter(s => !s.analysisComplete)
          .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)[0];
        
        if (lastIncomplete && !sessionInitialized.current) {
          const restoredFiles = await getSessionFilesHybrid(lastIncomplete.id);
          if (restoredFiles.length > 0) {
            setStoredFiles(restoredFiles);
            setFiles(restoredFiles.map(storedFileToFile));
            setStudentId(lastIncomplete.studentId);
            setSessionId(lastIncomplete.id);
            setCurrentSyncStatus(lastIncomplete.syncStatus);
            sessionInitialized.current = true;
            // Show remaining previous sessions (excluding the auto-restored one)
            setPreviousSessions(activeSessions.filter(s => s.id !== lastIncomplete.id));
          } else {
            setPreviousSessions(activeSessions);
          }
        } else {
          setPreviousSessions(activeSessions);
        }
      } catch (e) {
        console.error("Failed to load sessions:", e);
      } finally {
        setIsLoading(false);
      }
    }
    initPage();
  }, []);

  // Initialize session ID if none was restored
  useEffect(() => {
    if (!sessionInitialized.current && !sessionId) {
      setSessionId(generateSessionId());
      sessionInitialized.current = true;
    }
  }, [sessionId]);

  // Load files from a previous session
  const loadPreviousSession = async (session: HybridSession) => {
    try {
      setIsLoading(true);
      const files = await getSessionFilesHybrid(session.id);
      if (files.length > 0) {
        setStoredFiles(files);
        setFiles(files.map(storedFileToFile));
        setStudentId(session.studentId);
        setSessionId(session.id);
        setCurrentSyncStatus(session.syncStatus);
        setShowPreviousSessions(false);
      }
    } catch (e) {
      setError("Failed to load previous session");
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a previous session
  const deletePreviousSession = async (sessionToDelete: HybridSession) => {
    try {
      await clearSessionHybrid(sessionToDelete.id);
      setPreviousSessions(prev => prev.filter(s => s.id !== sessionToDelete.id));
    } catch (e) {
      console.error("Failed to delete session:", e);
    }
  };

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
    );
    
    if (droppedFiles.length === 0) return;

    // Extract student ID if not set
    let currentStudentId = studentId;
    const firstFile = droppedFiles[0];
    if (firstFile && !currentStudentId) {
      const match = firstFile.name.match(/^(\d{8})/);
      if (match?.[1]) {
        currentStudentId = match[1];
        setStudentId(currentStudentId);
      }
    }

    // Save using hybrid storage (local + cloud if available)
    if (currentStudentId && sessionId) {
      try {
        setCurrentSyncStatus('syncing');
        const { files: saved, syncStatus } = await saveFilesHybrid(droppedFiles, currentStudentId, sessionId);
        setStoredFiles(prev => [...prev, ...saved]);
        setCurrentSyncStatus(syncStatus);
        
        // Update session record
        await saveSession({
          id: sessionId,
          studentId: currentStudentId,
          createdAt: Date.now(),
          lastAccessedAt: Date.now(),
          fileCount: storedFiles.length + saved.length,
          analysisComplete: false,
        });
      } catch (err) {
        console.error("Failed to persist files:", err);
        setCurrentSyncStatus('error');
      }
    }

    setFiles((prev) => [...prev, ...droppedFiles]);
    
    // Save to shared file store so other module tabs can access
    void shared.addFiles(droppedFiles, "deep-space", currentStudentId);
  }, [studentId, sessionId, storedFiles.length, shared]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Extract student ID if not set
      let currentStudentId = studentId;
      const firstFile = selectedFiles[0];
      if (firstFile && !currentStudentId) {
        const match = firstFile.name.match(/^(\d{8})/);
        if (match?.[1]) {
          currentStudentId = match[1];
          setStudentId(currentStudentId);
        }
      }

      // Save using hybrid storage (local + cloud if available)
      if (currentStudentId && sessionId) {
        try {
          setCurrentSyncStatus('syncing');
          const { files: saved, syncStatus } = await saveFilesHybrid(selectedFiles, currentStudentId, sessionId);
          setStoredFiles(prev => [...prev, ...saved]);
          setCurrentSyncStatus(syncStatus);
          
          // Update session record
          await saveSession({
            id: sessionId,
            studentId: currentStudentId,
            createdAt: Date.now(),
            lastAccessedAt: Date.now(),
            fileCount: storedFiles.length + saved.length,
            analysisComplete: false,
          });
        } catch (err) {
          console.error("Failed to persist files:", err);
          setCurrentSyncStatus('error');
        }
      }

      setFiles((prev) => [...prev, ...selectedFiles]);
      
      // Save to shared file store so other module tabs can access
      void shared.addFiles(selectedFiles, "deep-space", currentStudentId);
    }
  };

  const removeFile = async (index: number) => {
    const fileToRemove = storedFiles[index];
    if (fileToRemove) {
      try {
        const { removeFile: removeFromDB } = await import("@/lib/fileStorage");
        await removeFromDB(fileToRemove.id);
        setStoredFiles(prev => prev.filter((_, i) => i !== index));
      } catch (err) {
        console.error("Failed to remove file from storage:", err);
      }
    }
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
      const useBlob = process.env.NEXT_PUBLIC_DEEP_SPACE_USE_BLOB === "true";

      let response: Response;

      if (!useBlob) {
        const formData = new FormData();
        formData.append("studentId", studentId);
        files.forEach((file) => formData.append("files", file));

        response = await fetch("/api/deep-space", {
          method: "POST",
          body: formData,
        });
      } else {
        const blobFiles: { url: string; name: string }[] = [];

        for (const file of files) {
          const fd = new FormData();
          fd.append("file", file);

          const uploadRes = await fetch("/api/deep-space/blob-upload", {
            method: "POST",
            body: fd,
          });

          const uploadJson: unknown = await uploadRes.json();
          const uploadData = uploadJson as { ok?: boolean; url?: string; error?: string };

          if (!uploadRes.ok || uploadData.ok !== true || !uploadData.url) {
            const msg = uploadData.error || `Upload failed with status ${uploadRes.status}`;
            throw new Error(msg);
          }

          blobFiles.push({ url: uploadData.url, name: file.name });
        }

        response = await fetch("/api/deep-space/from-blob", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, files: blobFiles }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error((data as { error?: string }).error || "Analysis failed");
      }

      setResult(data);
      
      // Auto-save results to Output Repository
      if (data.analysis) {
        const studentName = data.analysis.student_info?.name || `Student_${studentId}`;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        
        // Save JSON analysis
        if (data.analysis) {
          const jsonStr = JSON.stringify(data.analysis, null, 2);
          addToOutputRepository({
            name: `DEEP_DIVE_${studentName.replace(/\s+/g, '_')}_${timestamp}.json`,
            type: 'json',
            size: `${Math.round(jsonStr.length / 1024)} KB`,
            module: 'Deep Space',
            data: btoa(unescape(encodeURIComponent(jsonStr))), // Base64 encode
          });
        }
        
        // Save Markdown report
        if (data.report) {
          addToOutputRepository({
            name: `DEEP_DIVE_${studentName.replace(/\s+/g, '_')}_${timestamp}.md`,
            type: 'md',
            size: `${Math.round(data.report.length / 1024)} KB`,
            module: 'Deep Space',
            data: btoa(unescape(encodeURIComponent(data.report))), // Base64 encode
          });
        }
        
        // Update session as analysis complete
        if (sessionId) {
          await saveSession({
            id: sessionId,
            studentId,
            createdAt: Date.now(),
            lastAccessedAt: Date.now(),
            fileCount: files.length,
            analysisComplete: true,
            analysisResult: {
              summary: `${data.analysis.document_count} documents analyzed`,
              alertCount: data.analysis.alerts?.length || 0,
              criticalCount: data.analysis.critical_count || 0,
            },
          });
          
          // Sync analysis results to cloud if available
          if (cloudSyncEnabled) {
            setCurrentSyncStatus('syncing');
            const jsonStr = JSON.stringify(data.analysis, null, 2);
            const cloudStatus = await saveAnalysisResultsHybrid(
              sessionId,
              studentId,
              data.analysis.student_info?.name || null,
              {
                documentCount: data.analysis.document_count,
                alertCount: data.analysis.alerts?.length || 0,
                criticalCount: data.analysis.critical_count || 0,
              },
              jsonStr,
              data.report || ''
            );
            setCurrentSyncStatus(cloudStatus);
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  // Download functions for manual export
  const downloadJSON = () => {
    if (!result?.analysis) return;
    const blob = new Blob([JSON.stringify(result.analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DEEP_DIVE_${studentId}_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadReport = () => {
    if (!result?.report) return;
    const blob = new Blob([result.report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DEEP_DIVE_${studentId}_${new Date().toISOString().slice(0,10)}_REPORT.md`;
    a.click();
    URL.revokeObjectURL(url);
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
      <div className="page w-full">
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

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-violet-300 animate-pulse">Loading...</div>
          </div>
        )}

        {/* Previous Sessions Banner */}
        {!isLoading && !result && previousSessions.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowPreviousSessions(!showPreviousSessions)}
              className="flex items-center gap-2 text-violet-300 hover:text-violet-200 transition-colors text-sm"
            >
              <span>{showPreviousSessions ? '▼' : '▶'}</span>
              <span>{previousSessions.length} previous session(s) available</span>
              <span className="text-violet-400/60 text-xs">(local: 24hr • cloud: 30 days)</span>
            </button>
            
            {showPreviousSessions && (
              <div className="mt-3 space-y-2">
                {previousSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 border border-white/10"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-white/90 text-sm font-medium">
                        Student {session.studentId}
                        <SyncBadge status={session.syncStatus} />
                      </div>
                      <div className="text-white/50 text-xs">
                        {session.fileCount} files • {new Date(session.lastAccessedAt).toLocaleString()}
                        {session.analysisComplete && (
                          <span className="ml-2 text-green-400">✓ Analysis complete</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadPreviousSession(session)}
                        className="px-3 py-1 text-xs rounded bg-violet-500/30 text-violet-200 hover:bg-violet-500/50 transition-colors"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deletePreviousSession(session)}
                        className="px-3 py-1 text-xs rounded bg-red-500/30 text-red-200 hover:bg-red-500/50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload Section */}
        {!isLoading && !result && (
          <GXCard className="mb-6 rounded-2xl popCard popCard--violet">
            <h2 className="cardTitle text-white mb-4">Initiate Deep Space Scan</h2>

            {/* Persistence & Cloud Sync Notice */}
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-green-200">
                  <span className="font-medium">✓ Files persist</span> — Saved locally, survive refresh.
                  {cloudSyncEnabled ? ' Cloud sync enabled!' : ' Expires in 24 hours.'}
                </div>
                <CloudSyncStatus 
                  status={currentSyncStatus} 
                  isEnabled={cloudSyncEnabled}
                />
              </div>
            </div>

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
                  
                  {/* Auto-saved notice */}
                  <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-xs flex items-center justify-between flex-wrap gap-2">
                    <span className="text-green-200">
                      ✓ Results auto-saved to Output Repository — check sidebar to download
                    </span>
                    <CloudSyncStatus 
                      status={currentSyncStatus} 
                      isEnabled={cloudSyncEnabled}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={downloadJSON}
                      className="px-3 py-1.5 text-sm rounded-lg bg-violet-500/30 text-violet-200 hover:bg-violet-500/50 transition-colors"
                    >
                      ↓ JSON
                    </button>
                    <button
                      onClick={downloadReport}
                      className="px-3 py-1.5 text-sm rounded-lg bg-cyan-500/30 text-cyan-200 hover:bg-cyan-500/50 transition-colors"
                    >
                      ↓ Report
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setResult(null);
                      setFiles([]);
                      setStoredFiles([]);
                      setStudentId("");
                      setSessionId(generateSessionId());
                    }}
                    className="px-4 py-2 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                  >
                    New Scan
                  </button>
                </div>
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

            {/* AI Insights Panel */}
            {result.analysis && (
              <AIInsights
                analysisData={result.analysis as unknown as Record<string, unknown>}
              />
            )}
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
