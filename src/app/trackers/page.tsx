import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import DailyGoalTrackerCard from "@/components/trackers/DailyGoalTrackerCard";

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
        subtitle="Weekly/daily progress sheets, trials, and data collection that doesn't melt your brain."
      />

      <div className="mt-6">
        <DailyGoalTrackerCard />
      </div>

      <div className="mt-6 gx-card gx-stroke">
        <div className="cardTitle text-white">How to Use Daily Trackers</div>
        <div className="cardBody mt-2 text-white/80">
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Enter Student Info:</strong> ID, name, grade, and date</li>
            <li><strong>Add Goals:</strong> Enter each goal you're tracking</li>
            <li><strong>Log Progress:</strong> Track performance across time periods (Morning, Lunch, Afternoon, Specials)</li>
            <li><strong>Export:</strong> Download as Excel for documentation</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 gx-card gx-stroke">
        <div className="cardTitle text-white">Coming Soon</div>
        <div className="cardBody mt-2 text-white/80">
          <ul className="list-disc list-inside space-y-1">
            <li>Weekly progress tracker templates</li>
            <li>Trial/attempt data collection</li>
            <li>Auto-summarize for progress reporting</li>
            <li>Save tracker sessions to case manager portfolio</li>
          </ul>
        </div>
      </div>
    </GalaxyShell>
  );
}
