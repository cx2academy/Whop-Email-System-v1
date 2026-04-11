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
  '/api/forms',    // ← Phase 4: public form submission endpoint
  '/forms',        // ← Phase 4: public form pages
  '/confirm',      // ← Phase 4: double opt-in confirmation
  '/unsubscribe',
  '/_next',
  '/favicon.ico',
  '/images',
  '/public',
];

export function proxy(req: NextRequest) {
  const { nextUrl } = req;
  const pathname = nextUrl.pathname;

  // --- PREVIEW MODE BYPASS ---
  if (process.env.PREVIEW_MODE === "true" || process.env.NEXT_PUBLIC_PREVIEW_MODE === "true") {
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

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
