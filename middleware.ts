/**
 * middleware.ts
 *
 * Next.js Edge Middleware — runs before every matched request.
 *
 * Imports from auth.config.ts (NOT auth.ts) to avoid pulling Prisma
 * into the Edge Runtime, which does not support Node.js APIs.
 *
 * Session is read from the JWT cookie — no database call required.
 */

import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Build an edge-safe auth instance using only the lightweight config
const { auth } = NextAuth(authConfig);

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/api/workspace"];

// Routes accessible only to guests
const GUEST_ONLY_ROUTES = ["/auth/login", "/auth/register"];

// Routes always public
const PUBLIC_PREFIXES = [
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/images",
  "/api/track",   // email tracking pixels — no auth needed
  "/unsubscribe", // unsubscribe page — no auth needed
];

export default auth(function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // @ts-expect-error — auth is attached by NextAuth's middleware wrapper
  const session = req.auth;
  const isAuthenticated = !!session?.user?.id;

  // Always allow public paths
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Redirect authenticated users away from guest-only pages
  if (isAuthenticated && GUEST_ONLY_ROUTES.some((r) => pathname === r)) {
    const redirectTo = session?.user?.workspaceId ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(new URL(redirectTo, req.url));
  }

  // Protect dashboard and workspace API routes
  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If authenticated but no workspace yet, redirect to onboarding
    if (
      !session?.user?.workspaceId &&
      !pathname.startsWith("/onboarding")
    ) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)" ],
};
