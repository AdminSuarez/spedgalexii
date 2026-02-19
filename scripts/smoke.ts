// Minimal smoke checks for core Galaxy flows.
// Run with:  npx tsx scripts/smoke.ts

import assert from "node:assert";

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${url}, got: ${text.slice(0, 200)}`);
  }
  return { res, json } as const;
}

async function checkHealth() {
  // If you add a health endpoint later, wire it here.
  console.log("[smoke] NOTE: /api/healthz not implemented; skipping health check.");
}

async function checkPreflight(base: string) {
  const url = `${base}/api/preflight?module=goals&scope=all`;
  const { res, json } = await fetchJson(url);
  assert.strictEqual(res.ok, true, `preflight HTTP status ${res.status}`);
  assert.strictEqual(json.ok, true, "preflight ok flag");
  assert.ok(Array.isArray(json.checks), "preflight checks array");
  console.log("[smoke] /api/preflight (goals) ✔");
}

async function run() {
  const base = process.env.SMOKE_BASE_URL || "http://localhost:3000";
  console.log(`[smoke] Using base URL: ${base}`);

  await checkHealth();
  await checkPreflight(base);

  console.log("[smoke] All basic checks passed.");
}

run().catch((err) => {
  console.error("[smoke] FAILED:", err);
  process.exitCode = 1;
});
