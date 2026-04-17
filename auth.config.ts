/**
 * auth.config.ts
 *
 * Edge-compatible NextAuth configuration.
 * This file has NO imports from @/lib/db or Prisma — it can safely run
 * in Next.js Edge Runtime (middleware).
 *
 * auth.ts imports and extends this with the full Prisma adapter and providers.
 * middleware.ts imports this directly to avoid Prisma in Edge Runtime.
 */

import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    newUser: "/onboarding",
  },

  // Providers are added in auth.ts (they need Prisma / bcrypt)
  providers: [],

  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isAuthPage = nextUrl.pathname.startsWith("/auth");
      const isOnboarding = nextUrl.pathname.startsWith("/onboarding");
      const isVerifyPage = nextUrl.pathname === "/auth/verify-request";
      const is2faPage = nextUrl.pathname === "/auth/2fa";
      const isUserVerified = !!auth?.user?.emailVerified;
      
      const twoFactorEnabled = (auth?.user as any)?.twoFactorEnabled;
      const twoFactorVerified = (auth?.user as any)?.twoFactorVerified;

      // 1. If trying to access dashboard/onboarding and not logged in, redirect to login
      if ((isDashboard || isOnboarding) && !isLoggedIn) {
        return false; // Redirects to signIn page defined in config.pages
      }

      // 2. Verification Wall Logic
      if (isLoggedIn && !isUserVerified && isDashboard && !isVerifyPage) {
        return Response.redirect(new URL("/auth/verify-request", nextUrl));
      }

      // 3. 2FA Wall Logic
      if (isLoggedIn && twoFactorEnabled && !twoFactorVerified && isDashboard && !is2faPage) {
        return Response.redirect(new URL("/auth/2fa", nextUrl));
      }

      // 4. Prevent verified users from hitting verification wall
      if (isLoggedIn && isUserVerified && isVerifyPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      // 5. Prevent 2FA-verified users from hitting 2FA wall
      if (isLoggedIn && twoFactorVerified && is2faPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
    /**
     * Map JWT token fields onto the session object.
     * Called whenever a session is read — runs in both Edge and Node runtimes.
     * Must NOT import or call Prisma here.
     */
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.emailVerified = token.emailVerified as Date | null;
        (session.user as any).twoFactorEnabled = !!token.twoFactorEnabled;
        (session.user as any).twoFactorVerified = !!token.twoFactorVerified;

        if (token.workspaceId) {
          session.user.workspaceId = token.workspaceId as string;
        }
        if (token.workspaceRole) {
          session.user.workspaceRole = token.workspaceRole as string;
        }
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
