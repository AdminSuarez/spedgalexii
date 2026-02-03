"use client";

import React from "react";
import { ExternalLink, FileDown, FileText, RefreshCw, Sparkles } from "lucide-react";
import ScriptPackButton from "@/components/galaxy/ScriptPackButton";

type Scope = "all" | "case_manager";
type GalexiiModule = "accommodations" | "goals" | "plaafp";

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

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function isStringArray(x: unknown): x is string[] {
  return Array.isArray(x) && x.every((v) => typeof v === "string");
}
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
function safeBasename(p: string) {
  const parts = p.split("/").filter(Boolean);
  return parts.at(-1) ?? p;
}

export default function RunHubClient({ runId }: { runId: string }) {
  const [manifest, setManifest] = React.useState<RunManifest | null>(null);
  const [log, setLog] = React.useState<string>("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function refreshAll() {
    setBusy(true);
    setMsg(null);
    try {
      const [mRes, lRes] = await Promise.all([
        fetch(`/api/run/${encodeURIComponent(runId)}/manifest`, { method: "GET" }),
        fetch(`/api/run/${encodeURIComponent(runId)}`, { method: "GET" }),
      ]);

      const mj: unknown = await mRes.json();
      if (isManifest(mj)) setManifest(mj);

      const lj: unknown = await lRes.json();
      if (isObject(lj) && lj.ok === true && typeof lj.log === "string") setLog(lj.log);
    } catch {
      setMsg("Could not refresh run data.");
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const xlsxList = React.useMemo(() => {
    const list = (manifest?.outputs.xlsxList ?? []).filter(
      (it): it is string => typeof it === "string" && it.length > 0
    );
    const unique = Array.from(new Set(list));
    unique.sort((a, b) => safeBasename(a).localeCompare(safeBasename(b)));
    return unique;
  }, [manifest]);

  function openArtifact(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function artifactUrl(params: { format: "xlsx" | "pdf"; file?: string }) {
    const u = new URL(`/api/artifacts/${encodeURIComponent(runId)}`, window.location.origin);
    u.searchParams.set("format", params.format);
    if (params.file) u.searchParams.set("file", params.file);
    return u.toString();
  }

  const primaryXlsx = manifest?.outputs.primaryXlsx ?? xlsxList[0];

  return (
    <section className="galaxy-card galaxy-cardGlow popCard popCard--violet min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="cardTitle flex min-w-0 items-center gap-2 text-white">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5">
              <Sparkles size={16} className="opacity-80" />
            </span>
            <span className="min-w-0 truncate">Results Hub</span>
          </div>

          <p className="cardBody mt-2 max-w-2xl text-white/80">
            Run ID: <span className="font-mono text-white/85">{runId}</span>
          </p>

          {manifest ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="galaxy-pill">
                Status:{" "}
                <span className="ml-1 font-semibold">
                  {manifest.status === "done" ? "Complete" : manifest.status === "running" ? "Running" : "Error"}
                </span>
              </span>
              {manifest.selection?.module ? <span className="galaxy-pill">Module: {manifest.selection.module}</span> : null}
              {manifest.selection?.scope ? <span className="galaxy-pill">Scope: {manifest.selection.scope}</span> : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={busy}
            className="ctaBtn ctaBtn--deep inline-flex items-center gap-2 disabled:opacity-60"
          >
            <RefreshCw size={16} />
            {busy ? "Refreshing…" : "Refresh"}
          </button>

          <ScriptPackButton runId={runId} />

          <a
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white/90 backdrop-blur hover:bg-white/10 cardBody"
            href={`/api/run/${runId}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} />
            Open log
          </a>
        </div>
      </div>

      {msg ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-white/80 cardBody min-w-0 break-words">
          {msg}
        </div>
      ) : null}

      {/* Outputs */}
      <div className="mt-6 popCard popCard--violet min-w-0 overflow-hidden">
        <div className="cardMeta font-semibold uppercase tracking-[0.22em] text-white/70">Outputs</div>
        <div className="cardTitle mt-1 min-w-0 truncate text-white">Exports</div>
        <div className="cardsGrid mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4 min-w-0">
          <div className="group popCard popCard--pink transition min-w-0 overflow-hidden">
            <div className="cardTitle min-w-0 truncate text-white">Excel Spreadsheet</div>
            <div className="cardBody mt-1 text-white/80">Primary export for this run (if present).</div>
            <button
              type="button"
              disabled={!primaryXlsx}
              onClick={() => primaryXlsx && openArtifact(artifactUrl({ format: "xlsx", file: primaryXlsx }))}
              className="ctaBtn ctaBtn--pink mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              <FileDown size={16} />
              Reveal Excel
            </button>
            {primaryXlsx ? (
              <div className="cardMeta mt-2 text-white/70 font-mono break-all">{safeBasename(primaryXlsx)}</div>
            ) : (
              <div className="cardMeta mt-2 text-white/60">No Excel artifact detected.</div>
            )}
          </div>

          <div className="group popCard popCard--violet transition min-w-0 overflow-hidden">
            <div className="cardTitle min-w-0 truncate text-white">PDF Summary</div>
            <div className="cardBody mt-1 text-white/80">Only activates if generated by the run.</div>
            <button
              type="button"
              disabled={!manifest?.outputs.pdf}
              onClick={() => openArtifact(artifactUrl({ format: "pdf" }))}
              className="ctaBtn ctaBtn--violet mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-50"
            >
              <FileText size={16} />
              Reveal PDF
            </button>
            {!manifest?.outputs.pdf ? <div className="cardMeta mt-2 text-white/60">Not generated for this run.</div> : null}
          </div>

          <div className="group popCard popCard--green transition min-w-0 overflow-hidden">
            <div className="cardTitle min-w-0 truncate text-white">Script Pack</div>
            <div className="cardBody mt-1 text-white/80">Print-ready checklist aligned to your deck order.</div>
            <div className="mt-4">
              <ScriptPackButton runId={runId} label="Download Script Pack" />
            </div>
            <div className="cardMeta mt-2 text-white/60">Works even if other artifacts aren’t ready.</div>
          </div>

          <div className="group popCard popCard--violet transition min-w-0 overflow-hidden">
            <div className="cardTitle min-w-0 truncate text-white">Slide Template Link</div>
            <div className="cardBody mt-1 text-white/80">Optional: open the generator endpoint directly.</div>
            <button
              type="button"
              onClick={() => openArtifact(`/api/script-pack?runId=${encodeURIComponent(runId)}`)}
              className="ctaBtn ctaBtn--violet mt-4 inline-flex w-full items-center justify-center gap-2"
            >
              <ExternalLink size={16} />
              Open Script Pack URL
            </button>
          </div>
        </div>

        {/* Produced list */}
        {xlsxList.length > 0 ? (
          <div className="mt-5 popCard popCard--violet min-w-0 overflow-hidden">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="cardTitle min-w-0 truncate text-white">Produced Excel Files</div>
              <div className="cardMeta shrink-0 text-white/70">Click to download</div>
            </div>

            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3 min-w-0">
              {xlsxList.slice(0, 12).map((rel) => (
                <button
                  key={rel}
                  type="button"
                  onClick={() => openArtifact(artifactUrl({ format: "xlsx", file: rel }))}
                  className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left text-white/80 hover:bg-white/10 cardBody overflow-hidden"
                  title={rel}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileDown size={14} className="opacity-80 shrink-0" />
                    <span className="min-w-0 truncate font-mono">{safeBasename(rel)}</span>
                  </div>
                </button>
              ))}
            </div>

            {xlsxList.length > 12 ? <div className="cardMeta mt-3 text-white/60">Showing 12 of {xlsxList.length}.</div> : null}
          </div>
        ) : null}
      </div>

      {/* Log preview */}
      <div className="mt-6 popCard popCard--violet min-w-0 overflow-hidden">
        <div className="mb-3 flex items-center justify-between">
          <div className="cardTitle min-w-0 truncate text-white">Run Log Preview</div>
          <div className="cardMeta shrink-0 text-white/70">{manifest?.status ?? "Unknown"}</div>
        </div>
        <pre className="max-h-[340px] overflow-auto rounded-2xl border border-white/10 bg-black/30 p-3 leading-relaxed text-white/80 cardBody whitespace-pre-wrap break-words">
          {log || "No logs yet."}
        </pre>
      </div>
    </section>
  );
}