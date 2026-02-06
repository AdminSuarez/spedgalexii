// src/components/galaxy/UploadCard.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Sparkles,
  FileText,
  Copy,
  ExternalLink,
  RefreshCw,
  Users,
  User,
  Sheet,
  FileDown,
  History,
} from "lucide-react";

type Scope = "all" | "case_manager";
type ArtifactFormat = "xlsx" | "pdf" | "gsheet" | "gform";

export type GalexiiModule = "accommodations" | "goals" | "plaafp" | "services" | "compliance" | "assessments";

// Used only for “copy path” UX (filesystem MVP)
const OUTPUT_PATH = "AccommodationsAudit/output/";
const LS_LAST_RUN_KEY_PREFIX = "spedgalexii:lastRun:v2";

// Manual entry sentinel
const MANUAL_CM_KEY = "__manual__";

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === "string");
}
function safeBasename(p: string) {
  const parts = p.split("/").filter(Boolean);
  const last = parts.at(-1);
  return last ?? p;
}

function looksDone(log: string) {
  return log.includes("[RUN DONE]") || log.includes("[RUN ERROR]") || log.includes("Traceback");
}
function looksSuccess(log: string) {
  return log.includes("[RUN DONE]") && !log.includes("[RUN ERROR]") && !log.includes("Traceback");
}

type CaseManagerOption = {
  key: string;
  label: string;
  filename: string;
};

function isCaseManagersResponse(x: unknown): x is { ok: true; caseManagers: CaseManagerOption[] } {
  if (!isObject(x)) return false;
  if (x.ok !== true) return false;
  const cms = (x as Record<string, unknown>).caseManagers;
  if (!Array.isArray(cms)) return false;
  return cms.every((it) => {
    if (!isObject(it)) return false;
    return typeof it.key === "string" && typeof it.label === "string" && typeof it.filename === "string";
  });
}

function isOkLog(x: unknown): x is { ok: true; log: string } {
  if (!isObject(x)) return false;
  return x.ok === true && typeof x.log === "string";
}

type RunManifest = {
  ok: true;
  runId: string;
  status: "running" | "done" | "error";
  startedAt: string;
  finishedAt?: string;
  selection?: {
    scope: Scope;
    caseManagerKey?: string;
    caseManagerName?: string;
    uploadBatchId?: string;
    module?: GalexiiModule;
  };
  outputs: {
    primaryXlsx?: string;
    pdf?: string;
    xlsxList?: string[];
    gsheetUrl?: string;
    gformUrl?: string;
  };
};

function isManifest(x: unknown): x is RunManifest {
  if (!isObject(x)) return false;
  if (x.ok !== true) return false;
  if (typeof x.runId !== "string") return false;
  if (typeof x.status !== "string") return false;
  if (!isObject(x.outputs)) return false;

  const outputs = x.outputs as Record<string, unknown>;
  if (outputs.primaryXlsx !== undefined && typeof outputs.primaryXlsx !== "string") return false;
  if (outputs.pdf !== undefined && typeof outputs.pdf !== "string") return false;
  if (outputs.xlsxList !== undefined && !isStringArray(outputs.xlsxList)) return false;
  if (outputs.gsheetUrl !== undefined && typeof outputs.gsheetUrl !== "string") return false;
  if (outputs.gformUrl !== undefined && typeof outputs.gformUrl !== "string") return false;

  return true;
}

type LastRunCache = {
  runId: string;
  scope: Scope;
  caseManagerKey?: string;
  module: GalexiiModule;
  savedAt: string;
};

function lsKey(module: GalexiiModule) {
  return `${LS_LAST_RUN_KEY_PREFIX}:${module}`;
}

function readLastRunCache(module: GalexiiModule): LastRunCache | null {
  // IMPORTANT: Only call after mount (client). This function touches window/localStorage.
  try {
    if (typeof window === "undefined") return null;

    const raw = window.localStorage.getItem(lsKey(module));
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed)) return null;
    if (typeof parsed.runId !== "string") return null;
    if (parsed.scope !== "all" && parsed.scope !== "case_manager") return null;

    const mod = parsed.module;
    const moduleOut: GalexiiModule =
      mod === "goals" || mod === "plaafp" || mod === "accommodations" || mod === "services" || mod === "compliance" || mod === "assessments" ? mod : module;

    const out: LastRunCache = {
      runId: parsed.runId,
      scope: parsed.scope,
      module: moduleOut,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      ...(typeof parsed.caseManagerKey === "string" ? { caseManagerKey: parsed.caseManagerKey } : {}),
    };
    return out;
  } catch {
    return null;
  }
}

function writeLastRunCache(cache: LastRunCache) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(lsKey(cache.module), JSON.stringify(cache));
  } catch {
    // ignore
  }
}

