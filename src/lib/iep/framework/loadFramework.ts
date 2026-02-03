import * as XLSX from "xlsx";
import { normalizeEvidence, normalizeRequirement, normalizeRows } from "./normalize";
import type {
  FrameworkFieldRequirement,
  FrameworkLoadResult,
  FrameworkMap,
  FrameworkRow,
  FrameworkSection,
  FrameworkTab,
} from "./types";

function toKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cleanText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const HEADER_TOKENS = new Set([
  "tab",
  "sheet",
  "section",
  "subsection",
  "field",
  "item",
  "label",
  "required",
  "req",
  "evidence",
  "source",
  "notes",

  // table-style headers seen in your workbook
  "plan",
  "priority",
  "impairment category",
  "evaluation date",
  "eligibility date",
  "placement date",
  "accommodation name",
  "start date",
  "end date",
]);

const METADATA_LABELS = new Set([
  "event info",
  "schedule date",
  "due date",
  "last modified",
  "created",
  "updated",
  "student",
  "campus",
  "grade",
]);

function rowLooksLikeHeader(row: unknown[]): boolean {
  let hits = 0;
  for (const cell of row) {
    const t = normalizeHeader(cleanText(cell));
    if (!t) continue;
    const compact = t.replace(/\s+/g, "");
    if (HEADER_TOKENS.has(compact) || HEADER_TOKENS.has(t)) hits += 1;
  }
  return hits >= 2;
}

function isMostlyEmpty(row: unknown[]) {
  let nonEmpty = 0;
  for (const cell of row) {
    if (cleanText(cell)) nonEmpty += 1;
    if (nonEmpty >= 2) return false;
  }
  return nonEmpty === 0 || nonEmpty === 1;
}

function looksLikePrompt(label: string) {
  const t = label.toLowerCase();
  return (
    t.includes("?") ||
    t.startsWith("does ") ||
    t.startsWith("is ") ||
    t.startsWith("describe") ||
    t.startsWith("summarize") ||
    t.startsWith("include")
  );
}

function isYesNoRow(row: unknown[]): boolean {
  const tokens = row
    .map((cell) => cleanText(cell).toLowerCase())
    .filter((token) => token.length > 0);

  if (tokens.length === 0) return false;
  if (tokens.includes("yes") && tokens.includes("no")) return true;
  return tokens.some((token) => token === "yesno" || token === "yes / no" || token === "yes-no");
}

function defaultPromptSection(sheetName: string): string {
  const s = normalizeHeader(sheetName);
  if (s.includes("lpac")) return "LPAC Questions";
  return "General";
}

function isSectionHeadingRow(row: unknown[]) {
  if (row.length === 0) return false;
  const a = cleanText(row[0]);
  if (!a) return false;

  if (looksLikePrompt(a)) return false;
  if (isYesNoRow(row)) return false;

  if (!isMostlyEmpty(row.slice(1))) return false;

  const aNorm = normalizeHeader(a);
  if (METADATA_LABELS.has(aNorm)) return false;
  if (a.endsWith(":")) return false;

  return a.length <= 80;
}

function parseFormLikeGrid(sheetName: string, grid: unknown[][]): FrameworkRow[] {
  const out: FrameworkRow[] = [];
  let currentSection: string | undefined = undefined;

  for (let r = 0; r < grid.length; r += 1) {
    const row = grid[r] ?? [];
    const a = cleanText(row[0]);
    const b = cleanText(row[1]);
    const c = cleanText(row[2]);

    if (!a && !b && !c) continue;

    if (isSectionHeadingRow(row)) {
      currentSection = a;
      continue;
    }

    const aNorm = normalizeHeader(a);
    if (METADATA_LABELS.has(aNorm) && (b || c)) continue;

    if (a) {
      const isReq =
        /\*/.test(a) || /\brequired\b/i.test(a) || /\bred asterisk\b/i.test(a);

      const evidenceParts = [b, c].filter((x) => x.length > 0);
      const evidence = evidenceParts.length ? evidenceParts.join(" | ") : "";

      if (a.length < 2 && evidence.length === 0) continue;

      const section =
        currentSection ?? (looksLikePrompt(a) ? defaultPromptSection(sheetName) : undefined);

      const rowOut: FrameworkRow = {
        tab: sheetName,
        ...(section ? { section } : {}),
        field: a.replace(/\*+/g, "").trim(),
        ...(isReq ? { required: true } : {}),
        ...(evidence.length > 0 ? { evidence } : {}),
      };

      out.push(rowOut);
    }
  }

  return out.filter((r) => !!r.field);
}

