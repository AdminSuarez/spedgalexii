import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuthCookie } from "@/lib/simpleAuth";

const PUBLIC_PATHS = ["/login", "/faq", "/privacy", "/", "/api/healthz"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/assets") || pathname.startsWith("/favicon")) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // If auth is disabled, allow everything
  if (process.env.GALEXII_AUTH_ENABLED === "false") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("gx_auth");

  if (cookie?.value) {
    const auth = verifyAuthCookie(cookie.value);
    if (auth && auth.role) {
      return NextResponse.next();
    }
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: "/:path*",
};
