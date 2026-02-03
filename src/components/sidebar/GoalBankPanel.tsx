"use client";

import React, { useMemo, useState } from "react";
import { GOAL_BANK, extractPlaceholders, type GoalBankCategory } from "@/lib/goalBank";

type Props = {
  defaultOpen?: boolean;
  onUseTemplate?: (templateText: string) => void;
};

const CATEGORY_ORDER: GoalBankCategory[] = [
  "Foundational Reading",
  "Vocabulary",
  "Reading Comprehension",
  "Math",
  "Writing",
  "Behavior",
  "Social Skills",
  "Social-Emotional",
  "Executive Functioning",
  "Self-Advocacy",
  "Speech Therapy",
  "Occupational Therapy",
];

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export default function GoalBankPanel({ defaultOpen = false, onUseTemplate }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<GoalBankCategory | "ALL">("ALL");

  const filtered = useMemo(() => {
    const nq = normalize(q);
    return GOAL_BANK.filter((t) => {
      if (cat !== "ALL" && t.category !== cat) return false;
      if (!nq) return true;
      const hay = normalize([t.category, t.text, ...(t.tags ?? [])].join(" "));
      return hay.includes(nq);
    });
  }, [q, cat]);

  const grouped = useMemo(() => {
    const m = new Map<string, typeof filtered>();
    for (const c of CATEGORY_ORDER) m.set(c, []);
    for (const t of filtered) {
      if (!m.has(t.category)) m.set(t.category, []);
      m.get(t.category)!.push(t);
    }
    return m;
  }, [filtered]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3"
      >
        <div className="text-left">
          <div className="text-sm font-semibold tracking-wide">IEP Goal Bank</div>
          <div className="text-xs text-white/70">Search, copy, and reuse templates</div>
        </div>
        <div className="text-xs text-white/70">{open ? "Hide" : "Show"}</div>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search goals (e.g., fluency, token, inferential)..."
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/25"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setCat("ALL")}
              className={`rounded-full px-3 py-1 text-xs border ${
                cat === "ALL" ? "border-white/25 bg-white/10" : "border-white/10 bg-transparent"
              }`}
            >
              All
            </button>
            {CATEGORY_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`rounded-full px-3 py-1 text-xs border ${
                  cat === c ? "border-white/25 bg-white/10" : "border-white/10 bg-transparent"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="max-h-[46vh] overflow-auto pr-1 space-y-3">
            {CATEGORY_ORDER.map((c) => {
              const items = grouped.get(c) ?? [];
              if (items.length === 0) return null;
              return (
                <div key={c} className="rounded-lg border border-white/10 bg-black/20 p-2">
                  <div className="text-xs font-semibold text-white/85 mb-2">{c}</div>
                  <div className="space-y-2">
                    {items.map((t) => {
                      const ph = extractPlaceholders(t.text);
                      return (
                        <div key={t.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
                          <div className="text-xs leading-relaxed whitespace-pre-wrap">{t.text}</div>

                          {ph.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {ph.map((p) => (
                                <span
                                  key={p}
                                  className="text-[10px] rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-white/70"
                                >
                                  [{p}]
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={() => copy(t.text)}
                              className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs hover:border-white/20"
                            >
                              Copy
                            </button>
                            <button
                              type="button"
                              onClick={() => onUseTemplate?.(t.text)}
                              className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs hover:border-white/20"
                            >
                              Use
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-xs text-white/70">
                No matches. Try “fluency”, “token”, “graphic organizer”, “AAC”, etc.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
