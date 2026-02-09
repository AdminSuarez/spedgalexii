// src/components/galaxy/RunAllButton.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Rocket,
  CheckCircle,
  XCircle,
  Loader2,
  Upload,
  ChevronDown,
  ChevronUp,
  Users,
  User,
} from "lucide-react";

type Scope = "all" | "case_manager";

type CaseManagerOption = {
  key: string;
  label: string;
  filename: string;
};

type ModuleResult = {
  module: string;
  runId?: string;
  ok: boolean;
  error?: string;
};

type RunAllResponse = {
  ok: boolean;
  message?: string;
  results?: ModuleResult[];
  runIds?: Record<string, string>;
  error?: string;
};

const ALL_MODULES = [
  { key: "accommodations", label: "Accommodations Audit", icon: "" },
  { key: "goals", label: "Goals Analysis", icon: "" },
  { key: "plaafp", label: "PLAAFP Extraction", icon: "" },
  { key: "services", label: "Services Summary", icon: "" },
  { key: "compliance", label: "Compliance Tracker", icon: "" },
  { key: "assessments", label: "Assessment Profile", icon: "" },
] as const;

const LS_RUNALL_KEY = "spedgalexii:runAll:v1";

function isCaseManagersResponse(x: unknown): x is { ok: true; caseManagers: CaseManagerOption[] } {
  if (!x || typeof x !== "object") return false;
  if ((x as Record<string, unknown>).ok !== true) return false;
  const cms = (x as Record<string, unknown>).caseManagers;
  if (!Array.isArray(cms)) return false;
  return true;
}

