import { GalaxyShell } from "@/components/galaxy/GalaxyShell";

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="sidebarTile sidebarTile--mint p-5 md:p-6">
      <div className="uiLabel text-white/70">Module</div>
      <h1 className="moduleTitle mt-2">{title}</h1>
      <div className="cardBody mt-3 text-white/80">{subtitle}</div>
    </div>
  );
}

export default function Page() {
  return (
    <GalaxyShell>
      <Header
        title="Services Galexii"
        subtitle="Normalize minutes, setting, provider, schedule, and build a clean service grid."
      />

      <div className="mt-6 gx-card gx-stroke">
        <div className="cardTitle text-white">Coming soon</div>
        <div className="cardBody mt-2 text-white/80">
          Planned flow:
          <ul>
            <li>Paste or upload services section text</li>
            <li>Extract minutes + frequency + location + provider</li>
            <li>Detect missing components and mismatches</li>
            <li>Export a services grid for audit evidence</li>
          </ul>
        </div>
      </div>
    </GalaxyShell>
  );
}
