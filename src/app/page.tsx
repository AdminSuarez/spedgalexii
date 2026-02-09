import Image from "next/image";
import Link from "next/link";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { GXCard } from "@/components/ui/GXCard";
import ScriptPackButton from "@/components/galaxy/ScriptPackButton";
import { RunAllButton } from "@/components/galaxy/RunAllButton";

const MODULES = [
  {
    key: "deep-space",
    name: "Deep Space",
    icon: "",
    desc: "Beyond the surface — comprehensive IEP clarity & academic stability analysis",
    href: "/deep-space",
    featured: true,
  },
  {
    key: "accommodations",
    name: "Accommodations",
    icon: "",
    desc: "Audit IEP vs TestHound accommodations",
    href: "/accommodations",
  },
  {
    key: "goals",
    name: "Goals",
    icon: "",
    desc: "Score goals on TEA 4-component rubric",
    href: "/goals",
  },
  {
    key: "plaafp",
    name: "PLAAFP",
    icon: "",
    desc: "Extract present levels from IEP PDFs",
    href: "/plaafp",
  },
  {
    key: "services",
    name: "Services",
    icon: "",
    desc: "Minutes, settings, providers, LRE",
    href: "/services",
  },
  {
    key: "compliance",
    name: "Compliance",
    icon: "",
    desc: "ARD dates, FIE, REED, BIP deadlines",
    href: "/compliance",
  },
  {
    key: "assessments",
    name: "Assessments",
    icon: "",
    desc: "STAAR Alt, TELPAS Alt, disabilities",
    href: "/assessments",
  },
];

export default function OrbitHubPage() {
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
                SpEdGalexii
              </h1>

              <div className="cardMeta mt-3 text-white/70">Orbit Hub – Mission Control</div>
            </div>
          </div>

          <p className="cardBody mt-5 max-w-5xl text-white/85">
            Welcome to the <span className="text-white/95 font-semibold">Orbit Hub</span> – 
            your mission control center for the SpEdGalexii audit universe. Upload your 
            documents once and launch all modules, or navigate to individual modules 
            for focused analysis.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href="#launch"
              className="ctaBtn ctaBtn--deep inline-flex items-center justify-center"
              title="Jump to launch"
            >
              Launch Missions
            </a>

            <ScriptPackButton label="Download Script Pack (Blank PDF)" />
          </div>
        </div>

        {/* Module Overview Grid */}
        <GXCard className="mb-6 rounded-3xl popCard popCard--violet min-w-0">
          <div className="uiLabel text-white/70">Available Modules</div>

          <h2 className="moduleTitle mt-2 wrap-break-word">
            Galexii Fleet
          </h2>

          <p className="cardBody mt-3 max-w-5xl text-white/80">
            Each Galexii module extracts and analyzes a specific aspect of IEP 
            documentation. Use the "Run All" button below to process everything 
            at once, or click a module to work with it individually.
          </p>

          <div className="cardsGrid mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((mod) => (
              <Link key={mod.key} href={mod.href}>
                <GXCard 
                  variant="plain" 
                  interactive={true} 
                  className="popCard popCard--solar min-w-0 hover:scale-[1.02] transition-transform cursor-pointer"
                >
                  <div>
                    <div className="cardTitle text-white leading-tight wrap-break-word">
                      {mod.name}
                    </div>
                    <div className="text-sm text-white/60 mt-1">
                      {mod.desc}
                    </div>
                  </div>
                </GXCard>
              </Link>
            ))}
          </div>
        </GXCard>

        {/* Launch Section */}
        <div id="launch" className="space-y-6">
          {/* Easy Button - Run All Modules */}
          <RunAllButton />
          
          {/* Quick Tips */}
          <GXCard className="rounded-2xl popCard popCard--ember min-w-0">
            <div className="cardTitle text-white">Quick Tips</div>
            <ul className="cardBody mt-2 space-y-2 text-white/80">
              <li>
                <strong>Run All:</strong> Upload your IEP PDFs, CSVs, and exports once. 
                All modules will process and populate their tabs automatically.
              </li>
              <li>
                <strong>Per-Module:</strong> Visit individual module tabs to upload 
                specific files or re-run with different settings.
              </li>
              <li>
                <strong>Case Manager Filter:</strong> Select a specific case manager 
                to generate filtered exports for just their students.
              </li>
              <li>
                <strong>Results Persist:</strong> Your results are saved locally. 
                Refresh the page and your data will still be there!
              </li>
            </ul>
          </GXCard>
        </div>
      </div>
    </GalaxyShell>
  );
}
