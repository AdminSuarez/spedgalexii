import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { UploadCard } from "@/components/galaxy/UploadCard";
import { GXCard } from "@/components/ui/GXCard";

export default function Page() {
  return (
    <GalaxyShell>
      <div className="page w-full px-2 pt-8 pb-4 md:px-4 md:pt-12 md:pb-6">
        {/* Universe Header */}
        <div className="mb-10">
          <div className="heroBrandRow">
            <div className="heroIconWrap">
              <div className="heroIcon rounded-full bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center text-6xl">
                ✅
              </div>
            </div>

            <div className="min-w-0 heroAura">
              <h1 className="heroTitle wrap-break-word">
                Compliance Timeline
              </h1>

              <div className="cardMeta mt-3 text-white/70">
                ⏰ Mission Control Clock — Never miss a deadline again
              </div>
            </div>
          </div>

          <p className="cardBody mt-5 max-w-5xl text-white/85">
            The <span className="text-white/95 font-semibold">Compliance Timeline</span> tracks 
            every critical deadline — ARD dates, FIE triennial evaluations, REED reviews, and BIP 
            requirements. Know what's coming before it becomes a violation.
          </p>

          <p className="cardBody mt-3 max-w-4xl text-amber-300/80 italic">
            "Compliance isn't bureaucracy. It's keeping promises on schedule."
          </p>
        </div>

        {/* What it tracks */}
        <GXCard className="mb-6 rounded-3xl popCard popCard--violet min-w-0">
          <div className="uiLabel text-white/70">Mission Briefing</div>

          <h2 className="moduleTitle mt-2 wrap-break-word">
            📋 What Compliance Galexii Tracks
          </h2>

          <div className="cardsGrid mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-red-300 leading-tight">
                📅 ARD/Annual Review
              </div>
              <p className="cardBody mt-2 text-white/80">
                Plan start/end dates, days until due, meeting compliance
              </p>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-yellow-300 leading-tight">
                🔬 FIE/3-Year Evaluation
              </div>
              <p className="cardBody mt-2 text-white/80">
                Last FIE date, next FIE due, evaluation report tracking
              </p>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-cyan-300 leading-tight">
                📝 REED Evaluations
              </div>
              <p className="cardBody mt-2 text-white/80">
                REED type, date, and evaluation deadlines
              </p>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-blue-300 leading-tight">
                🧠 BIP/FBA
              </div>
              <p className="cardBody mt-2 text-white/80">
                Behavioral plan review dates and compliance status
              </p>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-green-300 leading-tight">
                🚦 Status Indicators
              </div>
              <p className="cardBody mt-2 text-white/80">
                OVERDUE, DUE SOON (60 days), OK — at a glance
              </p>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-purple-300 leading-tight">
                📊 Compliance Score
              </div>
              <p className="cardBody mt-2 text-white/80">
                Per-student compliance percentage calculation
              </p>
            </GXCard>
          </div>
        </GXCard>

        {/* Status Legend */}
        <GXCard className="mb-6 rounded-2xl popCard popCard--ember min-w-0">
          <div className="cardTitle text-white">🚦 Color-Coded Status Legend</div>
          <div className="cardBody mt-3 text-white/80 space-y-3">
            <div className="flex items-center gap-3">
              <span className="inline-block w-5 h-5 rounded bg-red-500"></span>
              <span><strong className="text-red-300">OVERDUE</strong> — Past the deadline, immediate action needed</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block w-5 h-5 rounded bg-yellow-500"></span>
              <span><strong className="text-yellow-300">DUE SOON</strong> — Within 60 days of deadline</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block w-5 h-5 rounded bg-green-500"></span>
              <span><strong className="text-green-300">OK</strong> — More than 60 days until deadline</span>
            </div>
          </div>
        </GXCard>

        {/* Upload Card */}
        <UploadCard module="compliance" />
      </div>
    </GalaxyShell>
  );
}
