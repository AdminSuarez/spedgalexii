// src/app/accommodations/page.tsx
import Image from "next/image";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { UploadCard } from "@/components/galaxy/UploadCard";
import { GXCard } from "@/components/ui/GXCard";

export default function AccommodationsPage() {
  return (
    <GalaxyShell>
      <div className="page w-full px-2 pt-8 pb-4 md:px-4 md:pt-12 md:pb-6">
        {/* Universe Header */}
        <div className="mb-10">
          <div className="heroBrandRow">
            <div className="heroIconWrap">
              <div className="heroIcon rounded-full bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center text-6xl">
                🛡️
              </div>
            </div>

            <div className="min-w-0 heroAura">
              <h1 className="heroTitle wrap-break-word">
                Accommodations Galexii
              </h1>

              <div className="cardMeta mt-3 text-white/70">
                🌌 Shield Station — Ensuring every student gets what they need
              </div>
            </div>
          </div>

          <p className="cardBody mt-5 max-w-5xl text-white/85">
            The <span className="text-white/95 font-semibold">Accommodations Galexii</span> audits 
            whether each student's accommodations match across your sources — IEP, TestHound, roster. 
            It catches what's missing, what's inconsistent, and what's undocumented before an auditor does.
          </p>

          <p className="cardBody mt-3 max-w-4xl text-violet-300/80 italic">
            "Accommodations are promises. This module makes sure we keep them."
          </p>
        </div>

        {/* Module Overview */}
        <GXCard className="mb-6 rounded-3xl popCard popCard--violet min-w-0">
          <div className="uiLabel text-white/70">Mission Briefing</div>

          <h2 className="moduleTitle mt-2 wrap-break-word">
            🎯 What This Module Does
          </h2>

          <p className="cardBody mt-3 max-w-5xl text-white/80">
            Upload your documents once. Galexii extracts, normalizes, compares, and reports. 
            The output is an auditor-ready spreadsheet with color-coded match indicators.
          </p>

          <div className="cardsGrid mt-5 grid gap-4 md:grid-cols-3">
            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-white leading-tight wrap-break-word">
                📤 What You Upload
              </div>
              <ul className="cardBody mt-2 space-y-1 text-white/80">
                <li>• IEP PDFs (one or many)</li>
                <li>• Roster file (CSV/XLSX)</li>
                <li>• ID crosswalk (optional)</li>
                <li>• TestHound export (CSV/XLSX)</li>
              </ul>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--violet min-w-0">
              <div className="cardTitle text-white leading-tight wrap-break-word">
                ⚙️ What It Does
              </div>
              <ul className="cardBody mt-2 space-y-1 text-white/80">
                <li>• Extracts accommodations from IEP PDFs</li>
                <li>• Normalizes names/types/subjects</li>
                <li>• Compares against roster + TestHound</li>
                <li>• Logs the run for transparency</li>
              </ul>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--ember min-w-0">
              <div className="cardTitle text-white leading-tight wrap-break-word">
                📥 What You Get
              </div>
              <ul className="cardBody mt-2 space-y-1 text-white/80">
                <li>• REQUIRED_AUDIT_TABLE spreadsheet</li>
                <li>• Clear "what's missing" indicators</li>
                <li>• Run log link for audit trails</li>
                <li>• Per-case-manager exports</li>
              </ul>
            </GXCard>
          </div>
        </GXCard>

        {/* Upload Card */}
        <UploadCard module="accommodations" />
      </div>
    </GalaxyShell>
  );
}
