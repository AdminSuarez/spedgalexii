import { NextResponse } from "next/server";
import { signAuthCookie, type SimpleRole } from "@/lib/simpleAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LoginBody = {
  role?: SimpleRole;
  password?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Partial<LoginBody>;
    const role: SimpleRole = body.role === "admin" ? "admin" : "case_manager";
    const password = typeof body.password === "string" ? body.password : "";

    if (!password) {
      return NextResponse.json({ ok: false, error: "Missing password." }, { status: 400 });
    }

    const enabled = process.env.GALEXII_AUTH_ENABLED !== "false";
    if (!enabled) {
      return NextResponse.json({ ok: false, error: "Auth is disabled on this deployment." }, { status: 503 });
    }

    const adminPass = process.env.GALEXII_ADMIN_PASSWORD || "";
    const cmPass = process.env.GALEXII_CASE_MANAGER_PASSWORD || "";

    const expected = role === "admin" ? adminPass : cmPass;
    if (!expected) {
      return NextResponse.json(
        {
          ok: false,
          error: `No ${role} password is configured. Ask your SpEdGalexii admin to set GALEXII_${
            role === "admin" ? "ADMIN" : "CASE_MANAGER"
          }_PASSWORD.`,
        },
        { status: 503 },
      );
    }

    if (password !== expected) {
      return NextResponse.json({ ok: false, error: "Incorrect password." }, { status: 401 });
    }

    const token = await signAuthCookie({ role, issuedAt: Date.now() });
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Auth secret is not configured. Set GALEXII_AUTH_SECRET to a long random value." },
        { status: 503 },
      );
    }

    const res = NextResponse.json({ ok: true, role });
    res.cookies.set("gx_auth", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });
    return res;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg || "Login failed." }, { status: 500 });
  }
}