function moduleCopy(module: GalexiiModule) {
  switch (module) {
    case "goals":
      return {
        title: "Upload + Run Goals Galexii",
        subtitle:
          "Upload your FULLGoals_By_Student CSV export. Goals are scored on 4 TEA components.",
        tip: "Tip: Each goal is scored on Timeframe, Condition, Behavior, and Criterion (0-4 scale).",
        plannedExcelAll: "GOALS_TABLE__ALL_CASE_MANAGERS.xlsx",
        plannedExcelCM: "GOALS_TABLE__<CASE_MANAGER>.xlsx",
      };
    case "plaafp":
      return {
        title: "Upload + Run PLAAFP Galexii",
        subtitle:
          "Upload IEP PDFs to extract PLAAFP sections: Strengths, Concerns, Impact, Data, Parent Input.",
        tip: "Tip: PLAAFP completeness is scored 0-5 based on how many sections are found in each IEP.",
        plannedExcelAll: "PLAAFP_TABLE__ALL_CASE_MANAGERS.xlsx",
        plannedExcelCM: "PLAAFP_TABLE__<CASE_MANAGER>.xlsx",
      };
    case "services":
      return {
        title: "Upload + Run Services Galexii",
        subtitle:
          "Extract IEP services, instructional settings, speech codes, and LRE analysis from Frontline exports.",
        tip: "Tip: Uses FULLIEP_Program_Names and FULLSummary CSV files for comprehensive service analysis.",
        plannedExcelAll: "SERVICES_TABLE__ALL_CASE_MANAGERS.xlsx",
        plannedExcelCM: "SERVICES_TABLE__<CASE_MANAGER>.xlsx",
      };
    case "compliance":
      return {
        title: "Upload + Run Compliance Galexii",
        subtitle:
          "Track IEP compliance: ARD due dates, FIE/3-year evals, REED deadlines, BIP/FBA reviews.",
        tip: "Tip: Merges data from Summary, Evaluation, REED, and BIP spreadsheets. Color-coded status: OVERDUE (red), DUE SOON (yellow), OK (green).",
        plannedExcelAll: "COMPLIANCE_TABLE__ALL_CASE_MANAGERS.xlsx",
        plannedExcelCM: "COMPLIANCE_TABLE__<CASE_MANAGER>.xlsx",
      };
    case "assessments":
      return {
        title: "Upload + Run Assessment Profile Galexii",
        subtitle:
          "Consolidate STAAR Alt 2, TELPAS Alt status, primary disabilities, and testing accommodations for IEP planning.",
        tip: "Tip: Uses Student_Alternate_Assessments, Telpas_By_Student, Disabilities_By_Student, and Student_Accommodations CSVs to build comprehensive assessment profiles.",
        plannedExcelAll: "ASSESSMENT_PROFILE__ALL_CASE_MANAGERS.xlsx",
        plannedExcelCM: "ASSESSMENT_PROFILE__<CASE_MANAGER>.xlsx",
      };
    default:
      return {
        title: "Upload + Run Accommodation Galexii",
        subtitle: "Upload a combo of: IEP PDFs, roster.csv, id_crosswalk.csv, testhound_export.xlsx/csv.",
        tip: "Tip: In Case Manager scope, your Excel export should only include that case manager’s students.",
        plannedExcelAll: "REQUIRED_AUDIT_TABLE__ALL_CASE_MANAGERS.xlsx",
        plannedExcelCM: "REQUIRED_AUDIT_TABLE__<CASE_MANAGER>.xlsx",
      };
  }
}

// Match the normalization used in /api/run/route.ts (keyFromName)
function keyFromName(name: string): string {
  const cleaned = (name || "")
    .trim()
    .replaceAll(",", "")
    .replaceAll(" ", "_")
    .replace(/[^A-Za-z0-9_]+/g, "");
  return cleaned || "BLANK_CASE_MANAGER";
}

