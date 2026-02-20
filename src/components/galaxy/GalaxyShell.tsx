"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MusicSidebar } from "@/components/galaxy/MusicSidebar";
import { GalaxyFooter } from "@/components/galaxy/GalaxyFooter";
import { GalexiiChat } from "@/components/galaxy/GalexiiChat";
import { useSharedFiles } from "@/lib/SharedFileContext";
import {
  ClipboardList,
  Target,
  UploadCloud,
  Briefcase,
  CalendarClock,
  BarChart3,
  BookOpen,
  FileText,
  Orbit,
  ShieldCheck,
  Search,
  Sparkles,
  CreditCard,
  Image as ImageIcon,
} from "lucide-react";

type NavItem = {
  key: string;
  label: string;
  sub: string;
  icon: React.ReactNode;
  href: string;
  status?: "live" | "coming";
  featured?: boolean;
};

const NAV: NavItem[] = [
  {
    key: "orbit-hub",
    label: "Orbit Hub",
    sub: "Mission control & launch all modules",
    icon: <Orbit className="h-4 w-4" />,
    href: "/",
    status: "live",
  },
  {
    key: "deep-space",
    label: "Deep Space",
    sub: "Comprehensive IEP clarity analysis",
    icon: <Search className="h-4 w-4" />,
    href: "/deep-space",
    status: "live",
    featured: true,
  },
  {
    key: "iep-prep",
    label: "IEP Prep",
    sub: "Auto-populate IEP from Deep Dive",
    icon: <Sparkles className="h-4 w-4" />,
    href: "/iep-prep",
    status: "live",
    featured: true,
  },
  {
    key: "dlibs",
    label: "Dlibs",
    sub: "Build ARD deliberation talking points",
    icon: <ClipboardList className="h-4 w-4" />,
    href: "/dlibs",
    status: "live",
  },
  {
    key: "accommodations",
    label: "Accommodations",
    sub: "Audit accommodations across sources",
    icon: <ShieldCheck className="h-4 w-4" />,
    href: "/accommodations",
    status: "live",
  },
  {
    key: "goals",
    label: "Goals",
    sub: "Extract and normalize IEP goals",
    icon: <Target className="h-4 w-4" />,
    href: "/goals",
    status: "live",
  },
  {
    key: "plaafp",
    label: "PLAAFP",
    sub: "Present levels extraction",
    icon: <ClipboardList className="h-4 w-4" />,
    href: "/plaafp",
    status: "live",
  },
  {
    key: "services",
    label: "Services",
    sub: "Minutes, setting, provider, schedule",
    icon: <Briefcase className="h-4 w-4" />,
    href: "/services",
    status: "live",
  },
  {
    key: "compliance",
    label: "Compliance Timeline",
    sub: "Deadlines, meetings, notices, logs",
    icon: <CalendarClock className="h-4 w-4" />,
    href: "/compliance",
    status: "live",
  },
  {
    key: "assessments",
    label: "Assessment Profiles",
    sub: "STAAR Alt 2, TELPAS Alt, disabilities",
    icon: <FileText className="h-4 w-4" />,
    href: "/assessments",
    status: "live",
  },
  {
    key: "trackers",
    label: "Trackers",
    sub: "Weekly, daily, trials, progress sheets",
    icon: <BarChart3 className="h-4 w-4" />,
    href: "/trackers",
    status: "live",
  },
  {
    key: "resources",
    label: "Resources",
    sub: "Goal banks, templates, checklists",
    icon: <BookOpen className="h-4 w-4" />,
    href: "/resources",
    status: "live",
  },
  {
    key: "packets",
    label: "ARD Packets",
    sub: "Build PPT + packet by student ID",
    icon: <FileText className="h-4 w-4" />,
    href: "/packets",
    status: "live",
  },
  {
    key: "image-ocr",
    label: "Image → Text",
    sub: "Turn screenshots/photos into copyable text",
    icon: <ImageIcon className="h-4 w-4" />,
    href: "/image-ocr",
    status: "live",
  },
  {
    key: "pricing",
    label: "Pricing",
    sub: "Subscription plans & billing",
    icon: <CreditCard className="h-4 w-4" />,
    href: "/pricing",
    status: "live",
  },
];

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// Output file type for the repository
type OutputFile = {
  id: string;
  name: string;
  type: "pdf" | "xlsx" | "csv" | "md" | "json";
  createdAt: Date | string;
  expiresAt: Date | string;
  size: string;
  module: string;
  downloadUrl?: string;
  data?: string; // Base64 encoded data for small files
};

