export type SimpleRole = "admin" | "case_manager";

export type SimpleAuthPayload = {
  role: SimpleRole;
  issuedAt: number;
};

const COOKIE_SEPARATOR = ".";

function getCrypto(): Crypto | null {
  if (typeof crypto !== "undefined") return crypto as Crypto;
  if (typeof globalThis !== "undefined" && (globalThis as any).crypto) {
    return (globalThis as any).crypto as Crypto;
  }
  return null;
}

function bufferToHex(buf: ArrayBuffer): string {
  const view = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < view.length; i += 1) {
    const v = view[i] ?? 0;
    out += v.toString(16).padStart(2, "0");
  }
  return out;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i += 1) {
    res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return res === 0;
}

function getSecret(): string | null {
  const s = process.env.GALEXII_AUTH_SECRET;
  return s && s.length >= 16 ? s : null;
}

async function hmac(input: string, secret: string): Promise<string> {
  const c = getCrypto();
  if (!c || !c.subtle) {
    throw new Error("crypto.subtle is not available in this environment");
  }
  const enc = new TextEncoder();
  const key = await c.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await c.subtle.sign("HMAC", key, enc.encode(input));
  return bufferToHex(sig as ArrayBuffer);
}

function base64UrlEncode(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf8").toString("base64url");
  }

  const base64 = btoa(unescape(encodeURIComponent(str)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

function base64UrlDecode(base: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base, "base64url").toString("utf8");
  }

  const padded = base.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((base.length + 3) % 4);
  const decoded = atob(padded);
  return decodeURIComponent(escape(decoded));
}

export async function signAuthCookie(payload: SimpleAuthPayload): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const json = JSON.stringify(payload);
  const base = base64UrlEncode(json);
  const sig = await hmac(base, secret);
  return `${base}${COOKIE_SEPARATOR}${sig}`;
}

export async function verifyAuthCookie(value: string): Promise<SimpleAuthPayload | null> {
  try {
    const secret = getSecret();
    if (!secret) return null;

    const [base, sig] = value.split(COOKIE_SEPARATOR);
    if (!base || !sig) return null;

    const expected = await hmac(base, secret);
    if (!timingSafeEqualHex(sig, expected)) {
      return null;
    }

    const json = base64UrlDecode(base);
    const parsed = JSON.parse(json) as SimpleAuthPayload;

    if (parsed.role !== "admin" && parsed.role !== "case_manager") return null;
    if (typeof parsed.issuedAt !== "number") return null;

    // Optional: enforce max age (e.g., 24 hours)
    const maxAgeMs = 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.issuedAt > maxAgeMs) return null;

    return parsed;
  } catch {
    return null;
  }
}
