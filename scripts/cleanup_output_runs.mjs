#!/usr/bin/env node

// Simple maintenance script to keep output/_runs from growing without bound.
// It keeps the N most-recent run folders (by modified time) and deletes older ones.

import fs from "node:fs/promises";
import path from "node:path";

const KEEP_COUNT = 20;

async function main() {
  const auditRoot = path.resolve(process.cwd(), "..");
  const runsRoot = path.join(auditRoot, "output", "_runs");

  try {
    const entries = await fs.readdir(runsRoot, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());

    if (dirs.length <= KEEP_COUNT) {
      console.log(`[cleanup_output_runs] Nothing to do. ${dirs.length} run folders, keep=${KEEP_COUNT}.`);
      return;
    }

    const stats = await Promise.all(
      dirs.map(async (d) => {
        const full = path.join(runsRoot, d.name);
        const st = await fs.stat(full);
        return { name: d.name, mtimeMs: st.mtimeMs };
      }),
    );

    stats.sort((a, b) => b.mtimeMs - a.mtimeMs);

    const keep = stats.slice(0, KEEP_COUNT).map((s) => s.name);
    const remove = stats.slice(KEEP_COUNT).map((s) => s.name);

    if (remove.length === 0) {
      console.log(`[cleanup_output_runs] No folders to remove. Keeping latest ${KEEP_COUNT}.`);
      return;
    }

    console.log(
      `[cleanup_output_runs] Keeping ${keep.length} most recent run folders, removing ${remove.length} older folders...`,
    );

    for (const name of remove) {
      const full = path.join(runsRoot, name);
      try {
        await fs.rm(full, { recursive: true, force: true });
        console.log(`  - removed ${name}`);
      } catch (err) {
        console.error(`  ! failed to remove ${name}:`, err);
      }
    }

    console.log("[cleanup_output_runs] Done.");
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
      console.log(`[cleanup_output_runs] ${runsRoot} does not exist yet; nothing to clean.`);
      return;
    }
    console.error("[cleanup_output_runs] Error:", err);
    process.exitCode = 1;
  }
}

main();
