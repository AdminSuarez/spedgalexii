import Image from "next/image";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { GXCard } from "@/components/ui/GXCard";
import DailyGoalTrackerCard from "@/components/trackers/DailyGoalTrackerCard";

export default function Page() {
  return (
    <GalaxyShell>
      <div className="page w-full">
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
                Trackers Galexii
              </h1>

              <div className="cardMeta mt-3 text-white/70">
                Data Collection Hub — Where progress becomes visible
              </div>
            </div>
          </div>

          <p className="cardBody mt-5 max-w-5xl text-white/85">
            The <span className="text-white/95 font-semibold">Trackers Galexii</span> provides 
            service minute tracking per class period, progress monitoring tools, and data collection 
            that doesn't melt your brain. Track IEP service delivery hours and export documentation.
          </p>

          <p className="cardBody mt-3 max-w-4xl text-teal-300/80 italic">
            "X hours per 2 weeks — every minute documented is a minute defended."
          </p>
        </div>

        {/* How to Use */}
        <GXCard className="mb-6 rounded-3xl popCard popCard--violet min-w-0">
          <div className="uiLabel text-white/70">Mission Briefing</div>

          <h2 className="moduleTitle mt-2 wrap-break-word">
            How to Use Daily Trackers
          </h2>

          <p className="cardBody mt-3 max-w-5xl text-white/80">
            Simple, powerful tools for tracking student progress throughout the day.
          </p>

          <div className="cardsGrid mt-5 grid gap-4 md:grid-cols-4">
            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-white leading-tight wrap-break-word">
                Enter Student Info
              </div>
              <p className="cardBody mt-2 text-white/80">
                ID, name, grade, date, and service type from the IEP.
              </p>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--violet min-w-0">
              <div className="cardTitle text-white leading-tight wrap-break-word">
                Set IEP Minutes
              </div>
              <p className="cardBody mt-2 text-white/80">
                Enter required minutes per 2-week cycle from the IEP services page.
              </p>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--ember min-w-0">
              <div className="cardTitle text-white leading-tight wrap-break-word">
                Log by Period
              </div>
              <p className="cardBody mt-2 text-white/80">
                Track minutes per class period (1st–8th). Auto-totals daily minutes.
              </p>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--cyan min-w-0">
              <div className="cardTitle text-white leading-tight wrap-break-word">
                Export Data
              </div>
              <p className="cardBody mt-2 text-white/80">
                Download as Excel for service logs and compliance documentation.
              </p>
            </GXCard>
          </div>
        </GXCard>

        {/* Daily Goal Tracker */}
        <div className="mb-6">
          <DailyGoalTrackerCard />
        </div>

        {/* Feature Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
            <div className="cardTitle text-white leading-tight wrap-break-word">
              Weekly Progress Tracker
            </div>
            <ul className="cardBody mt-2 space-y-1 text-white/80">
              <li>• Weekly progress tracker templates</li>
              <li>• Auto-summarize for progress reporting</li>
            </ul>
          </GXCard>

          <GXCard variant="plain" interactive={false} className="popCard popCard--violet min-w-0">
            <div className="cardTitle text-white leading-tight wrap-break-word">
              Trial Data Collection
            </div>
            <ul className="cardBody mt-2 space-y-1 text-white/80">
              <li>• Trial/attempt data collection</li>
              <li>• Save tracker sessions to case manager portfolio</li>
            </ul>
          </GXCard>
        </div>
      </div>
    </GalaxyShell>
  );
}
