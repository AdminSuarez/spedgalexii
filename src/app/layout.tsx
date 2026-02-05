import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpEdGalexii",
  description:
    "SpEdGalexii is a modular audit universe for Special Education workflows. Launch systems like Accommodation Galexii to verify compliance, catch missing items, and export auditor-ready evidence.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="min-h-dvh">
      <body className="galaxy-bg min-h-dvh overflow-x-hidden">
        <div className="spaceBackdrop" aria-hidden="true">
          <div className="space" />
          {/* Multi-layered deep space star field */}
          <div className="stars l1" />
          <div className="stars l2" />
          <div className="stars l3" />
          <div className="stars l4" />
          <div className="stars l5" />

          {/* Orbiting planets */}
          <div className="planets">
            <div className="orbit o1">
              <span className="planet p1" />
            </div>
            <div className="orbit o2">
              <span className="planet p2" />
            </div>
            <div className="orbit o3">
              <span className="planet p3" />
            </div>
          </div>

          <div className="meteors">
            <span className="meteor m1" />
            <span className="meteor m2" />
            <span className="meteor m3" />
            <span className="comet c1" />
            <span className="comet c2" />
          </div>
        </div>

        <div className="galaxy-content min-h-dvh">{children}</div>
      </body>
    </html>
  );
}
