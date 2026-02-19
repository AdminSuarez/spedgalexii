"use client";

import React, { useEffect, useState } from "react";
import type { GalexiiModule, Scope } from "./UploadCard";

type PreflightSeverity = "info" | "warning" | "error";

type PreflightCheck = {
  id: string;
  label: string;
  passed: boolean;
  severity: PreflightSeverity;
  details?: string | undefined;
};

type PreflightResponse = {
  ok: true;
  module: GalexiiModule;
  scope: Scope;
  caseManagerName?: string | undefined;
  checks: PreflightCheck[];
  overallStatus: "ok" | "warning" | "error";
};

function statusLabel(status: PreflightResponse["overallStatus"]): string {
  if (status === "error") return "Blocking issues";
  if (status === "warning") return "Warnings";
  return "Ready";
}

function statusClass(status: PreflightResponse["overallStatus"]): string {
  if (status === "error") {
    return "border-rose-300/40 bg-rose-500/10 text-rose-100";
  }
  if (status === "warning") {
    return "border-amber-300/40 bg-amber-500/10 text-amber-100";
  }
  return "border-emerald-300/40 bg-emerald-500/10 text-emerald-100";
}

function bulletIconClass(passed: boolean, severity: PreflightSeverity): string {
  if (passed) {
    return "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/70 text-[10px] text-black";
  }
  if (severity === "error") {
    return "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-500/80 text-[10px] text-white";
  }
  return "flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400/80 text-[10px] text-black";
}

export function PreflightChecklist({
  module,
  scope,
  caseManagerName,
}: {
  module: GalexiiModule;
  scope: Scope;
  caseManagerName?: string | undefined;
}) {
  const [data, setData] = useState<PreflightResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enabled = true;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function run() {
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("module", module);
        params.set("scope", scope);
        if (caseManagerName) params.set("caseManagerName", caseManagerName);

        const res = await fetch(`/api/preflight?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        const json = (await res.json()) as PreflightResponse;
        if (!cancelled && json && json.ok) {
          setData(json);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "Preflight check failed.";
          setError(msg);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [module, scope, caseManagerName, enabled]);

  if (!enabled) return null;

  if (!data && !error) {
    return (
      <div className="mt-3 rounded-2xl border border-white/12 bg-black/20 px-3 py-2 text-xs text-white/70">
        Checking inputs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-3 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
        Preflight check error: {error}
      </div>
    );
  }

  if (!data) return null;

  const { checks, overallStatus } = data;

  return (
    <div className="mt-3 rounded-2xl border border-white/12 bg-black/25 p-3 text-xs sm:text-sm text-white/80">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-white/90">Preflight checklist</div>
        <span
          className={
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold " +
            statusClass(overallStatus)
          }
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current/80" />
          {statusLabel(overallStatus)}
        </span>
      </div>

      {checks.length === 0 ? (
        <p className="mt-2 text-[11px] text-white/70">
          No specific checks for this module yet.
        </p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {checks.map((check) => (
            <li key={check.id} className="flex items-start gap-2">
              <span className={bulletIconClass(check.passed, check.severity)}>
                {check.passed ? "✓" : check.severity === "error" ? "!" : "?"}
              </span>
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs text-white/90">
                  {check.label}
                </div>
                {!check.passed && check.details ? (
                  <div className="text-[11px] text-white/70">{check.details}</div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