export function RunAllButton() {
  const [files, setFiles] = useState<FileList | null>(null);
  const [scope, setScope] = useState<Scope>("all");
  const [caseManagers, setCaseManagers] = useState<CaseManagerOption[]>([]);
  const [caseManagerKey, setCaseManagerKey] = useState<string>("");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ModuleResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadBatchId, setUploadBatchId] = useState<string | null>(null);

  const fileCount = files?.length ?? 0;
  const hasFiles = fileCount > 0;

  const selectedCM = useMemo(() => {
    return caseManagers.find((c) => c.key === caseManagerKey);
  }, [caseManagers, caseManagerKey]);

  // Load case managers
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/case-managers");
        const json: unknown = await res.json();
        if (isCaseManagersResponse(json)) {
          setCaseManagers(json.caseManagers);
          if (json.caseManagers.length > 0 && !caseManagerKey) {
            setCaseManagerKey(json.caseManagers[0]?.key || "");
          }
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  // Load last run from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_RUNALL_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data?.results) {
          setResults(data.results);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  async function uploadFiles(): Promise<string | null> {
    if (!files || files.length === 0) return null;

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) formData.append("files", file);
    }

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const json: unknown = await res.json();

    if (json && typeof json === "object" && "uploadBatchId" in json) {
      return (json as { uploadBatchId: string }).uploadBatchId;
    }
    throw new Error("Upload failed");
  }

  async function runAll() {
    setError(null);
    setResults(null);
    setBusy(true);

    try {
      // Step 1: Upload files
      const batchId = await uploadFiles();
      if (!batchId) {
        setError("Failed to upload files");
        setBusy(false);
        return;
      }
      setUploadBatchId(batchId);

      // Step 2: Run all modules
      const body = {
        uploadBatchId: batchId,
        scope,
        ...(scope === "case_manager" && caseManagerKey
          ? {
              caseManagerKey,
              caseManagerName: selectedCM?.label || caseManagerKey.replaceAll("_", " "),
            }
          : {}),
      };

      const res = await fetch("/api/run-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json: RunAllResponse = await res.json();

      if (json.results) {
        setResults(json.results);
        
        // Save to localStorage for persistence
        try {
          localStorage.setItem(
            LS_RUNALL_KEY,
            JSON.stringify({
              results: json.results,
              runIds: json.runIds,
              savedAt: new Date().toISOString(),
            })
          );
          
          // Also save individual module runIds to their respective localStorage keys
          if (json.runIds) {
            for (const [mod, runId] of Object.entries(json.runIds)) {
              const moduleKey = `spedgalexii:lastRun:v2:${mod}`;
              localStorage.setItem(
                moduleKey,
                JSON.stringify({
                  runId,
                  scope,
                  caseManagerKey: scope === "case_manager" ? caseManagerKey : undefined,
                  module: mod,
                  savedAt: new Date().toISOString(),
                })
              );
            }
          }
        } catch {
          // ignore storage errors
        }
      }

      if (!json.ok && json.error) {
        setError(json.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run modules");
    } finally {
      setBusy(false);
    }
  }

  const successCount = results?.filter((r) => r.ok).length ?? 0;
  const totalCount = results?.length ?? 0;

  return (
    <div className="bg-gradient-to-br from-purple-900/40 via-indigo-900/30 to-blue-900/40 rounded-2xl border border-purple-500/30 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-white">Run All Modules</h3>
            <p className="text-sm text-gray-400">
              Upload once, populate all sidebar tabs instantly
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {results && (
            <span
              className={`text-sm font-medium ${
                successCount === totalCount ? "text-green-400" : "text-yellow-400"
              }`}
            >
              {successCount}/{totalCount} complete
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-6 pb-6 space-y-4 border-t border-white/10 pt-4">
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Upload All Documents
            </label>
            <div className="relative">
              <input
                type="file"
                multiple
                accept=".pdf,.csv,.xlsx,.xls"
                onChange={(e) => setFiles(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={busy}
              />
              <div
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed transition-colors ${
                  hasFiles
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-gray-600 hover:border-purple-500/50 hover:bg-purple-500/5"
                }`}
              >
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400">
                  {hasFiles
                    ? `${fileCount} file${fileCount > 1 ? "s" : ""} selected`
                    : "Drop files or click to browse"}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              IEP PDFs, roster.csv, TestHound exports, Frontline CSVs, etc.
            </p>
          </div>

          {/* Scope Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Scope</label>
            <div className="flex gap-2">
              <button
                onClick={() => setScope("all")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  scope === "all"
                    ? "bg-purple-600 border-purple-500 text-white"
                    : "bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                <Users className="w-4 h-4" />
                All Students
              </button>
              <button
                onClick={() => setScope("case_manager")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  scope === "case_manager"
                    ? "bg-purple-600 border-purple-500 text-white"
                    : "bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600"
                }`}
              >
                <User className="w-4 h-4" />
                Case Manager
              </button>
            </div>
          </div>

          {/* Case Manager Dropdown */}
          {scope === "case_manager" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Case Manager
              </label>
              <select
                value={caseManagerKey}
                onChange={(e) => setCaseManagerKey(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:border-purple-500 focus:outline-none"
              >
                {caseManagers.map((cm) => (
                  <option key={cm.key} value={cm.key}>
                    {cm.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Run Button */}
          <button
            onClick={runAll}
            disabled={!hasFiles || busy}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-lg transition-all ${
              hasFiles && !busy
                ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/25"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            {busy ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Running All Modules...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                Run All Modules
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Results */}
          {results && results.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-300">Results</h4>
              <div className="grid gap-2">
                {ALL_MODULES.map((mod) => {
                  const result = results.find((r) => r.module === mod.key);
                  return (
                    <div
                      key={mod.key}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        result?.ok
                          ? "bg-green-500/10 border border-green-500/30"
                          : result
                          ? "bg-red-500/10 border border-red-500/30"
                          : "bg-gray-800/50 border border-gray-700"
                      }`}
                    >
                      <span className="flex-1 text-white">{mod.label}</span>
                      {result?.ok ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : result ? (
                        <XCircle className="w-5 h-5 text-red-400" />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tip */}
          <p className="text-xs text-gray-500 italic">
            After running, visit each sidebar tab to view and download the extracted data.
            Your results are saved locally and will persist across page refreshes.
          </p>
        </div>
      )}
    </div>
  );
}
