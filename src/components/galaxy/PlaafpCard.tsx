"use client";

import React from "react";
import { ClipboardList, FileText, Sparkles, FileDown } from "lucide-react";

export function PlaafpCard() {
  return (
    <section className="popCard popCard--mint min-w-0 overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="cardTitle flex items-center gap-2 text-white min-w-0">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/5">
              <ClipboardList size={18} className="opacity-90" />
            </span>
            <span className="min-w-0 truncate">PLAAFP Extraction + Audit</span>
          </div>
          <p className="cardBody mt-2 max-w-4xl text-white/80">
            This module will extract Present Levels and organize them into
            <span className="text-white/90"> strengths</span>,{" "}
            <span className="text-white/90">needs</span>,{" "}
            <span className="text-white/90">impact statements</span>,{" "}
            <span className="text-white/90">data points</span>, and{" "}
            <span className="text-white/90">classroom performance</span> sections.
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
            <li>• Strengths + needs</li>
            <li>• Current performance</li>
            <li>• Impact statements</li>
            <li>• Supporting data</li>
          </ul>
        </div>

        <div className="popCard popCard--violet min-w-0 overflow-hidden">
          <div className="cardTitle text-white">What it will flag</div>
          <ul className="cardBody mt-2 space-y-1 text-white/80">
            <li>• Missing data points</li>
            <li>• Vague needs</li>
            <li>• Missing impact statement</li>
            <li>• No classroom context</li>
          </ul>
        </div>

        <div className="popCard popCard--solar min-w-0 overflow-hidden">
          <div className="cardTitle text-white">What you’ll export</div>
          <ul className="cardBody mt-2 space-y-1 text-white/80">
            <li>• PLAAFP_TABLE.xlsx</li>
            <li>• PLAAFP_EVIDENCE_PACKET.pdf (later)</li>
            <li>• Copy/paste PLAAFP blocks</li>
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
          Upload + Run PLAAFP
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
        Next wiring: connect PLAAFP extraction to the pipeline runner and artifacts folder.
      </div>
    </section>
  );
}
