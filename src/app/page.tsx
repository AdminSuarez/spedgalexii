import Image from "next/image";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { UploadCard } from "@/components/galaxy/UploadCard";
import { GXCard } from "@/components/ui/GXCard";
import ScriptPackButton from "@/components/galaxy/ScriptPackButton";

export default function Page() {
  return (
    <GalaxyShell>
      <div className="page w-full px-2 pt-8 pb-4 md:px-4 md:pt-12 md:pb-6">
        {/* Universe Header */}
        <div className="mb-10">
          <div className="heroBrandRow">
            <div className="heroIconWrap">
              <Image
                src="/brand/galexii-logo-round.png"
                alt="SpEdGalexii"
                width={140}
                height={140}
                priority
                className="heroIcon rounded-full bg-black"
              />
            </div>

            <div className="min-w-0 heroAura">
              <h1 className="heroTitle wrap-break-word">
                SpEdGalexii <span className="opacity-90">🌌</span>
              </h1>

              <div className="cardMeta mt-3 text-white/70">Audit Universe for Special Education workflows</div>
            </div>
          </div>

          <p className="cardBody mt-5 max-w-5xl text-white/85">
            A modular audit universe for Special Education workflows. Each{" "}
            <span className="text-white/95">Galexii</span> is a launchable system
            to verify compliance, catch missing items, and export clean evidence
            for ARD/IEP documentation.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href="#upload"
              className="ctaBtn ctaBtn--deep inline-flex items-center justify-center"
              title="Jump to upload"
            >
              Go to Upload
            </a>

            <ScriptPackButton label="Download Script Pack (Blank PDF)" />
          </div>
        </div>

        {/* Module Header */}
        <GXCard className="mb-6 rounded-3xl popCard popCard--violet min-w-0">
          <div className="uiLabel text-white/70">Module System</div>

          <h2 className="moduleTitle mt-2 wrap-break-word">
            Accommodation Galexii
          </h2>

          <p className="cardBody mt-3 max-w-5xl text-white/80">
            This system audits whether each student’s accommodations match across
            your sources, then outputs an auditor-friendly spreadsheet view of
            what’s present, missing, or inconsistent.
          </p>

          <div className="cardsGrid mt-5 grid gap-4 md:grid-cols-3">
            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-white leading-tight wrap-break-word">
                What you upload
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
                What it does
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
                What you get
              </div>
              <ul className="cardBody mt-2 space-y-1 text-white/80">
                <li>• Export-ready spreadsheet outputs</li>
                <li>• Clear “what’s missing” indicators</li>
                <li>• Run log link for audit trails</li>
                <li>• Consistent formatting for review</li>
              </ul>
            </GXCard>
          </div>
        </GXCard>

        <div id="upload">
          <UploadCard />
        </div>
      </div>
    </GalaxyShell>
  );
}
