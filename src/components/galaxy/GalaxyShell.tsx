"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MusicSidebar } from "@/components/galaxy/MusicSidebar";
import {
  ClipboardList,
  Target,
  UploadCloud,
  Briefcase,
  CalendarClock,
  BarChart3,
  BookOpen,
} from "lucide-react";

type NavItem = {
  key: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  href: string;
  status?: "live" | "coming";
};

const NAV: NavItem[] = [
  {
    key: "accommodations",
    label: "Accommodation Galexii",
    sub: "Audit accommodations across sources",
    icon: <UploadCloud className="h-4 w-4" />,
    href: "/",
    status: "live",
  },
  {
    key: "goals",
    label: "Goals Galexii",
    sub: "Extract and normalize IEP goals",
    icon: <Target className="h-4 w-4" />,
    href: "/goals",
    status: "live",
  },
  {
    key: "plaafp",
    label: "PLAAFP Galexii",
    sub: "Present levels extraction",
    icon: <ClipboardList className="h-4 w-4" />,
    href: "/plaafp",
    status: "coming",
  },
  {
    key: "services",
    label: "Services Galexii",
    sub: "Minutes, setting, provider, schedule",
    icon: <Briefcase className="h-4 w-4" />,
    href: "/services",
    status: "coming",
  },
  {
    key: "compliance",
    label: "Compliance Timeline",
    sub: "Deadlines, meetings, notices, logs",
    icon: <CalendarClock className="h-4 w-4" />,
    href: "/compliance",
    status: "coming",
  },
  {
    key: "trackers",
    label: "Trackers",
    sub: "Weekly, daily, trials, progress sheets",
    icon: <BarChart3 className="h-4 w-4" />,
    href: "/trackers",
    status: "coming",
  },
  {
    key: "resources",
    label: "Resources",
    sub: "Goal banks, templates, checklists",
    icon: <BookOpen className="h-4 w-4" />,
    href: "/resources",
    status: "coming",
  },
];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function GalaxyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative h-dvh w-full overflow-hidden text-white">
      <MusicSidebar />

      <div className="relative mx-auto flex h-full min-h-0 w-full gap-6 px-3 py-4 md:px-6 md:py-6">
        <aside className="hidden shrink-0 md:block md:w-[360px] lg:w-[400px] min-h-0">
          <div className="sticky top-6">
            <div className="panel popCard popCard--violet overflow-hidden">
              <div className="scrollCosmic max-h-[calc(100dvh-3rem)] min-h-0 overflow-y-auto p-4">
                <div className="mb-5 flex items-center gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/14 bg-black/35 shadow-[0_0_60px_rgba(251,191,36,0.20)]">
                    <Image
                      src="/brand/galexii-logo-round.png"
                      alt="SpEdGalexii"
                      width={56}
                      height={56}
                      className="h-14 w-14"
                      priority
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="brandTitle tracking-tight text-white truncate">
                      SpEdGalexii
                    </div>
                    <div className="cardMeta text-white/70 truncate">
                      Audit Universe
                    </div>
                  </div>
                </div>

                <div className="mb-4 sidebarTile sidebarTile--violet px-3 py-2 text-white/80 overflow-hidden">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="uiLabel text-white/65">Current System</div>
                      <div className="cardTitle truncate text-white">
                        Accommodation Galexii
                      </div>
                    </div>

                    <span className="cardMeta shrink-0 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-emerald-100 shadow-[0_0_18px_rgba(16,185,129,0.22)]">
                      Live
                    </span>
                  </div>

                  <div className="cardBody mt-2 text-white/80 break-words">
                    Upload → Run → Export (fast + clean).
                  </div>
                </div>

                <nav className="space-y-2">
                  {NAV.map((item, index) => {
                    const tileTone =
                      index % 3 === 0
                        ? "sidebarTile--violet"
                        : index % 3 === 1
                          ? "sidebarTile--mint"
                          : "sidebarTile--solar";

                    const active = isActivePath(pathname, item.href);

                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cx(
                          "group sidebarTile flex w-full items-center gap-3 px-3 py-3 text-left text-white/85 transition overflow-hidden",
                          "hover:bg-white/10 hover:text-white",
                          tileTone,
                          active &&
                            "ring-2 ring-white/14 border-white/18 bg-white/10 shadow-[0_0_60px_rgba(34,211,238,0.10)]"
                        )}
                      >
                        <span
                          className={cx(
                            "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 transition",
                            active && "border-white/18 bg-white/10"
                          )}
                        >
                          {item.icon}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="cardTitle truncate text-white">
                              {item.label}
                            </div>

                            {item.status === "coming" ? (
                              <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white/70">
                                Coming
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full border border-emerald-300/20 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-100">
                                Live
                              </span>
                            )}
                          </div>

                          <div className="cardMeta truncate text-white/70">
                            {item.sub}
                          </div>
                        </div>

                        <span
                          className={cx(
                            "h-2 w-2 shrink-0 rounded-full opacity-90 transition",
                            active
                              ? "bg-cyan-300/80 shadow-[0_0_22px_rgba(34,211,238,0.55)]"
                              : item.status === "live"
                                ? "bg-emerald-400/75 shadow-[0_0_18px_rgba(16,185,129,0.40)] group-hover:opacity-100"
                                : "bg-white/25 shadow-[0_0_18px_rgba(255,255,255,0.20)] group-hover:bg-white/35"
                          )}
                        />
                      </Link>
                    );
                  })}
                </nav>

                <div className="mt-6 sidebarTile sidebarTile--solar p-3 text-white/80 overflow-hidden">
                  <div className="cardTitle text-white">Output folder</div>
                  <div className="cardMeta mt-1 font-mono text-white/70 break-words">
                    AccommodationsAudit/output/
                  </div>
                </div>

                <div className="mt-4 sidebarTile sidebarTile--violet p-3 text-white/70 break-words overflow-hidden">
                  Next Galexii: Goals • PLAAFP • Services • Compliance • Trackers • Resources
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 min-h-0">
          <div className="scrollCosmic h-full min-h-0 overflow-y-auto pr-1 md:pr-2">
            <div className="panel popCard popCard--violet min-w-0 overflow-hidden">
              <div className="p-5 pt-8 md:p-10 md:pt-14 min-w-0">
                {children}
              </div>
            </div>

            <div className="h-6" />
          </div>
        </main>
      </div>
    </div>
  );
}
