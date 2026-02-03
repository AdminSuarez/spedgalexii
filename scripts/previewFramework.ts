import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as XLSX from "xlsx";
import { loadFrameworkFromFile } from "../src/lib/iep/framework/loadFramework";

type PreviewResult = {
  file: string;
  tabs: number;
  sections: number;
  fields: number;
  warnings: string[];
};

function getFlagValue(argv: string[], flag: string): string | null {
  const idx = argv.indexOf(flag);
  if (idx === -1) return null;
  const value = argv[idx + 1];
  return value && !value.startsWith("--") ? value : null;
}

function getFlagNumber(argv: string[], flag: string, fallback: number): number {
  const raw = getFlagValue(argv, flag);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function dumpSheetGrid(workbook: XLSX.WorkBook, sheetName: string, rowsToShow: number): void {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.log(`\n❌ Sheet not found: ${sheetName}\n`);
    return;
  }

  console.log(`\n=== SHEET DUMP: ${sheetName} ===`);
  console.log(`ref: ${String(sheet["!ref"] ?? "(none)")}`);
  console.log(`merges: ${Array.isArray(sheet["!merges"]) ? sheet["!merges"].length : 0}`);

  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: true,
  });

  const limited = grid.slice(0, rowsToShow);

  for (let r = 0; r < limited.length; r += 1) {
    const row = limited[r] ?? [];
    const cells = row
      .map((cell) => String(cell ?? "").replace(/\s+/g, " ").trim())
      .map((cell) => (cell.length ? cell : "·"))
      .slice(0, 16);
    console.log(`${String(r + 1).padStart(3, " ")} | ${cells.join(" \t ")}`);
  }

  console.log("");
}

function pickArgFile(argv: string[]): string | null {
  const args = argv.slice(2).filter((arg) => arg.trim().length > 0);
  if (args.length === 0) return null;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i] ?? "";
    if (arg.startsWith("--")) {
      const next = args[i + 1];
      if (next && !next.startsWith("--")) i += 1;
      continue;
    }
    return arg;
  }

  return null;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function summarize(
  fileAbs: string,
  tabs: number,
  sections: number,
  fields: number,
  warnings: string[]
): PreviewResult {
  return { file: fileAbs, tabs, sections, fields, warnings };
}

async function main(): Promise<void> {
  const cwd = process.cwd();
  const provided = pickArgFile(process.argv);

  const defaultAbs = path.resolve(cwd, "IEP Framework.xlsx");
  const fileAbs = provided ? path.resolve(cwd, provided) : defaultAbs;

  if (!(await fileExists(fileAbs))) {
    console.log("\n=== Framework Preview ===");
    console.log(`file: ${fileAbs}`);
    console.log("\n❌ File not found.");
    console.log("\nSave it at project root as:");
    console.log(`  ${defaultAbs}`);
    console.log("\nOr run with an explicit path:");
    console.log('  npm run framework:preview -- "../path/to/IEP Framework.xlsx"\n');
    process.exit(2);
    return;
  }

  const dump = getFlagValue(process.argv, "--dump");
  const rowsToShow = getFlagNumber(process.argv, "--rows", 60);

  if (dump) {
    const workbook = XLSX.readFile(fileAbs, { cellDates: true });
    dumpSheetGrid(workbook, dump, rowsToShow);
  }

  const loaded = loadFrameworkFromFile(fileAbs);
  const tabs = loaded.map.tabs.length;
  const sections = loaded.map.sections.length;
  const fields = loaded.map.fields.length;

  const out = summarize(fileAbs, tabs, sections, fields, loaded.warnings);

  console.log("\n=== Framework Preview ===");
  console.log(`file: ${out.file}`);
  console.log(`tabs: ${out.tabs}`);
  console.log(`sections: ${out.sections}`);
  console.log(`fields: ${out.fields}`);

  if (out.warnings.length > 0) {
    console.log("\n=== Warnings ===");
    for (const warning of out.warnings) console.log(`- ${warning}`);
  } else {
    console.log("\n✅ No warnings.");
  }

  const countsByTab = new Map<string, number>();
  for (const field of loaded.map.fields) {
    const key = field.tabKey ?? "unknown";
    countsByTab.set(key, (countsByTab.get(key) ?? 0) + 1);
  }

  const topTabs = Array.from(countsByTab.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  if (topTabs.length > 0) {
    console.log("\n=== Top Tabs ===");
    for (const [key, count] of topTabs) console.log(`${key}: ${count}`);
  }

  console.log("");
}

void main();
