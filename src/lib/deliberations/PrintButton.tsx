"use client";

import React from "react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-white/90 hover:bg-white/10"
      title="Print or Save as PDF"
    >
      Print / Save PDF
    </button>
  );
}
