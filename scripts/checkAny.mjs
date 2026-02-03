import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = process.cwd();
const TARGET_DIR = path.join(ROOT, "src");
const SKIP_DIRS = new Set(["node_modules", ".next", "build", "out", "dist"]);
const MATCH_RE = /\bas any\b|: any\b|\bany\b/;

function shouldSkipDir(dirPath) {
  return SKIP_DIRS.has(path.basename(dirPath));
}

function collectFiles(dirPath, results) {
  if (shouldSkipDir(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, results);
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name.endsWith(".d.ts")) continue;
    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      results.push(full);
    }
  }
}

function scanFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (MATCH_RE.test(line)) {
      hits.push({ line: i + 1, text: line });
    }
  }
  return hits;
}

function main() {
  if (!fs.existsSync(TARGET_DIR)) {
    console.log("src/ directory not found.");
    process.exit(1);
  }

  const files = [];
  collectFiles(TARGET_DIR, files);

  let total = 0;
  for (const file of files) {
    const hits = scanFile(file);
    if (hits.length === 0) continue;
    for (const hit of hits) {
      total += 1;
      const rel = path.relative(ROOT, file);
      console.log(`${rel}:${hit.line}:${hit.text}`);
    }
  }

  if (total > 0) {
    console.log(`\nFound ${total} potential "any" occurrences.`);
    process.exit(1);
  }

  console.log("No " + '"any"' + " occurrences found.");
}

main();
