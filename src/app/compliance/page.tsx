import { GalaxyShell } from "@/components/galaxy/GalaxyShell";

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="sidebarTile sidebarTile--solar p-5 md:p-6">
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
        title="Compliance Timeline"
        subtitle="Track deadlines, meetings, notices, and documentation with audit-grade clarity."
      />

      <div className="mt-6 gx-card gx-stroke">
        <div className="cardTitle text-white">Coming soon</div>
        <div className="cardBody mt-2 text-white/80">
          Planned flow:
          <ul>
            <li>Enter key dates (FIE, REED, ARD, PWN, annual)</li>
            <li>Auto-calculate due windows</li>
            <li>Flag “past due” items (row-level)</li>
            <li>Generate a compliance log export</li>
          </ul>
        </div>
      </div>
    </GalaxyShell>
  );
}
