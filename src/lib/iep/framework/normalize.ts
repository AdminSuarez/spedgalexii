import type { FrameworkRow } from "./types";

const headerAliases: Readonly<Record<string, keyof FrameworkRow>> = {
  tab: "tab",
  sheet: "tab",
  section: "section",
  subsection: "section",
  field: "field",
  item: "field",
  label: "field",
  required: "required",
  req: "required",
  evidence: "evidence",
  source: "evidence",
  notes: "evidence",
};

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeRows(rawRows: Array<Record<string, unknown>>): FrameworkRow[] {
  if (rawRows.length === 0) return [];

  const headerMap = new Map<string, keyof FrameworkRow>();
  const firstRow = rawRows[0] ?? {};

  for (const header of Object.keys(firstRow)) {
    const normalized = normalizeHeader(header);
    const compact = normalized.replace(/\s+/g, "");
    const alias = headerAliases[compact] ?? headerAliases[normalized];
    if (alias) headerMap.set(header, alias);
  }

  return rawRows
    .map((row) => {
      const normalized: FrameworkRow = {};

      for (const [key, value] of Object.entries(row)) {
        const mapped = headerMap.get(key);
        if (!mapped) continue;

        const text = cleanText(value);
        if (!text) continue;

        if (mapped === "required") {
          normalized.required = /^(y|yes|true|required|1|\*)$/i.test(text) ? true : text;
        } else {
          normalized[mapped] = text;
        }
      }

      return normalized;
    })
    .filter((row) => Boolean(row.tab || row.section || row.field));
}

export function normalizeRequirement(value?: string | boolean): boolean {
  if (value === true) return true;
  if (!value) return false;
  return /^(y|yes|true|required|1|\*)$/i.test(String(value));
}

export function normalizeEvidence(text?: string): string[] {
  if (!text) return [];
  return text
    .split(/[,;]|\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}
