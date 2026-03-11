/**
 * middleware.ts
 *
 * Lightweight Edge Middleware for routing only.
 *
 * Does NOT import NextAuth or Prisma — both are incompatible with Edge Runtime.
 * Instead, checks for the presence of the NextAuth session cookie to decide
 * whether to redirect. The real auth security lives in requireWorkspaceAccess()
 * inside each server component and server action.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that require a logged-in session
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/api/workspace"];

// Routes only for guests (redirect to dashboard if already logged in)
const GUEST_ONLY_ROUTES = ["/auth/login", "/auth/register"];

// Routes that are always public — never intercepted
const PUBLIC_PREFIXES = [
  "/api/auth",
  "/api/v1",
  "/api/automation",
  "/api/attribution",
  "/api/whop",   // v1 API handles its own auth via API keys
  "/api/track",
  "/unsubscribe",
  "/_next",
  "/favicon.ico",
  "/images",
  "/public",
];

export function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // Always allow public paths through immediately
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for NextAuth session cookie (works in both dev and production)
  const sessionCookie =
    // NextAuth v5 uses authjs.* cookie names (not next-auth.*)
    req.cookies.get("authjs.session-token") ??
    req.cookies.get("__Secure-authjs.session-token");

  const isLoggedIn = !!sessionCookie;

  // Redirect logged-in users away from login/register pages
  if (isLoggedIn && GUEST_ONLY_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Redirect guests away from protected pages
  if (!isLoggedIn && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL("/auth/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
