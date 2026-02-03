"use client";

import React from "react";
import { Music2, X, Play, Pause, Volume2 } from "lucide-react";

type Track = {
  name: string;
  src: string;
  tags?: string[];
};

const DEFAULT_TRACKS: Track[] = [];

type AudioListResponse = {
  ok: boolean;
  files?: string[];
};

function isAudioListResponse(value: unknown): value is AudioListResponse {
  if (typeof value !== "object" || value === null) return false;
  return "ok" in value;
}

function toTrackName(filename: string) {
  const base = filename.replace(/\.mp3$/i, "");
  return decodeURIComponent(base);
}

export function MusicSidebar() {
  const [open, setOpen] = React.useState(false);
  const [tracks, setTracks] = React.useState<Track[]>(DEFAULT_TRACKS);
  const [selected, setSelected] = React.useState<Track | null>(DEFAULT_TRACKS[0] ?? null);
  const [playing, setPlaying] = React.useState(false);
  const [volume, setVolume] = React.useState(0.6);
  const [customUrl, setCustomUrl] = React.useState("");

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
  }, [volume]);

  React.useEffect(() => {
    const a = audioRef.current;
    if (!a || !selected) return;

    a.pause();
    a.src = selected.src;
    a.load();

    if (playing) {
      a.play().catch(() => setPlaying(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.src]);

  React.useEffect(() => {
    const a = audioRef.current;
    if (!a || !selected) return;

    if (playing) a.play().catch(() => setPlaying(false));
    else a.pause();
  }, [playing, selected]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/audio", { method: "GET" });
        const json: unknown = await res.json();
        if (!cancelled && isAudioListResponse(json) && json.ok && Array.isArray(json.files)) {
          const next = json.files.map((file) => ({
            name: toTrackName(file),
            src: `/audio/${encodeURIComponent(file)}`,
            tags: ["Local"],
          }));
          setTracks(next);
          setSelected(next[0] ?? null);
          setPlaying(false);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const addCustomTrack = () => {
    const src = customUrl.trim();
    if (!src) return;

    const name = src.split("/").pop() || "Custom Track";
    const newTrack: Track = { name, src, tags: ["Custom"] };
    setTracks((t) => [newTrack, ...t]);
    setSelected(newTrack);
    setCustomUrl("");
    setOpen(true);
  };

  const hasTracks = tracks.length > 0;

  return (
    <>
      <audio ref={audioRef} preload="none" />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[70] inline-flex items-center gap-2 rounded-2xl border border-white/18 bg-black/40 px-4 py-3 text-white/95 hover:bg-black/55"
        title="Soundscapes"
      >
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/5 shadow-[0_0_46px_rgba(249,115,22,0.16)]">
          <Music2 className="h-5 w-5" />
        </span>
        <span className="uiLabel hidden text-white sm:block">Soundscapes</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/50"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={[
          "fixed right-0 top-0 z-[80] h-full w-[420px] max-w-[92vw] transform transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
        aria-label="Celestial Soundscapes"
      >
        <div className="h-full border-l border-white/15 bg-black/35">
          <div className="h-full p-4">
            <div className="popCard popCard--violet flex h-full flex-col">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <div className="cardTitle text-white">Celestial Soundscapes</div>
                  <div className="cardMeta text-white/70">A little cosmos in your workflow</div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-2xl border border-white/12 bg-white/5 text-white/85 hover:bg-white/10"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-4 sidebarTile sidebarTile--violet">
                <div className="cardMeta text-white/70">Now Playing</div>
                <div className="cardTitle mt-1 text-white">{selected?.name ?? "No tracks found"}</div>

                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPlaying((p) => !p)}
                    disabled={!selected}
                    className="ctaBtn ctaBtn--violet ctaBtn--auto inline-flex items-center justify-center disabled:opacity-60"
                  >
                    {playing ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" /> Play
                      </>
                    )}
                  </button>

                  <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-3 py-3 sidebarTile sidebarTile--mint">
                    <Volume2 className="h-4 w-4 text-white/75" />
                    <input
                      aria-label="Volume"
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      className="w-full accent-white"
                    />
                  </div>
                </div>

                <div className="cardMeta mt-3 text-white/70">
                  Put mp3 files in{" "}
                  <span className="font-mono text-white/75">public/audio/</span> and reference as{" "}
                  <span className="font-mono text-white/75">/audio/your-file.mp3</span>.
                </div>
              </div>

              <div className="mb-4 sidebarTile sidebarTile--violet">
                <div className="cardTitle text-white">Add a track</div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="/audio/my-track.mp3  (or full URL)"
                    className="cardBody w-full rounded-2xl border border-white/12 bg-black/35 px-3 py-2 text-white/90 placeholder:text-white/40 outline-none focus:border-white/25"
                  />
                  <button type="button" onClick={addCustomTrack} className="ctaBtn ctaBtn--violet ctaBtn--auto">
                    Add
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto pr-1">
                <div className="cardTitle mb-2 text-white">Library</div>

                {!hasTracks ? (
                  <div className="cardBody rounded-2xl border border-white/10 bg-white/5 p-3 text-white/75 sidebarTile sidebarTile--solar">
                    No audio files detected yet.
                    <div className="cardMeta mt-2 text-white/60">
                      Add mp3s to <span className="font-mono">public/audio</span> then refresh.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tracks.map((t) => {
                      const isSelected = t.src === selected?.src;
                      return (
                        <button
                          key={t.src}
                          type="button"
                          onClick={() => setSelected(t)}
                          className={[
                            "w-full rounded-2xl border p-3 text-left transition sidebarTile",
                            isSelected
                              ? "border-white/22 bg-white/12 sidebarTile--violet"
                              : "border-white/12 bg-white/6 hover:bg-white/10 sidebarTile--mint",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="cardTitle text-white">{t.name}</div>
                            <div
                              className={[
                                "h-2 w-2 rounded-full",
                                isSelected ? "bg-emerald-400/85 shadow-[0_0_18px_rgba(16,185,129,0.40)]" : "bg-white/25",
                              ].join(" ")}
                            />
                          </div>

                          {t.tags?.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {t.tags.map((tag) => (
                                <span key={tag} className="cardMeta rounded-full border border-white/12 bg-white/6 px-2 py-0.5 text-white/75">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <div className="cardMeta mt-2 text-white/70">
                            <span className="font-mono">{t.src}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    setSelected(tracks[0] ?? null);
                  }}
                  disabled={!hasTracks}
                  className="ctaBtn ctaBtn--violet ctaBtn--auto flex-1 disabled:opacity-60"
                >
                  Reset
                </button>

                <button type="button" onClick={() => setOpen(false)} className="ctaBtn ctaBtn--violet ctaBtn--auto flex-1">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
