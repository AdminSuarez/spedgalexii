"use client";

import React from "react";

type ScriptPackButtonProps = {
  runId?: string | null;
  label?: string;
};

export default function ScriptPackButton({ runId, label = "Download Script Pack (PDF)" }: ScriptPackButtonProps) {
  const [busy, setBusy] = React.useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const payload = runId ? { header: { runId } } : {};
      const res = await fetch("/api/script-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`script-pack failed: ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "SpEdGalexii_ARD_Script_Pack.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Could not generate the Script Pack. Check console for details.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white/90 backdrop-blur hover:bg-white/10 disabled:opacity-60 cardBody inline-flex items-center justify-center"
      title={runId ? `Run ${runId}` : "Template script pack"}
    >
      {busy ? "Generating…" : label}
    </button>
  );
}
