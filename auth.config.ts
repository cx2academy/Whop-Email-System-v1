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
    /**
     * Map JWT token fields onto the session object.
     * Called whenever a session is read — runs in both Edge and Node runtimes.
     * Must NOT import or call Prisma here.
     */
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
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
