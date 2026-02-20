"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ScriptPackButton from "@/components/galaxy/ScriptPackButton";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { GXCard } from "@/components/ui/GXCard";

type RunManifest = {
  ok?: boolean;
  runId?: string;
  status?: string;
  startedAt?: string;
  finishedAt?: string;
  outputs?: {
    primaryXlsx?: string;
    xlsxList?: string[];
    pdf?: string;
    gsheetUrl?: string;
    gformUrl?: string;
  };
  selection?: {
    scope?: string;
    caseManagerKey?: string;
    caseManagerName?: string;
    uploadBatchId?: string;
    cacheHit?: boolean;
  };
};

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}

function safeStr(x: unknown) {
  return typeof x === "string" ? x : "";
}

export default function ResultsPage({ params }: { params: { runId: string } }) {
  const runId = (params?.runId ?? "").trim();

  const [manifest, setManifest] = useState<RunManifest | null>(null);
  const [log, setLog] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setMsg(null);

      try {
        const m = await fetch(`/api/run/${encodeURIComponent(runId)}/manifest`, { method: "GET" });
        const mj: unknown = await m.json();
        if (!cancelled) setManifest(isObject(mj) ? (mj as RunManifest) : null);
      } catch {
        if (!cancelled) setMsg("Could not load manifest.");
      }

      try {
        const r = await fetch(`/api/run/${encodeURIComponent(runId)}`, { method: "GET" });
        const rj: unknown = await r.json();
        if (!cancelled) {
          if (isObject(rj) && rj.ok === true && typeof rj.log === "string") setLog(rj.log);
          else setLog("");
        }
      } catch {
        if (!cancelled) setMsg((prev) => prev ?? "Could not load run log.");
      }
    }

    if (runId) void load();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const status = useMemo(() => safeStr(manifest?.status) || "unknown", [manifest?.status]);

  const canExcel = true;
  const canPdf = Boolean(safeStr(manifest?.outputs?.pdf));

  function openArtifact(format: "xlsx" | "pdf") {
    const url = new URL(`/api/artifacts/${encodeURIComponent(runId)}`, window.location.origin);
    url.searchParams.set("format", format);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  return (
    <GalaxyShell>
      <div className="page w-full">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="uiLabel text-white/70">Results Hub</div>
            <h1 className="heroTitle mt-2 wrap-break-word">Run {runId}</h1>
            <div className="cardMeta mt-2 text-white/70">
              Status:{" "}
              <span className="text-white/90">
                {status}
                {manifest?.selection?.cacheHit ? " (cache)" : ""}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/#upload"
              className="ctaBtn ctaBtn--deep inline-flex items-center justify-center"
            >
              Back to Upload
            </Link>

            <ScriptPackButton runId={runId} label="Download Script Pack (This Run)" />
          </div>
        </div>

        {msg ? (
          <GXCard className="mb-4 rounded-3xl popCard popCard--ember min-w-0">
            <div className="cardBody text-white/85">{msg}</div>
          </GXCard>
        ) : null}

        <GXCard className="mb-6 rounded-3xl popCard popCard--violet min-w-0">
          <div className="uiLabel text-white/70">Exports</div>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => openArtifact("xlsx")}
              className="ctaBtn ctaBtn--pink inline-flex items-center justify-center disabled:opacity-60"
              disabled={!canExcel}
            >
              Reveal Excel
            </button>

            <button
              type="button"
              onClick={() => openArtifact("pdf")}
              className="ctaBtn ctaBtn--violet inline-flex items-center justify-center disabled:opacity-60"
              disabled={!canPdf}
              title={canPdf ? "Reveal PDF" : "PDF not generated for this run yet"}
            >
              Reveal PDF
            </button>

            <a
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white/90 hover:bg-white/10 cardBody"
              href={`/api/run/${encodeURIComponent(runId)}`}
              target="_blank"
              rel="noreferrer"
            >
              Open Log (raw)
            </a>
          </div>

          <div className="cardMeta mt-3 text-white/60">
            Tip: Excel always tries first. PDF appears only if your run produced one.
          </div>
        </GXCard>

        <GXCard className="rounded-3xl popCard popCard--violet min-w-0">
          <div className="uiLabel text-white/70">Run Log</div>
          <pre className="mt-3 max-h-130 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-3 leading-relaxed text-white/80 cardBody whitespace-pre-wrap wrap-break-word">
            {log || "No log yet."}
          </pre>
        </GXCard>
      </div>
    </GalaxyShell>
  );
}
