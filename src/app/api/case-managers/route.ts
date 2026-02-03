import { NextResponse } from "next/server";
import * as path from "node:path";
import * as fs from "node:fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CaseManagerOption = {
  key: string;
  label: string;
  filename: string; // basename only
};

const PREFIX = "REQUIRED_AUDIT_TABLE__";
const SUFFIX = ".xlsx";

function isCaseManagerFilename(name: string) {
  const upper = name.toUpperCase();
  return upper.startsWith(PREFIX) && upper.endsWith(SUFFIX.toUpperCase());
}

function isExcluded(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("__all_case_managers.xlsx")) return true;
  if (lower.includes("__blank_case_manager.xlsx")) return true;
  return false;
}

function nicerLabelFromKey(key: string) {
  return key.replaceAll("_", " ").trim();
}

function extractKeyFromFilename(name: string) {
  // Remove prefix/suffix in a case-insensitive way
  const upper = name.toUpperCase();
  if (!upper.startsWith(PREFIX) || !upper.endsWith(SUFFIX.toUpperCase())) return "";

  const base = name.slice(PREFIX.length, name.length - SUFFIX.length);
  const key = base.trim().replace(/\s+/g, "_");

  // Keep it filename-safe-ish (matches your other patterns)
  return key.replace(/[^A-Za-z0-9_]+/g, "_") || "";
}

async function listFilesSafe(dirAbs: string) {
  try {
    return await fs.readdir(dirAbs, { withFileTypes: true });
  } catch {
    return [];
  }
}

export async function GET() {
  const AUDIT_ROOT = path.resolve(process.cwd(), "..");
  const OUTPUT = path.join(AUDIT_ROOT, "output");
  const RUNS = path.join(OUTPUT, "_runs");

  const byKey = new Map<string, CaseManagerOption>();

  // 1) OUTPUT root is canonical
  const outputEntries = await listFilesSafe(OUTPUT);
  for (const ent of outputEntries) {
    if (!ent.isFile()) continue;
    const name = ent.name;
    if (!isCaseManagerFilename(name)) continue;
    if (isExcluded(name)) continue;

    const key = extractKeyFromFilename(name);
    if (!key) continue;

    byKey.set(key, {
      key,
      label: nicerLabelFromKey(key),
      filename: name,
    });
  }

  // 2) Fallback: scan per-run artifacts
  const runDirs = await listFilesSafe(RUNS);
  for (const runEnt of runDirs) {
    if (!runEnt.isDirectory()) continue;

    const runId = runEnt.name;
    if (runId.startsWith(".") || runId === "_uploads" || runId === "_cache") continue;

    const artifactsDir = path.join(RUNS, runId, "artifacts");
    const artifactEntries = await listFilesSafe(artifactsDir);

    for (const a of artifactEntries) {
      if (!a.isFile()) continue;
      const name = a.name;
      if (!isCaseManagerFilename(name)) continue;
      if (isExcluded(name)) continue;

      const key = extractKeyFromFilename(name);
      if (!key) continue;

      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          label: nicerLabelFromKey(key),
          filename: name,
        });
      }
    }
  }

  const opts = Array.from(byKey.values()).sort((a, b) => a.label.localeCompare(b.label));
  return NextResponse.json({ ok: true, caseManagers: opts });
}
