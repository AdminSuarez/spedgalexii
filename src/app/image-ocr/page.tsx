"use client";

import React, { useState } from "react";
import Image from "next/image";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";

export default function ImageOcrPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    if (!file) {
      setError("Choose an image first.");
      return;
    }

    setBusy(true);
    setError(null);
    setText("");

    try {
      const fd = new FormData();
      fd.append("image", file);

      const res = await fetch("/api/image-ocr", { method: "POST", body: fd });
      const json = (await res.json()) as { ok: boolean; text?: string; error?: string };

      if (!json.ok || !json.text) {
        setError(json.error || "OCR failed.");
        return;
      }

      setText(json.text);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "OCR failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GalaxyShell>
      <div className="page w-full">
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
              <h1 className="heroTitle wrap-break-word">Image → Text Galexii</h1>

              <div className="cardMeta mt-3 text-white/70">
                Snapshots to sentences — turn IEP screenshots into copyable text
              </div>
            </div>
          </div>

          <p className="cardBody mt-6 max-w-3xl text-white/80">
            Upload a clear screenshot or photo of an IEP page. Galexii will run local OCR and return plain
            text you can copy directly into PLAAFP, goals, or notes. No data is sent to external services;
            everything runs on the same machine as your audit scripts.
          </p>
        </div>

        <div className="gx-card gx-stroke mt-4">
          <div className="cardTitle text-white">Upload Image</div>
          <div className="cardBody mt-2 text-white/80">
            Choose a single screenshot or photo (.png, .jpg, .jpeg, .heic, .webp, .tif).
          </div>

          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start">
            <div className="flex-1 min-w-0">
              <input
                type="file"
                accept="image/*,.heic,.tif,.tiff"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  setText("");
                  setError(null);
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  if (f) setPreviewUrl(URL.createObjectURL(f));
                }}
                className="block w-full cursor-pointer rounded-2xl border border-white/10 bg-black/30 p-3 text-white/80 file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white hover:bg-black/40 cardBody"
              />

              {file ? (
                <div className="cardMeta mt-2 text-white/70">Selected: {file.name}</div>
              ) : (
                <div className="cardMeta mt-2 text-white/60">No file selected yet.</div>
              )}

              <button
                type="button"
                onClick={onSubmit}
                disabled={!file || busy}
                className="mt-4 ctaBtn ctaBtn--deep inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy ? "Working…" : "Run OCR"}
              </button>

              {error ? (
                <div className="mt-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {error}
                </div>
              ) : null}
            </div>

            {previewUrl ? (
              <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview" className="h-full w-full object-contain" />
              </div>
            ) : null}
          </div>
        </div>

        <div className="gx-card gx-stroke mt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="cardTitle text-white">Extracted Text</div>
              <div className="cardMeta mt-1 text-white/70">
                Review, then copy/paste into PLAAFP, notes, or Deep Space prompts.
              </div>
            </div>
            <button
              type="button"
              disabled={!text}
              onClick={async () => {
                if (!text) return;
                try {
                  await navigator.clipboard.writeText(text);
                } catch {
                  // ignore
                }
              }}
              className="ctaBtn ctaBtn--sm ctaBtn--violet disabled:opacity-60"
            >
              Copy text
            </button>
          </div>

          <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white/85">
            {text || "Run OCR to see extracted text here."}
          </pre>
        </div>
      </div>
    </GalaxyShell>
  );
}
