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
              <div className="heroIcon rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-6xl">
                📊
              </div>
            </div>

            <div className="min-w-0 heroAura">
              <h1 className="heroTitle wrap-break-word">
                Assessment Profiles
              </h1>

              <div className="cardMeta mt-3 text-white/70">
                🔭 Observatory — See the whole picture of every student
              </div>
            </div>
          </div>

          <p className="cardBody mt-5 max-w-5xl text-white/85">
            The <span className="text-white/95 font-semibold">Assessment Profiles</span> module 
            consolidates STAAR Alt 2, TELPAS Alt status, disabilities, and testing accommodations 
            into one unified view for ARD committee decisions.
          </p>

          <p className="cardBody mt-3 max-w-4xl text-purple-300/80 italic">
            "Assessment profiles reveal the student. Goals and services should follow."
          </p>
        </div>

        {/* What it tracks */}
        <GXCard className="mb-6 rounded-3xl popCard popCard--violet min-w-0">
          <div className="uiLabel text-white/70">Mission Briefing</div>

          <h2 className="moduleTitle mt-2 wrap-break-word">
            🎯 What Assessment Profile Galexii Tracks
          </h2>

          <div className="cardsGrid mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-red-300 leading-tight">
                📝 STAAR Alternate 2
              </div>
              <p className="cardBody mt-2 text-white/80">
                Alt assessment status and reason codes for state testing eligibility
              </p>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-yellow-300 leading-tight">
                🗣️ TELPAS Alternate
              </div>
              <p className="cardBody mt-2 text-white/80">
                English language proficiency alternate assessment tracking for ELs
              </p>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-cyan-300 leading-tight">
                🏷️ Primary Disability
              </div>
              <p className="cardBody mt-2 text-white/80">
                Student's primary disability category from the IEP for PEIMS reporting
              </p>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-blue-300 leading-tight">
                🏷️ Secondary Disability
              </div>
              <p className="cardBody mt-2 text-white/80">
                Additional disability categories if applicable (OHI, AU, etc.)
              </p>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-green-300 leading-tight">
                🛡️ Testing Accommodations
              </div>
              <p className="cardBody mt-2 text-white/80">
                Comprehensive list of state testing accommodations from IEP
              </p>
            </GXCard>

            <GXCard variant="plain" interactive={false} className="popCard popCard--solar min-w-0">
              <div className="cardTitle text-purple-300 leading-tight">
                🚩 Assessment Flags
              </div>
              <p className="cardBody mt-2 text-white/80">
                Summary indicators for quick ARD committee reference
              </p>
            </GXCard>
          </div>
        </GXCard>

        {/* Why it matters */}
        <GXCard className="mb-6 rounded-2xl popCard popCard--ember min-w-0">
          <div className="cardTitle text-white">💡 Why Assessment Profiles Matter for IEP Development</div>
          <div className="cardBody mt-3 text-white/80 space-y-4">
            <div>
              <strong className="text-cyan-300">PLAAFP Impact:</strong> Disabilities and assessment status 
              directly inform Present Levels. Alt 2 students have different baseline expectations.
            </div>
            <div>
              <strong className="text-yellow-300">Accommodations Planning:</strong> Testing accommodations 
              must align with instructional accommodations. This profile ensures consistency.
            </div>
            <div>
              <strong className="text-green-300">Goal Alignment:</strong> Students on STAAR Alt 2 should have 
              goals aligned to prerequisite skills. This profile helps ensure goals match pathways.
            </div>
          </div>
        </GXCard>

        {/* Data Sources */}
        <GXCard className="mb-6 rounded-2xl popCard popCard--violet min-w-0">
          <div className="cardTitle text-white">📂 Data Sources</div>
          <div className="cardBody mt-3 text-white/80 space-y-2">
            <div className="flex items-center gap-3">
              <span className="inline-block w-3 h-3 rounded bg-purple-500"></span>
              <span><strong>Student_Alternate_Assessments-2.csv</strong> — STAAR Alt 2 status and reason codes</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block w-3 h-3 rounded bg-cyan-500"></span>
              <span><strong>Telpas_By_Student.csv</strong> — TELPAS alternate assessment status</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block w-3 h-3 rounded bg-yellow-500"></span>
              <span><strong>Disabilities_By_Student.csv</strong> — Primary and secondary disability categories</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-block w-3 h-3 rounded bg-green-500"></span>
              <span><strong>FULLStudent_Accommodations-6.csv</strong> — Testing accommodations from IEP</span>
            </div>
          </div>
        </GXCard>

        {/* Upload Card */}
        <UploadCard module="assessments" />
      </div>
    </GalaxyShell>
  );
}
