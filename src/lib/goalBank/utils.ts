export function extractTokens(text: string): string[] {
  const tokens = new Set<string>();
  const re = /\[([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const token = match[1]?.trim();
    if (token) tokens.add(token);
  }
  return Array.from(tokens);
}

export function fillTokens(text: string, values: Record<string, string>): string {
  return text.replace(/\[([^\]]+)\]/g, (_, raw) => {
    const key = String(raw).trim();
    const value = values[key];
    return value && value.length ? value : `[${key}]`;
  });
}
