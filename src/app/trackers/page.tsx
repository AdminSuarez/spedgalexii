import { GalaxyShell } from "@/components/galaxy/GalaxyShell";

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="sidebarTile sidebarTile--violet p-5 md:p-6">
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
        title="Trackers"
        subtitle="Weekly/daily progress sheets, trials, and data collection that doesn’t melt your brain."
      />

      <div className="mt-6 gx-card gx-stroke">
        <div className="cardTitle text-white">Coming soon</div>
        <div className="cardBody mt-2 text-white/80">
          Planned flow:
          <ul>
            <li>Create a tracker template (frequency, metric, criteria)</li>
            <li>Quick-entry daily/weekly logs</li>
            <li>Auto-summarize for progress reporting</li>
            <li>Export PDFs/CSV for documentation</li>
          </ul>
        </div>
      </div>
    </GalaxyShell>
  );
}
