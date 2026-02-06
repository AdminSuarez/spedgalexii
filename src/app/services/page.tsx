import Image from "next/image";
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
                Services Galexii
              </h1>

              <div className="cardMeta mt-3 text-white/70">
                Engine Room — Where support hours become reality
              </div>
            </div>
          </div>

          <p className="cardBody mt-5 max-w-5xl text-white/85">
            The <span className="text-white/95 font-semibold">Services Galexii</span> extracts 
            IEP services, instructional settings, LRE analysis, and provider information from 
            Frontline exports. Know exactly what each student is entitled to receive.
          </p>

          <p className="cardBody mt-3 max-w-4xl text-teal-300/80 italic">
            "Minutes matter. Every hour documented is an hour delivered."
          </p>
        </div>

        {/* What it extracts */}
        <GXCard className="mb-6 rounded-3xl popCard popCard--violet min-w-0">
          <div className="uiLabel text-white/70">Mission Briefing</div>

          <h2 className="moduleTitle mt-2 wrap-break-word">
            What Services Galexii Extracts
          </h2>

          <p className="cardBody mt-3 max-w-5xl text-white/80">
            Comprehensive service data pulled from IEP documentation and Frontline exports.
          </p>

          <div className="cardsGrid mt-5 grid gap-4 md:grid-cols-3">
            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-white leading-tight wrap-break-word">
                Service Details
              </div>
              <ul className="cardBody mt-2 space-y-1 text-white/80">
                <li>• Speech therapy (SLP)</li>
                <li>• Occupational therapy (OT)</li>
                <li>• Physical therapy (PT)</li>
                <li>• Counseling services</li>
                <li>• Specialized instruction</li>
              </ul>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--violet min-w-0">
              <div className="cardTitle text-white leading-tight wrap-break-word">
                Instructional Settings
              </div>
              <ul className="cardBody mt-2 space-y-1 text-white/80">
                <li>• Minutes in GenEd vs SpEd</li>
                <li>• Setting codes (00, 40, 41, etc.)</li>
                <li>• LRE percentage calculation</li>
                <li>• Removal justifications</li>
              </ul>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--ember min-w-0">
              <div className="cardTitle text-white leading-tight wrap-break-word">
                Provider Info
              </div>
              <ul className="cardBody mt-2 space-y-1 text-white/80">
                <li>• SLP codes and frequency</li>
                <li>• Program descriptions</li>
                <li>• Service delivery models</li>
                <li>• Provider assignments</li>
              </ul>
            </GXCard>
          </div>
        </GXCard>

        {/* Upload Card */}
        <UploadCard module="services" />
      </div>
    </GalaxyShell>
  );
}
