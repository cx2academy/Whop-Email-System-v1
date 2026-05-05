/**
 * auth.ts
 *
 * Full NextAuth configuration — runs in Node.js runtime only.
 * Extends auth.config.ts with Prisma adapter, providers, and JWT callbacks.
 *
 * Import this in: server components, server actions, API routes.
 * Do NOT import this in: middleware.ts (use auth.config.ts there instead).
 */

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db/client";
import { authConfig } from "./auth.config";
import { authLimiter } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { logAudit } from "@/lib/audit/logger";
import { redirect } from "next/navigation";

// ---------------------------------------------------------------------------
// Whop OAuth custom provider
// ---------------------------------------------------------------------------

const WhopProvider = {
  id: "whop",
  name: "Whop",
  type: "oauth" as const,
  clientId: process.env.WHOP_CLIENT_ID!,
  clientSecret: process.env.WHOP_CLIENT_SECRET!,
  authorization: {
    url: "https://whop.com/oauth",
    params: {
      scope: "openid profile email",
      response_type: "code",
    },
  },
  token: "https://api.whop.com/api/v5/oauth/token",
  userinfo: "https://api.whop.com/api/v5/me",
  profile(profile: Record<string, string>) {
    return {
      id: profile.id,
      name: profile.name ?? profile.username ?? null,
      email: profile.email,
      image: profile.profile_pic_url ?? null,
    };
  },
};

// ---------------------------------------------------------------------------
// Credentials schema
// ---------------------------------------------------------------------------

const credentialsSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// ---------------------------------------------------------------------------
// Full Auth.js config (Node.js only)
// ---------------------------------------------------------------------------

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  adapter: PrismaAdapter(db),

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    ...(process.env.WHOP_CLIENT_ID && process.env.WHOP_CLIENT_SECRET ? [WhopProvider] : []),

    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const headerList = await headers();
        const ip = headerList.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Rate limit by IP and Email
        const ipRl = authLimiter.check(`login:ip:${ip}`);
        const emailRl = authLimiter.check(`login:email:${email.toLowerCase().trim()}`);

        if (!ipRl.success || !emailRl.success) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            passwordHash: true,
            emailVerified: true,
            failedLoginAttempts: true,
            lockoutUntil: true,
            twoFactorEnabled: true,
          },
        });

        if (!user || !user.passwordHash) return null;

        // Check if account is locked
        if (user.lockoutUntil && user.lockoutUntil > new Date()) {
          const timeLeft = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
          throw new Error(`Account is temporarily locked. Please try again in ${timeLeft} minutes.`);
        }

        const passwordValid = await compare(password, user.passwordHash);
        
        if (!passwordValid) {
          const newAttempts = user.failedLoginAttempts + 1;
          const isLocked = newAttempts >= 5;
          
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: newAttempts,
              lockoutUntil: isLocked ? new Date(Date.now() + 15 * 60 * 1000) : null,
            },
          });

          await logAudit(user.id, "LOGIN_FAILURE", { reason: "incorrect_password", attempts: newAttempts });
          return null;
        }

        // Reset failed attempts on successful login
        if (user.failedLoginAttempts > 0 || user.lockoutUntil) {
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: 0,
              lockoutUntil: null,
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
          twoFactorEnabled: user.twoFactorEnabled,
        };
      },
    }),
  ],

  callbacks: {
    ...authConfig.callbacks,

    /**
     * Called when a JWT is created (on sign-in) or updated.
     * Store workspaceId and role in the token so middleware can read it
     * without a database call.
     */
    async jwt({ token, user, trigger, session }) {
      // `user` is only present on the initial sign-in
      if (user) {
        token.sub = user.id;
        token.emailVerified = (user as any).emailVerified;
        token.twoFactorEnabled = (user as any).twoFactorEnabled;
        token.twoFactorVerified = true; // Default to true, will be set to false if enabled below
        
        if ((user as any).twoFactorEnabled) {
          token.twoFactorVerified = false;
        }
      }

      // Handle session updates (e.g. from verifyLogin2fa form)
      if (trigger === "update" && session?.twoFactorVerified !== undefined) {
        token.twoFactorVerified = session.twoFactorVerified;
      }

      // Always ensure workspaceId is in the token if we have a userId
      // This handles cases where the initial sign-in might have missed it
      // or where we want to refresh the token without a full sign-out.
      if (token.sub && !token.workspaceId) {
        const membership = await db.workspaceMembership.findFirst({
          where: { userId: token.sub as string },
          orderBy: { createdAt: "desc" },
          select: { workspaceId: true, role: true },
        });

        if (membership) {
          token.workspaceId = membership.workspaceId;
          token.workspaceRole = membership.role;
        }
      }

      return token;
    },
  },

  events: {
    async signIn({ user, account }) {
      if (user.id) {
        await logAudit(user.id, "LOGIN_SUCCESS", { provider: account?.provider });
      }
    },

    /**
     * After a new OAuth user is created, make them a workspace owner.
     * Credentials users create their workspace in the register action.
     */
    async createUser({ user }) {
      if (!user.id || !user.email) return;

      // Check if they already have a workspace (shouldn't happen but guard anyway)
      const existing = await db.workspaceMembership.findFirst({
        where: { userId: user.id },
      });
      if (existing) return;

      const baseName =
        user.name ?? user.email.split("@")[0] ?? "my-workspace";
      const slug = baseName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48);

      const existingCount = await db.workspace.count({
        where: { slug: { startsWith: slug } },
      });
      const uniqueSlug =
        existingCount === 0 ? slug : `${slug}-${existingCount}`;

      const workspace = await db.workspace.create({
        data: {
          name: `${user.name ?? "My"} Workspace`,
          slug: uniqueSlug,
        },
      });

      await db.workspaceMembership.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "OWNER",
        },
      });
    },
  },
});
