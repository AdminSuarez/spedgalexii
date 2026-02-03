export function normalizeText(input: string) {
  return input
    .replace(/\u00a0/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .replace(/[Ê]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findSection(text: string, start: RegExp, end?: RegExp) {
  const m = text.match(start);
  if (!m?.index) return "";
  const from = m.index;
  const rest = text.slice(from);
  if (!end) return rest;
  const e = rest.match(end);
  if (!e?.index) return rest;
  return rest.slice(0, e.index);
}

export function pickFirst(text: string, patterns: RegExp[]) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return undefined;
}
