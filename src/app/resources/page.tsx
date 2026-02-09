"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";

type ResourceCategory = "Reading" | "Vocabulary" | "Executive Function" | "TEA Guidance";

type ResourceItem = {
  id: string;
  category: ResourceCategory;
  title: string;
  text: string;
  tags?: string[];
};

function Header() {
  return (
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
            Resources Galexii
          </h1>

          <div className="cardMeta mt-3 text-white/70">
            Knowledge Vault — Search goal banks, guidance, and templates
          </div>
        </div>
      </div>

      <p className="cardBody mt-6 max-w-3xl text-white/80">
        Copy what you need or send it straight into Goals Galexii. Filter by category 
        to find reading strategies, vocabulary techniques, executive function supports, 
        and TEA guidance documents.
      </p>

      <p className="cardMeta mt-3 text-violet-300/80 italic">
        "Knowledge shared is knowledge multiplied."
      </p>
    </div>
  );
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function Page() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<ResourceCategory | "All">("All");
  const [toast, setToast] = useState<string | null>(null);

  const toastTimerRef = useRef<number | null>(null);

  const ITEMS: ResourceItem[] = [
    {
      id: "read-1",
      category: "Reading",
      title: "Reading Comprehension Goal Frame",
      text:
        "By (date), given a grade-level passage and (support/condition), the student will answer (WH/Inference) questions with (accuracy/criterion) across (trials/sessions) as measured by (tool).",
      tags: ["comprehension", "measurable", "criterion"],
    },
    {
      id: "vocab-1",
      category: "Vocabulary",
      title: "Academic Vocabulary Goal Frame",
      text:
        "By (date), when presented with (set) academic vocabulary words from (content area), the student will define/use each word in context with (accuracy) across (trials) as measured by (data).",
      tags: ["vocabulary", "context", "accuracy"],
    },
    {
      id: "ef-1",
      category: "Executive Function",
      title: "Self-Regulation Check-in Goal Frame",
      text:
        "By (date), given a visual self-monitoring tool and adult prompt, the student will identify their regulation zone and choose an appropriate strategy in (X of Y) opportunities across (weeks).",
      tags: ["self-regulation", "strategy", "data"],
    },
    {
      id: "tea-1",
      category: "TEA Guidance",
      title: "Measurable Goal Components",
      text:
        "Measurable goals typically include a timeframe, condition, specific skill/behavior, and criterion for mastery. Ensure the criterion matches how progress will be measured and reported.",
      tags: ["TEA", "best-practice", "components"],
    },
  ];

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return ITEMS.filter((it) => {
      const matchCat = cat === "All" ? true : it.category === cat;
      if (!matchCat) return false;
      if (!qq) return true;
      const hay = (it.title + " " + it.text + " " + (it.tags || []).join(" ")).toLowerCase();
      return hay.includes(qq);
    });
  }, [q, cat]);

  function notify(msg: string) {
    setToast(msg);

    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 1600);
  }

  return (
    <GalaxyShell>
      <div className="page w-full">
        <Header />

        <div className="mt-6 gx-card gx-stroke">
        <div className="cardTitle text-white">Search + Filter</div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: ‘infer’, ‘context clues’, ‘self-monitoring’, ‘criterion’…"
            className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
          />

          <select
            value={cat}
            onChange={(e) => setCat(e.target.value as ResourceCategory | "All")}
            className="rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-white outline-none focus:border-white/25"
          >
            <option value="All">All</option>
            <option value="Reading">Reading</option>
            <option value="Vocabulary">Vocabulary</option>
            <option value="Executive Function">Executive Function</option>
            <option value="TEA Guidance">TEA Guidance</option>
          </select>
        </div>

        <div className="cardMeta mt-4 text-white/70">Showing {filtered.length} item(s)</div>
      </div>

      <div className="mt-6 grid gap-4">
        {filtered.map((it) => (
          <div key={it.id} className="gx-card gx-stroke gx-hover">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="uiLabel text-white/60">{it.category}</div>
                <div className="cardTitle mt-1 text-white">{it.title}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="ctaBtn ctaBtn--sm ctaBtn--violet"
                  onClick={async () => {
                    const ok = await copyToClipboard(it.text);
                    notify(ok ? "Copied ✨" : "Copy failed");
                  }}
                >
                  Copy
                </button>

                <button
                  className="ctaBtn ctaBtn--sm ctaBtn--electric"
                  onClick={() => {
                    const url = `/goals?goalText=${encodeURIComponent(it.text)}`;
                    router.push(url);
                  }}
                >
                  Send to Goals
                </button>
              </div>
            </div>

            <div className="cardBody mt-3 text-white/85 whitespace-pre-wrap">{it.text}</div>

            {it.tags?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {it.tags.map((t) => (
                  <span key={t} className="galaxy-pill text-white/85">
                    {t}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/12 bg-black/60 px-4 py-2 text-white shadow-[0_20px_60px_rgba(0,0,0,.55)]">
          {toast}
        </div>
      ) : null}
      </div>
    </GalaxyShell>
  );
}