function OutputRepository() {
  const [files, setFiles] = React.useState<OutputFile[]>([]);
  const [isExpanded, setIsExpanded] = React.useState(true);

  // Load files from localStorage on mount and when storage changes
  const loadFiles = React.useCallback(() => {
    const stored = localStorage.getItem("galexii-outputs");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Filter out expired files (older than 12 hours)
        const now = new Date();
        const validFiles = parsed.filter((f: OutputFile) => {
          const expires = new Date(f.expiresAt);
          return expires > now;
        });
        setFiles(validFiles);
        // Update storage with only valid files
        if (validFiles.length !== parsed.length) {
          localStorage.setItem("galexii-outputs", JSON.stringify(validFiles));
        }
      } catch {
        setFiles([]);
      }
    } else {
      setFiles([]);
    }
  }, []);

  React.useEffect(() => {
    loadFiles();
    
    // Listen for storage changes (from other tabs or same-tab updates)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "galexii-outputs") {
        loadFiles();
      }
    };
    
    // Also listen for custom event for same-tab updates
    const handleCustomUpdate = () => loadFiles();
    
    window.addEventListener("storage", handleStorage);
    window.addEventListener("galexii-output-updated", handleCustomUpdate);
    
    // Poll every 5 seconds to catch updates from same tab
    const interval = setInterval(loadFiles, 5000);
    
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("galexii-output-updated", handleCustomUpdate);
      clearInterval(interval);
    };
  }, [loadFiles]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf": return "📄";
      case "xlsx": return "📊";
      case "csv": return "📋";
      case "md": return "📝";
      case "json": return "🔧";
      default: return "📁";
    }
  };

  const getTimeRemaining = (expiresAt: Date | string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const clearAll = () => {
    setFiles([]);
    localStorage.removeItem("galexii-outputs");
  };

  const downloadFile = (file: OutputFile) => {
    let blob: Blob;
    
    if (file.data) {
      // Decode base64 data
      try {
        const decoded = decodeURIComponent(escape(atob(file.data)));
        const mimeType = file.type === 'json' ? 'application/json' 
          : file.type === 'md' ? 'text/markdown'
          : file.type === 'csv' ? 'text/csv'
          : 'application/octet-stream';
        blob = new Blob([decoded], { type: mimeType });
      } catch {
        console.error('Failed to decode file data');
        return;
      }
    } else if (file.downloadUrl) {
      // Open download URL
      window.open(file.downloadUrl, '_blank');
      return;
    } else {
      console.error('No data or URL for file');
      return;
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-6 sidebarTile sidebarTile--solar p-3 text-white/80 overflow-hidden">
      <div className="flex items-center justify-between gap-2">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left"
        >
          <span className="text-lg">{isExpanded ? "▾" : "▸"}</span>
          <div className="cardTitle text-white">Output Repository</div>
        </button>
        <span className="text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
          {files.length} files
        </span>
      </div>
      
      <div className="cardMeta mt-1 text-white/60">
        Files auto-delete after 24 hours
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {files.length === 0 ? (
            <div className="text-center py-4 text-white/50 text-sm">
              <div className="text-2xl mb-1">📂</div>
              No exports yet
            </div>
          ) : (
            <>
              {files.slice(0, 5).map((file) => (
                <div 
                  key={file.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-black/20 border border-white/5 hover:border-white/15 transition group"
                >
                  <span className="text-lg">{getTypeIcon(file.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white/90 truncate">
                      {file.name}
                    </div>
                    <div className="text-[10px] text-white/50 flex items-center gap-2">
                      <span>{file.module}</span>
                      <span>•</span>
                      <span>{file.size}</span>
                      <span>•</span>
                      <span className="text-amber-300/70">⏱ {getTimeRemaining(file.expiresAt)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => downloadFile(file)}
                    className="opacity-0 group-hover:opacity-100 transition text-white/50 hover:text-white text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                    title="Download"
                  >
                    ⬇ Download
                  </button>
                </div>
              ))}
              
              {files.length > 5 && (
                <div className="text-center text-xs text-white/50">
                  +{files.length - 5} more files
                </div>
              )}
              
              <button
                onClick={clearAll}
                className="w-full mt-2 text-xs text-white/50 hover:text-red-300 transition py-1"
              >
                Clear All
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function GalaxyShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shared = useSharedFiles();

  // User-adjustable sidebar width (desktop only), persisted per browser.
  const [sidebarWidth, setSidebarWidth] = React.useState<number>(520);
  const dragActive = React.useRef(false);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem("galexii-sidebar-width");
      if (stored) {
        const n = parseInt(stored, 10);
        if (!Number.isNaN(n) && n >= 360 && n <= 800) {
          setSidebarWidth(n);
        }
      }
    } catch {
      // ignore localStorage errors (e.g., SSR or private mode)
    }
  }, []);

  React.useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragActive.current) return;
      const min = 360;
      const max = 800;
      // Sidebar width is roughly the distance from the left edge to the drag handle.
      const next = Math.min(max, Math.max(min, e.clientX - 24));
      setSidebarWidth(next);
      try {
        window.localStorage.setItem("galexii-sidebar-width", String(next));
      } catch {
        // ignore
      }
    };

    const handleUp = () => {
      dragActive.current = false;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  // Modules that support shared files
  const SHARED_FILE_MODULES = new Set([
    "/accommodations", "/goals", "/plaafp", "/services", "/compliance", "/assessments",
  ]);

  return (
    <div className="relative h-dvh w-full overflow-hidden text-white">
      <MusicSidebar />

      <div className="relative mx-auto flex h-full min-h-0 w-full gap-6 px-3 py-4 md:px-6 md:py-6">
        {/* ✅ Sidebar with adjustable width on desktop */}
        <aside
          className="hidden shrink-0 md:block min-h-0"
          style={{ width: `${sidebarWidth}px` }}
        >
          <div className="sticky top-6">
            <div className="panel popCard popCard--violet overflow-hidden relative">
              {/* Stars in the sidebar gutter */}
              <div className="card-stars card-stars--violet" aria-hidden="true">
                <div className="card-stars-layer1" />
                <div className="card-stars-layer2" />
              </div>

              <div className="scrollCosmic max-h-[calc(100dvh-3rem)] min-h-0 overflow-y-auto p-4 relative z-1">
                <div className="mb-5 flex items-center gap-4">
                  {/* ✅ Match hero logo "rounded dark plate" + gradients */}
                  <div className="sidebarLogoWrap">
                    <Image
                      src="/brand/galexii-logo-round.png"
                      alt="SpEdGalexii"
                      width={64}
                      height={64}
                      className="sidebarLogo"
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

                {/* IEP Workflow Flowchart */}
                <div className="mb-4 sidebarTile sidebarTile--violet px-3 py-3 text-white/80 overflow-hidden">
                  <div className="uiLabel text-white/65 mb-3">IEP Workflow</div>
                  
                  <div className="flex flex-col items-center gap-1">
                    {/* Step 1 */}
                    <Link href="/deep-space" className={`w-full px-3 py-2 rounded-lg text-center text-xs font-medium transition-all ${isActivePath(pathname, '/deep-space') ? 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.3)]' : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'}`}>
                      1. Deep Space Analysis
                    </Link>
                    
                    <div className="text-violet-400/60 text-lg">↓</div>
                    
                    {/* Step 2 */}
                    <Link href="/iep-prep" className={`w-full px-3 py-2 rounded-lg text-center text-xs font-medium transition-all ${isActivePath(pathname, '/iep-prep') ? 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.3)]' : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'}`}>
                      2. IEP Prep
                    </Link>
                    
                    <div className="text-violet-400/60 text-lg">↓</div>
                    
                    {/* Step 3 - Branch */}
                    <div className="w-full grid grid-cols-2 gap-2">
                      <Link href="/goals" className={`px-2 py-2 rounded-lg text-center text-xs font-medium transition-all ${isActivePath(pathname, '/goals') ? 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.3)]' : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'}`}>
                        3a. Goals
                      </Link>
                      <Link href="/plaafp" className={`px-2 py-2 rounded-lg text-center text-xs font-medium transition-all ${isActivePath(pathname, '/plaafp') ? 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.3)]' : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'}`}>
                        3b. PLAAFP
                      </Link>
                    </div>
                    
                    <div className="text-violet-400/60 text-lg">↓</div>
                    
                    {/* Step 4 - Branch */}
                    <div className="w-full grid grid-cols-2 gap-2">
                      <Link href="/services" className={`px-2 py-2 rounded-lg text-center text-xs font-medium transition-all ${isActivePath(pathname, '/services') ? 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.3)]' : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'}`}>
                        4a. Services
                      </Link>
                      <Link href="/accommodations" className={`px-2 py-2 rounded-lg text-center text-xs font-medium transition-all ${isActivePath(pathname, '/accommodations') ? 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.3)]' : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'}`}>
                        4b. Accommodations
                      </Link>
                    </div>
                    
                    <div className="text-violet-400/60 text-lg">↓</div>
                    
                    {/* Step 5 */}
                    <Link href="/compliance" className={`w-full px-3 py-2 rounded-lg text-center text-xs font-medium transition-all ${isActivePath(pathname, '/compliance') ? 'bg-cyan-500/30 border border-cyan-400/50 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.3)]' : 'bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'}`}>
                      5. Compliance Check
                    </Link>
                    
                    <div className="text-emerald-400/60 text-lg">↓</div>
                    
                    {/* Step 6 - Complete */}
                    <div className="w-full px-3 py-2 rounded-lg text-center text-xs font-medium bg-emerald-500/20 border border-emerald-400/30 text-emerald-200">
                      ✓ IEP Ready
                    </div>
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
                          "group sidebarTile relative flex w-full items-center gap-3 px-3 py-3 text-left text-white/85 transition overflow-hidden",
                          "hover:bg-white/10 hover:text-white",
                          tileTone,
                          active &&
                            "ring-2 ring-cyan-400/30 border-cyan-300/25 bg-linear-to-r from-cyan-500/15 via-transparent to-transparent"
                        )}
                      >
                        {/* ✨ Active illumination bar */}
                        {active && (
                          <span
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-[70%] w-0.75 rounded-full bg-linear-to-b from-cyan-300 via-cyan-400 to-cyan-300"
                            style={{
                              boxShadow:
                                "0 0 12px 2px rgba(34,211,238,0.65), 0 0 24px 4px rgba(34,211,238,0.35), 0 0 40px 8px rgba(34,211,238,0.15)",
                            }}
                          />
                        )}

                        <span
                          className={cx(
                            "grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 transition",
                            active && "border-cyan-300/30 bg-cyan-400/15 text-cyan-200"
                          )}
                        >
                          {item.icon}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="sidebarNavTitle truncate text-white">
                              {item.label}
                            </div>

                            {/* Shared files badge */}
                            {shared.loaded && shared.fileCount > 0 && SHARED_FILE_MODULES.has(item.href) && (
                              <span className="shrink-0 rounded-full border border-cyan-300/30 bg-cyan-400/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-100 shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                                {shared.fileCount} 📁
                              </span>
                            )}

                            {item.featured ? (
                              <span className="shrink-0 rounded-full border border-amber-300/30 bg-amber-400/20 px-2 py-0.5 text-[11px] font-semibold text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.3)]">
                                NEW
                              </span>
                            ) : item.status === "coming" ? (
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

                {/* Output Repository */}
                <OutputRepository />
              </div>
            </div>
          </div>
        </aside>

        {/* Drag handle to resize sidebar vs main content (desktop only) */}
        <div
          className="hidden md:block h-full w-1.5 cursor-col-resize rounded-full bg-white/5 hover:bg-cyan-400/60 transition-colors"
          onMouseDown={() => {
            dragActive.current = true;
          }}
          aria-hidden="true"
        />

        <main className="min-w-0 flex-1 min-h-0 flex flex-col">
          <div className="scrollCosmic flex-1 min-h-0 overflow-y-auto pr-1 md:pr-2">
            <div className="panel popCard popCard--violet min-w-0 overflow-hidden relative">
              {/* Stars in the main content gutter */}
              <div className="card-stars card-stars--violet" aria-hidden="true">
                <div className="card-stars-layer1" />
                <div className="card-stars-layer2" />
              </div>

              <div className="p-5 pt-8 md:p-10 md:pt-14 min-w-0 relative z-1">{children}</div>
            </div>

            {/* Footer */}
            <GalaxyFooter />
            
            <div className="h-6" />
          </div>
        </main>
      </div>

      {/* Floating AI Chat Widget */}
      <GalexiiChat />
    </div>
  );
}
