"use client";

import React from "react";

type Props = {
  label?: string;
};

export function LaunchMissionsButton({ label = "Launch Missions" }: Props) {
  const handleClick = () => {
    const target = document.getElementById("launch");
    if (!target) return;

    try {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      // Fallback without smooth behavior if unsupported
      target.scrollIntoView();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="ctaBtn ctaBtn--deep inline-flex items-center justify-center"
      title="Jump to launch"
    >
      {label}
    </button>
  );
}
