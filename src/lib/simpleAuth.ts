import crypto from "node:crypto";

export type SimpleRole = "admin" | "case_manager";

export type SimpleAuthPayload = {
  role: SimpleRole;
  issuedAt: number;
};

const COOKIE_SEPARATOR = ".";

function getSecret(): string | null {
  const s = process.env.GALEXII_AUTH_SECRET;
  return s && s.length >= 16 ? s : null;
}

function hmac(input: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(input).digest("hex");
}

export function signAuthCookie(payload: SimpleAuthPayload): string | null {
  const secret = getSecret();
  if (!secret) return null;
  const json = JSON.stringify(payload);
  const base = Buffer.from(json, "utf8").toString("base64url");
  const sig = hmac(base, secret);
  return `${base}${COOKIE_SEPARATOR}${sig}`;
}

export function verifyAuthCookie(value: string): SimpleAuthPayload | null {
  try {
    const secret = getSecret();
    if (!secret) return null;

    const [base, sig] = value.split(COOKIE_SEPARATOR);
    if (!base || !sig) return null;

    const expected = hmac(base, secret);
    if (!crypto.timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))) {
      return null;
    }

    const json = Buffer.from(base, "base64url").toString("utf8");
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
