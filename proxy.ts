/**
 * middleware.ts
 *
 * Lightweight Edge Middleware for routing only.
 * Updated for Phase 4: /api/forms and /confirm and /forms are public.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/onboarding', '/api/workspace'];

const GUEST_ONLY_ROUTES = ['/auth/login', '/auth/register'];

const PUBLIC_PREFIXES = [
  '/api/auth',
  '/api/v1',
  '/api/automation',
  '/api/attribution',
  '/api/whop',
  '/api/track',
  '/api/forms',
  '/forms',
  '/confirm',
  '/unsubscribe',
  '/auth/verify-request',
  '/_next',
  '/favicon.ico',
  '/images',
  '/public',
];

export function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // --- PREVIEW MODE BYPASS ---
  const isDev = process.env.NODE_ENV === "development" && process.env.PREVIEW_MODE === "true";
  const isStagingBypass = process.env.NEXT_PUBLIC_STAGING_MODE === "true" && 
                          req.cookies.get("staging_bypass")?.value === process.env.STAGING_BYPASS_TOKEN;

  if (isDev || isStagingBypass) {
    return NextResponse.next();
  }
  // --- END PREVIEW MODE BYPASS ---

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionCookie =
    req.cookies.get('authjs.session-token') ??
    req.cookies.get('__Secure-authjs.session-token');

  const isLoggedIn = !!sessionCookie;

  if (isLoggedIn && GUEST_ONLY_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (!isLoggedIn && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // --- VERIFICATION WALL ---
  // If logged in, but hitting dashboard/onboarding, check if we need to verify.
  // Since we can't easily check 'emailVerified' from a raw encrypted session cookie here
  // without a DB hit (which proxy.ts avoids), we will rely on a secure cookie 
  // or the 'authorized' callback in auth.config.ts if it runs.
  // However, proxy.ts seems to be the primary router here.
  // 
  // Temporary Strategy for Step 1.3: 
  // We'll perform the verification check in a Server Component inside /dashboard
  // to ensure data is protected, BUT we'll also try to detect the verification state
  // if we can pass it in the token.
  // -------------------------

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