export function UploadCard({ module = "accommodations" }: { module?: GalexiiModule }) {
  const COPY = moduleCopy(module);

  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  const [log, setLog] = useState<string>("");
  const [polling, setPolling] = useState(false);
  const pollTimer = useRef<number | null>(null);

  const [scope, setScope] = useState<Scope>("all");
  const [caseManagers, setCaseManagers] = useState<CaseManagerOption[]>([]);
  const [caseManagerKey, setCaseManagerKey] = useState<string>("");
  const [manualCaseManagerName, setManualCaseManagerName] = useState<string>("");

  const [manifest, setManifest] = useState<RunManifest | null>(null);

  // ✅ Hydration-safe: lastRun is loaded AFTER mount, so server/client initial HTML matches.
  const [lastRun, setLastRun] = useState<LastRunCache | null>(null);

  const fileCount = files?.length ?? 0;
  const hasFiles = fileCount > 0;

  const fileNames = useMemo(() => {
    if (!files) return [];
    return Array.from(files).map((f) => f.name);
  }, [files]);

  const isDone = useMemo(() => looksDone(log), [log]);
  const isSuccess = useMemo(() => looksSuccess(log), [log]);

  const isManual = scope === "case_manager" && caseManagerKey === MANUAL_CM_KEY;

  const selectedCaseManagerOption = useMemo(() => {
    return caseManagers.find((c) => c.key === caseManagerKey) ?? null;
  }, [caseManagers, caseManagerKey]);

  const resolvedCaseManagerKey = useMemo(() => {
    if (scope !== "case_manager") return "";
    if (isManual) return keyFromName(manualCaseManagerName);
    return caseManagerKey || "";
  }, [scope, isManual, manualCaseManagerName, caseManagerKey]);

  const resolvedCaseManagerName = useMemo(() => {
    if (scope !== "case_manager") return "";
    if (isManual) return manualCaseManagerName.trim();
    // if dropdown-selected, prefer label
    return selectedCaseManagerOption?.label ?? caseManagerKey.replaceAll("_", " ");
  }, [scope, isManual, manualCaseManagerName, selectedCaseManagerOption, caseManagerKey]);

  function stopPolling() {
    if (pollTimer.current !== null) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    setPolling(false);
  }

  async function fetchLog(id: string) {
    try {
      const res = await fetch(`/api/run/${encodeURIComponent(id)}`, { method: "GET" });
      const json: unknown = await res.json();

      if (!isOkLog(json)) {
        if (isObject(json) && json.ok === false && typeof json.error === "string") {
          setMsg(json.error);
        } else {
          setMsg("Could not read run log.");
        }
        return;
      }

      setLog(json.log || "");

      if (looksDone(json.log || "")) {
        stopPolling();
      }
    } catch {
      setMsg("Could not fetch run log (network error).");
    }
  }

  async function fetchManifest(id: string) {
    try {
      const res = await fetch(`/api/run/${encodeURIComponent(id)}/manifest`, { method: "GET" });
      const json: unknown = await res.json();
      if (!isManifest(json)) return;
      setManifest(json);
    } catch {
      // best-effort
    }
  }

  function startPolling(id: string) {
    stopPolling();
    setPolling(true);

    void fetchLog(id);
    pollTimer.current = window.setInterval(() => {
      void fetchLog(id);
    }, 1000);
  }

  // Load known case managers
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/case-managers", { method: "GET" });
        const json: unknown = await res.json();
        if (!cancelled && isCaseManagersResponse(json)) {
          setCaseManagers(json.caseManagers);
          if (!caseManagerKey && json.caseManagers.length > 0) {
            const first = json.caseManagers[0];
            if (first) setCaseManagerKey(first.key);
          }
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Resume last run per module (hydration-safe)
  useEffect(() => {
    // Only runs on client after mount
    const cached = readLastRunCache(module);
    setLastRun(cached);
    
    // Auto-resume the last run to show previous results immediately
    if (cached?.runId) {
      setRunId(cached.runId);
      void fetchManifest(cached.runId);
      void fetchLog(cached.runId);
      
      if (cached.scope) setScope(cached.scope);
      if (cached.caseManagerKey) {
        // We'll set this after caseManagers loads
      }
    }
  }, [module]);
  
  // When caseManagers loads and we have a lastRun, restore the CM selection
  useEffect(() => {
    if (lastRun?.caseManagerKey && caseManagers.length > 0) {
      const exists = caseManagers.some((c) => c.key === lastRun.caseManagerKey);
      if (exists) {
        setCaseManagerKey(lastRun.caseManagerKey);
      } else {
        setCaseManagerKey(MANUAL_CM_KEY);
        setManualCaseManagerName(lastRun.caseManagerKey.replaceAll("_", " "));
      }
    }
  }, [lastRun, caseManagers]);

  const canResume = Boolean(lastRun?.runId);

  function onResumeLastRun() {
    if (!lastRun?.runId) return;
    setMsg("Resuming last run…");
    setRunId(lastRun.runId);
    setLog("");
    setManifest(null);
    startPolling(lastRun.runId);
    void fetchManifest(lastRun.runId);

    if (lastRun.scope) setScope(lastRun.scope);
    if (lastRun.caseManagerKey) {
      // If the last run key is not in the dropdown, switch to manual and keep the key visible as typed placeholder
      const exists = caseManagers.some((c) => c.key === lastRun.caseManagerKey);
      if (exists) {
        setCaseManagerKey(lastRun.caseManagerKey);
      } else {
        setCaseManagerKey(MANUAL_CM_KEY);
        setManualCaseManagerName(lastRun.caseManagerKey.replaceAll("_", " "));
      }
    }
  }

  // When done, fetch manifest once
  useEffect(() => {
    if (runId && isDone) {
      void fetchManifest(runId);
    }
  }, [runId, isDone]);

  // Persist last run (per module)
  useEffect(() => {
    if (!runId) return;
    writeLastRunCache({
      runId,
      scope,
      module,
      ...(scope === "case_manager" && resolvedCaseManagerKey ? { caseManagerKey: resolvedCaseManagerKey } : {}),
      savedAt: new Date().toISOString(),
    });
    // Optional: update in-memory resume data immediately
    setLastRun({
      runId,
      scope,
      module,
      ...(scope === "case_manager" && resolvedCaseManagerKey ? { caseManagerKey: resolvedCaseManagerKey } : {}),
      savedAt: new Date().toISOString(),
    });
  }, [runId, scope, resolvedCaseManagerKey, module]);

  useEffect(() => {
    return () => stopPolling();
  }, []);

  function onCopyRunLink() {
    if (!runId) return;
    const url = `${window.location.origin}/api/run/${runId}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setMsg("Copied run log link to clipboard.");
  }

  function onCopyOutputPath() {
    navigator.clipboard.writeText(OUTPUT_PATH).catch(() => {});
    setMsg("Copied output folder path.");
  }

  function artifactUrl(params: { format: ArtifactFormat; file?: string }) {
    if (!runId) return null;
    const u = new URL(`/api/artifacts/${encodeURIComponent(runId)}`, window.location.origin);
    u.searchParams.set("format", params.format);
    if (params.file) u.searchParams.set("file", params.file);
    return u.toString();
  }

  // Pick the best Excel for this run and scope
  const exportXlsxList = useMemo(() => {
    const list = (manifest?.outputs.xlsxList ?? []).filter(
      (item): item is string => typeof item === "string" && item.length > 0
    );
    const unique = Array.from(new Set(list));
    unique.sort((a, b) => safeBasename(a ?? "").localeCompare(safeBasename(b ?? "")));
    return unique;
  }, [manifest]);

  const plannedExcelLabel = useMemo(() => {
    if (scope === "case_manager") {
      // If manual, show what we *expect* the file name to be
      if (isManual) {
        const k = resolvedCaseManagerKey || "CASE_MANAGER";
        return `REQUIRED_AUDIT_TABLE__${k}.xlsx`;
      }
      return selectedCaseManagerOption?.filename ?? COPY.plannedExcelCM;
    }
    return COPY.plannedExcelAll;
  }, [scope, selectedCaseManagerOption, COPY.plannedExcelAll, COPY.plannedExcelCM, isManual, resolvedCaseManagerKey]);

  const bestExcelRel = useMemo(() => {
    const primary = manifest?.outputs.primaryXlsx;
    if (primary) return primary;

    const list = exportXlsxList;
    if (list.length === 0) return undefined;

    const lower = list.map((p) => ({ p, b: safeBasename(p ?? "").toLowerCase() }));

    // Admin scope should prefer the ALL_CASE_MANAGERS workbook
    if (scope === "all") {
      const planned = (COPY.plannedExcelAll ?? "").toLowerCase();
      const all =
        lower.find((x) => x.b.includes("__all_case_managers")) ??
        (planned ? lower.find((x) => x.b === planned) : undefined) ??
        lower.find((x) => x.b.includes("all_case_managers"));
      if (all) return all.p;
    }

    // Case-manager scope prefers the selected CM key
    if (scope === "case_manager" && resolvedCaseManagerKey) {
      const key = resolvedCaseManagerKey.toLowerCase();
      const fuzzy = lower.find((x) => x.b.includes(`__${key}`)) ?? lower.find((x) => x.b.includes(key));
      if (fuzzy) return fuzzy.p;
    }

    return list[0];
  }, [manifest, exportXlsxList, scope, resolvedCaseManagerKey, COPY.plannedExcelAll]);

  async function onReveal(format: ArtifactFormat, file?: string) {
    if (!runId) {
      setMsg("No run yet. Start a run to reveal outputs.");
      return;
    }

    if (format === "pdf" && !manifest?.outputs.pdf) {
      setMsg("PDF output is not generated for this run yet.");
      return;
    }
    if (format === "gsheet" && !manifest?.outputs.gsheetUrl) {
      setMsg("Google Sheet export is not configured yet.");
      return;
    }
    if (format === "gform" && !manifest?.outputs.gformUrl) {
      setMsg("Google Form export is not configured yet.");
      return;
    }
    if (format === "xlsx" && !file && !bestExcelRel) {
      setMsg("Excel output is not available for this run yet.");
      return;
    }

    const resolvedFile = file ?? bestExcelRel;
    const url = artifactUrl({ format, ...(resolvedFile ? { file: resolvedFile } : {}) });
    if (!url) return;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function onSubmit() {
    if (busy) return;

    if (!files || files.length === 0) {
      setMsg("Pick files first (IEP PDFs + roster/crosswalk/TestHound export).");
      return;
    }

    if (scope === "case_manager") {
      if (isManual) {
        if (!manualCaseManagerName.trim()) {
          setMsg("Type your case manager name (manual entry) or choose one from the list.");
          return;
        }
        if (!resolvedCaseManagerKey || resolvedCaseManagerKey === "BLANK_CASE_MANAGER") {
          setMsg("Manual name produced an empty key. Try adding letters/numbers to the name.");
          return;
        }
      } else {
        if (!caseManagerKey) {
          setMsg("Choose a case manager (or switch to Admin scope).");
          return;
        }
      }
    }

    setBusy(true);
    setMsg(null);
    setLog("");
    setRunId(null);
    setManifest(null);
    stopPolling();

    try {
      // Upload
      const fd = new FormData();
      for (const f of Array.from(files)) fd.append("files", f);

      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const upJson: unknown = await up.json();

      if (!isObject(upJson) || upJson.ok !== true) {
        const err = isObject(upJson) && typeof upJson.error === "string" ? upJson.error : "Upload failed.";
        setMsg(err);
        return;
      }

      const uploadBatchId = typeof upJson.uploadBatchId === "string" ? upJson.uploadBatchId : "";
      if (!uploadBatchId) {
        setMsg("Upload succeeded but no uploadBatchId was returned. Cannot start a safe run.");
        return;
      }

      // Case manager argument: deterministic
      const cmKey = scope === "case_manager" ? resolvedCaseManagerKey : "";
      const cmName = scope === "case_manager" ? resolvedCaseManagerName : "";

      // Run (include module + uploadBatchId)
      const run = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module,
          scope,
          caseManagerKey: cmKey,
          caseManagerName: cmName,
          uploadBatchId,
        }),
      });

      const runJson: unknown = await run.json();

      if (!isObject(runJson) || runJson.ok !== true || typeof runJson.runId !== "string") {
        const err = isObject(runJson) && typeof runJson.error === "string" ? runJson.error : "Run failed.";
        setMsg(err);
        return;
      }

      setRunId(runJson.runId);
      setMsg("Run started. Streaming logs…");
      startPolling(runJson.runId);
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : "Something went wrong.";
      setMsg(m);
    } finally {
      setBusy(false);
    }
  }

  const canRevealExcel = Boolean(runId && isDone && bestExcelRel);
  const canRevealPdf = Boolean(runId && isDone && manifest?.outputs.pdf);
  const canRevealGsheet = Boolean(runId && isDone && manifest?.outputs.gsheetUrl);
  const canRevealGform = Boolean(runId && isDone && manifest?.outputs.gformUrl);

  return (
    <section className="galaxy-card galaxy-cardGlow popCard popCard--violet min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="cardTitle flex min-w-0 items-center gap-2 text-white">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5">
              <Sparkles size={16} className="opacity-80" />
            </span>
            <span className="min-w-0 truncate">{COPY.title}</span>
          </div>

          <p className="cardBody mt-2 max-w-2xl text-white/80">{COPY.subtitle}</p>

          {/* Status chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2 min-w-0">
            <span className="galaxy-pill">
              <FileText size={14} className="opacity-80" />
              Local filesystem MVP
            </span>

            <span className="galaxy-pill">
              <span
                className={[
                  "h-2 w-2 rounded-full",
                  busy
                    ? "bg-amber-400/80 shadow-[0_0_18px_rgba(251,191,36,0.35)]"
                    : isDone
                      ? isSuccess
                        ? "bg-emerald-400/80 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                        : "bg-rose-400/80 shadow-[0_0_18px_rgba(244,63,94,0.35)]"
                      : "bg-emerald-400/80 shadow-[0_0_18px_rgba(16,185,129,0.35)]",
                ].join(" ")}
              />
              {busy ? "Working…" : isDone ? (isSuccess ? "Complete" : "Finished (with errors)") : "Ready"}
            </span>

            {runId ? (
              <span className="galaxy-pill min-w-0">
                <span className="shrink-0">Run ID:</span>{" "}
                <span className="ml-1 min-w-0 truncate font-mono text-white/85" title={runId}>
                  {runId}
                </span>
              </span>
            ) : null}

            {canResume ? (
              <button
                type="button"
                onClick={onResumeLastRun}
                className="galaxy-pill hover:bg-white/10 transition"
                title="Resume the last run (no rerun)"
              >
                <History size={14} className="opacity-80" />
                Resume last run
              </button>
            ) : null}
          </div>
        </div>

        <div className="cardMeta shrink-0 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-white/70 max-w-full">
          <div className="flex max-w-full items-center gap-2">
            <span className="shrink-0">Outputs:</span>
            <span className="min-w-0 break-all font-mono text-white/70" title={OUTPUT_PATH}>
              {OUTPUT_PATH}
            </span>
            <button
              type="button"
              onClick={onCopyOutputPath}
              className="cardMeta ml-1 inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2 py-1 text-white/75 hover:bg-white/10"
              title="Copy output folder path"
            >
              <Copy size={12} />
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* Scope selector */}
      <div className="mt-6 popCard popCard--violet min-w-0 overflow-hidden">
        <div className="cardMeta font-semibold uppercase tracking-[0.22em] text-white/70">View Scope</div>

        <div className="mt-2 grid gap-3 lg:grid-cols-3 min-w-0">
          <button
            type="button"
            onClick={() => setScope("all")}
            className={[
              "min-w-0 rounded-3xl border-2 bg-white/5 p-4 text-left transition hover:bg-white/10 overflow-hidden",
              scope === "all"
                ? "border-emerald-400/60 shadow-[0_0_40px_rgba(16,185,129,0.10)]"
                : "border-white/25",
            ].join(" ")}
          >
            <div className="cardTitle flex min-w-0 items-center gap-2 text-white">
              <Users size={16} className="opacity-85 shrink-0" />
              <span className="min-w-0 truncate">Admin</span>
            </div>
            <div className="cardBody mt-1 text-white/80">Full picture across all case managers.</div>
          </button>

          <button
            type="button"
            onClick={() => setScope("case_manager")}
            className={[
              "min-w-0 rounded-3xl border-2 bg-white/5 p-4 text-left transition hover:bg-white/10 overflow-hidden",
              scope === "case_manager"
                ? "border-fuchsia-400/60 shadow-[0_0_40px_rgba(236,72,153,0.10)]"
                : "border-white/25",
            ].join(" ")}
          >
            <div className="cardTitle flex min-w-0 items-center gap-2 text-white">
              <User size={16} className="opacity-85 shrink-0" />
              <span className="min-w-0 truncate">Case Manager</span>
            </div>
            <div className="cardBody mt-1 text-white/80">Only the selected case manager’s students and exports.</div>
          </button>

          <div className="popCard popCard--violet min-w-0 overflow-hidden">
            <div className="cardTitle min-w-0 truncate text-white">Case Manager</div>
            <div className="mt-2 min-w-0">
              <select
                value={caseManagerKey}
                onChange={(e) => {
                  const v = e.target.value;
                  setCaseManagerKey(v);
                  if (v !== MANUAL_CM_KEY) setManualCaseManagerName("");
                }}
                disabled={scope !== "case_manager"}
                className="w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-white/85 outline-none disabled:opacity-50 cardBody"
              >
                {scope !== "case_manager" ? (
                  <option value="">(Switch to Case Manager scope)</option>
                ) : (
                  <>
                    {caseManagers.length === 0 ? <option value="">(No case managers detected yet)</option> : null}
                    {caseManagers.map((cm) => (
                      <option key={cm.key} value={cm.key}>
                        {cm.label}
                      </option>
                    ))}
                    <option value={MANUAL_CM_KEY}>(Not listed) Enter manually…</option>
                  </>
                )}
              </select>

              {scope === "case_manager" && caseManagerKey === MANUAL_CM_KEY ? (
                <div className="mt-2 min-w-0">
                  <input
                    value={manualCaseManagerName}
                    onChange={(e) => setManualCaseManagerName(e.target.value)}
                    placeholder="Type case manager name (e.g., Shelley Greenleaf)"
                    className="w-full min-w-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-white/85 outline-none cardBody"
                  />
                  <div className="cardMeta mt-2 text-white/70">
                    Key:{" "}
                    <span className="font-mono text-white/80">
                      {resolvedCaseManagerKey || "—"}
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="cardBody mt-2 text-white/70 min-w-0">
                {caseManagers.length === 0
                  ? "Tip: run once or ensure REQUIRED_AUDIT_TABLE__*.xlsx files exist in output."
                  : selectedCaseManagerOption
                    ? (
                      <span className="block min-w-0">
                        <span className="shrink-0">Will target:</span>{" "}
                        <span
                          className="block min-w-0 break-all font-mono text-white/75"
                          title={selectedCaseManagerOption.filename}
                        >
                          {selectedCaseManagerOption.filename}
                        </span>
                      </span>
                    )
                    : scope === "case_manager" && caseManagerKey === MANUAL_CM_KEY
                      ? (
                        <span className="block min-w-0">
                          <span className="shrink-0">Will target:</span>{" "}
                          <span className="block min-w-0 break-all font-mono text-white/75">
                            {plannedExcelLabel}
                          </span>
                        </span>
                      )
                      : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload area */}
      <div className="mt-6 min-w-0">
        <div className="popCard popCard--violet min-w-0 overflow-hidden">
          <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
            <div className="cardTitle min-w-0 truncate text-white">Files</div>
            <div className="cardMeta shrink-0 text-white/70">
              {hasFiles ? `${fileCount} selected` : "Choose PDFs + CSV/XLSX"}
            </div>
          </div>

          <input
            type="file"
            multiple
            onChange={(e) => setFiles(e.target.files)}
            className="block w-full min-w-0 cursor-pointer rounded-2xl border border-white/10 bg-black/30 p-3 text-white/80 file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white hover:bg-black/40 cardBody"
          />

          {hasFiles ? (
            <div className="mt-3 max-h-28 overflow-auto rounded-2xl border border-white/10 bg-black/20 p-3 text-white/75 min-w-0">
              <div className="cardMeta mb-2 text-white/75">Selected</div>
              <ul className="cardBody space-y-1 text-white/80 min-w-0">
                {fileNames.map((n) => (
                  <li key={n} className="truncate font-mono min-w-0" title={n}>
                    {n}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap items-center gap-3 min-w-0">
        <button
          disabled={busy || !hasFiles}
          onClick={onSubmit}
          className="ctaBtn ctaBtn--deep inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <Upload size={16} />
          {busy ? "Working…" : "Upload + Run"}
        </button>

        <button
          type="button"
          disabled={!runId}
          onClick={() => runId && startPolling(runId)}
          className="ctaBtn ctaBtn--deep inline-flex items-center gap-2 disabled:opacity-50"
          title="Refresh log streaming"
        >
          <RefreshCw size={16} />
          {polling ? "Streaming" : "Stream Logs"}
        </button>

        <button
          type="button"
          disabled={!runId}
          onClick={() => {
            if (!runId) return;
            const url = `${window.location.origin}/api/run/${runId}`;
            navigator.clipboard.writeText(url).catch(() => {});
            setMsg("Copied run log link to clipboard.");
          }}
          className="ctaBtn ctaBtn--deep inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Copy size={16} />
          Copy log link
        </button>

        {runId ? (
          <a
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white/90 hover:bg-white/10 cardBody"
            href={`/api/run/${runId}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} />
            Open log
          </a>
        ) : null}
      </div>

      {/* Message */}
      {msg ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-white/80 cardBody min-w-0 break-words">
          {msg}
        </div>
      ) : null}

      {/* Live Log Panel */}
      <div className="mt-5 min-w-0">
        <div className="popCard popCard--violet min-w-0 overflow-hidden">
          <div className="mb-3 flex items-center justify-between">
            <div className="cardTitle min-w-0 truncate text-white">Run Log</div>
            <div className="cardMeta shrink-0 text-white/70">
              {runId ? (polling ? "Live" : "Idle") : "Start a run to see logs"}
            </div>
          </div>

          <pre className="max-h-[340px] overflow-auto rounded-2xl border border-white/10 bg-black/30 p-3 leading-relaxed text-white/80 cardBody whitespace-pre-wrap break-words">
            {log || "No logs yet."}
          </pre>

          <div className="cardMeta mt-3 text-white/60">{COPY.tip}</div>
        </div>
      </div>

      {/* Reveal Outputs */}
      <div className="mt-6 min-w-0">
        <div className="popCard popCard--violet min-w-0 overflow-hidden">
          <div className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="cardMeta font-semibold uppercase tracking-[0.22em] text-white/70">Exports</div>
              <div className="cardTitle mt-1 min-w-0 truncate text-white">Reveal Outputs</div>
              <div className="cardBody mt-1 text-white/80">
                Buttons only activate when that artifact exists for this run.
              </div>
            </div>

            <div className="mt-2 md:mt-0 shrink-0">
              {isDone ? (
                <span
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 font-semibold cardMeta",
                    isSuccess
                      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.20)]"
                      : "border-rose-300/20 bg-rose-400/10 text-rose-100 shadow-[0_0_18px_rgba(244,63,94,0.20)]",
                  ].join(" ")}
                >
                  <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                  {isSuccess ? "Ready to export" : "Run finished (check log)"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-3 py-2 font-semibold text-white/70 cardMeta">
                  <span className="h-2 w-2 rounded-full bg-white/50" />
                  Waiting for completion
                </span>
              )}
            </div>
          </div>

          <div className="cardsGrid mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4 min-w-0">
            {/* Excel */}
            <div className="group popCard popCard--pink transition min-w-0 overflow-hidden">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="cardTitle min-w-0 truncate text-white">Excel Spreadsheet</div>
                <span className="cardMeta inline-flex shrink-0 items-center gap-1 rounded-full border border-white/12 bg-black/20 px-2 py-1 text-white/75">
                  <Sheet size={12} className="opacity-80" />
                  Primary
                </span>
              </div>

              <div className="cardBody mt-1 text-white/80">
                {scope === "all" ? "Admin export (all case managers)." : "Case Manager export (single)."}
              </div>

              <div className="cardMeta mt-2 text-white/70 min-w-0">
                <span className="shrink-0">Target:</span>{" "}
                <span
                  className="block min-w-0 break-all font-mono text-white/75"
                  title={safeBasename(bestExcelRel ?? plannedExcelLabel)}
                >
                  {safeBasename(bestExcelRel ?? plannedExcelLabel)}
                </span>
              </div>

              <button
                type="button"
                disabled={!Boolean(runId && isDone && bestExcelRel)}
                onClick={() => onReveal("xlsx", bestExcelRel)}
                className="ctaBtn ctaBtn--pink mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
              >
                <FileDown size={16} />
                Reveal Excel
              </button>

              {!bestExcelRel && isDone ? (
                <div className="cardMeta mt-2 text-white/60">No Excel artifact detected for this run.</div>
              ) : null}
            </div>

            {/* PDF */}
            <div className="group popCard popCard--violet transition min-w-0 overflow-hidden">
              <div className="cardTitle min-w-0 truncate text-white">PDF Summary</div>
              <div className="cardBody mt-1 text-white/80">A clean “audit packet” style PDF (when wired).</div>
              <button
                type="button"
                disabled={!canRevealPdf}
                onClick={() => onReveal("pdf")}
                className="ctaBtn ctaBtn--violet mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
              >
                <FileText size={16} />
                Reveal PDF
              </button>
              {!manifest?.outputs.pdf ? <div className="cardMeta mt-2 text-white/60">Not generated for this run.</div> : null}
            </div>

            {/* Google Sheet */}
            <div className="group popCard popCard--green transition min-w-0 overflow-hidden">
              <div className="cardTitle min-w-0 truncate text-white">Google Sheet</div>
              <div className="cardBody mt-1 text-white/80">Redirect to a shareable Sheet (later).</div>
              <button
                type="button"
                disabled={!canRevealGsheet}
                onClick={() => onReveal("gsheet")}
                className="ctaBtn ctaBtn--green mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
              >
                <ExternalLink size={16} />
                Reveal Sheet
              </button>
              {!manifest?.outputs.gsheetUrl ? <div className="cardMeta mt-2 text-white/60">Not configured for this run.</div> : null}
            </div>

            {/* Google Form */}
            <div className="group popCard popCard--violet transition min-w-0 overflow-hidden">
              <div className="cardTitle min-w-0 truncate text-white">Google Form</div>
              <div className="cardBody mt-1 text-white/80">Generate a form version (later).</div>
              <button
                type="button"
                disabled={!canRevealGform}
                onClick={() => onReveal("gform")}
                className="ctaBtn ctaBtn--violet mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
              >
                <ExternalLink size={16} />
                Reveal Form
              </button>
              {!manifest?.outputs.gformUrl ? <div className="cardMeta mt-2 text-white/60">Not configured for this run.</div> : null}
            </div>
          </div>

          {/* Produced list */}
          {exportXlsxList.length > 0 ? (
            <div className="mt-5 popCard popCard--violet min-w-0 overflow-hidden">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="cardTitle min-w-0 truncate text-white">Produced Excel Files</div>
                <div className="cardMeta shrink-0 text-white/70">Click a file to download</div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3 min-w-0">
                {exportXlsxList.slice(0, 12).map((rel) => (
                  <button
                    key={rel}
                    type="button"
                    disabled={!runId || !isDone}
                    onClick={() => onReveal("xlsx", rel)}
                    className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left text-white/80 hover:bg-white/10 disabled:opacity-50 cardBody overflow-hidden"
                    title={rel}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <FileDown size={14} className="opacity-80 shrink-0" />
                      <span className="min-w-0 truncate font-mono">{safeBasename(rel)}</span>
                    </div>
                  </button>
                ))}
              </div>

              {exportXlsxList.length > 12 ? (
                <div className="cardMeta mt-3 text-white/60">Showing 12 of {exportXlsxList.length}.</div>
              ) : null}
            </div>
          ) : null}

          <div className="cardMeta mt-4 text-white/60">Clean signal, no noise.</div>
        </div>
      </div>
    </section>
  );
}
