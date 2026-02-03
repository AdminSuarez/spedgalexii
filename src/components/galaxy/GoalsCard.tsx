"use client";

import React from "react";
import { Target, FileText, Sparkles, FileDown } from "lucide-react";

export function GoalsCard() {
  return (
    <section className="popCard popCard--violet min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="cardTitle flex items-center gap-2 text-white min-w-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/5">
              <Target size={18} className="opacity-90" />
            </span>
            <span className="min-w-0 truncate">Goals Extraction + Audit</span>
          </div>
          <p className="cardBody mt-2 max-w-4xl text-white/80">
            This module will read IEP PDFs and produce a goals matrix:
            <span className="text-white/90"> goal area</span>,{" "}
            <span className="text-white/90">baseline</span>,{" "}
            <span className="text-white/90">measurable criteria</span>,{" "}
            <span className="text-white/90">measurement schedule</span>,{" "}
            <span className="text-white/90">mastery</span>.
          </p>
        </div>

        <span className="galaxy-pill shrink-0">
          <Sparkles size={14} className="opacity-80" />
          scaffolding live
        </span>
      </div>

      <div className="cardsGrid mt-5 grid gap-4 md:grid-cols-3 min-w-0">
        <div className="popCard popCard--green min-w-0 overflow-hidden">
          <div className="cardTitle text-white">What it will pull</div>
          <ul className="cardBody mt-2 space-y-1 text-white/80">
            <li>• Goals (academic/functional)</li>
            <li>• Baselines + data points</li>
            <li>• Conditions + criteria</li>
            <li>• Mastery & schedule</li>
          </ul>
        </div>

        <div className="popCard popCard--violet min-w-0 overflow-hidden">
          <div className="cardTitle text-white">What it will flag</div>
          <ul className="cardBody mt-2 space-y-1 text-white/80">
            <li>• Missing baseline</li>
            <li>• Vague measurement</li>
            <li>• Non-measurable verbs</li>
            <li>• Missing progress cadence</li>
          </ul>
        </div>

        <div className="popCard popCard--pink min-w-0 overflow-hidden">
          <div className="cardTitle text-white">What you’ll export</div>
          <ul className="cardBody mt-2 space-y-1 text-white/80">
            <li>• GOALS_TABLE.xlsx</li>
            <li>• GOALS_EVIDENCE_PACKET.pdf (later)</li>
            <li>• Copy/paste goal blocks</li>
            <li>• Student grouped views</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          disabled
          className="ctaBtn ctaBtn--deep inline-flex items-center justify-center gap-2 disabled:opacity-55"
          title="We’ll wire this to the pipeline next."
        >
          <FileText size={16} />
          Upload + Run Goals
        </button>

        <button
          type="button"
          disabled
          className="ctaBtn ctaBtn--deep inline-flex items-center justify-center gap-2 disabled:opacity-55"
          title="Exports appear after pipeline wiring."
        >
          <FileDown size={16} />
          Reveal Exports
        </button>
      </div>

      <div className="cardMeta mt-4 text-white/65">
        Next wiring: hook to the same Upload → Run flow, but route to a goals runner + artifacts folder.
      </div>
    </section>
  );
}