function extractRowsFromSheet(sheetName: string, sheet: XLSX.WorkSheet): FrameworkRow[] {
  if (!sheet["!ref"]) return [];

  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });

  if (!grid.length) return [];

  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(grid.length, 60); i += 1) {
    const row = (grid[i] ?? []) as unknown[];
    if (rowLooksLikeHeader(row)) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex >= 0) {
    const headerRow = (grid[headerRowIndex] ?? []) as unknown[];
    const headers = headerRow.map((h) => cleanText(h)).filter((h) => h.length > 0);

    const records: Array<Record<string, unknown>> = [];
    for (let r = headerRowIndex + 1; r < grid.length; r += 1) {
      const row = (grid[r] ?? []) as unknown[];
      const rec: Record<string, unknown> = {};

      for (let c = 0; c < headers.length; c += 1) {
        const key = headers[c];
        const v = row[c];
        const txt = cleanText(v);
        if (!key || !txt) continue;
        rec[key] = txt;
      }

      if (Object.keys(rec).length > 0) records.push(rec);
    }

    const normalized = normalizeRows(records);

    // Table detected but not in framework-style columns: treat columns as fields
    if (normalized.length === 0 && headers.length > 0) {
      return headers.map<FrameworkRow>((h) => ({
        tab: sheetName,
        section: "Table Columns",
        field: h,
        required: normalizeRequirement(false),
      }));
    }

    return normalized.map((r) => ({ ...r, tab: r.tab ?? sheetName }));
  }

  return parseFormLikeGrid(sheetName, grid);
}

function upsertTab(tabs: Map<string, FrameworkTab>, tabLabel: string) {
  const key = toKey(tabLabel);
  if (!tabs.has(key)) {
    tabs.set(key, { key, label: tabLabel, sections: [] });
  }
  return tabs.get(key)!;
}

function upsertSection(
  sections: Map<string, FrameworkSection>,
  tabKey: string | undefined,
  sectionLabel: string
) {
  const key = toKey(sectionLabel);
  if (!sections.has(key)) {
    sections.set(key, {
      key,
      label: sectionLabel,
      ...(tabKey ? { tabKey } : {}),
      fields: [],
    });
  }
  return sections.get(key)!;
}

function addField(
  fields: FrameworkFieldRequirement[],
  row: FrameworkRow,
  tabKey: string | undefined,
  sectionKey: string | undefined
) {
  if (!row.field) return;
  const key = toKey(row.field);
  fields.push({
    key,
    label: row.field,
    required: normalizeRequirement(row.required),
    evidenceSuggestions: normalizeEvidence(row.evidence),
    ...(tabKey ? { tabKey } : {}),
    ...(sectionKey ? { sectionKey } : {}),
  });
}

export function loadFrameworkFromWorkbook(workbook: XLSX.WorkBook): FrameworkLoadResult {
  const tabs = new Map<string, FrameworkTab>();
  const sections = new Map<string, FrameworkSection>();
  const fields: FrameworkFieldRequirement[] = [];
  const warnings: string[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;

    const rows = extractRowsFromSheet(sheetName, sheet);
    if (!rows.length) {
      warnings.push(`Sheet ${sheetName} has no usable rows.`);
      return;
    }

    rows.forEach((row) => {
      const tabLabel = row.tab ?? sheetName;
      const tab = tabLabel ? upsertTab(tabs, tabLabel) : undefined;

      const sectionLabel = row.section ?? (row.field ? "General" : undefined);
      const section = sectionLabel ? upsertSection(sections, tab?.key, sectionLabel) : undefined;

      if (section && tab && !tab.sections.find((s) => s.key === section.key)) {
        tab.sections.push(section);
      }

      addField(fields, row, tab?.key, section?.key);
      const lastField = fields[fields.length - 1];
      if (section && row.field && lastField) {
        section.fields.push(lastField);
      }
    });
  });

  const map: FrameworkMap = {
    tabs: Array.from(tabs.values()),
    sections: Array.from(sections.values()),
    fields,
  };

  return { map, warnings };
}

export function loadFrameworkFromFile(path: string): FrameworkLoadResult {
  const workbook = XLSX.readFile(path, { cellDates: true });
  return loadFrameworkFromWorkbook(workbook);
}

