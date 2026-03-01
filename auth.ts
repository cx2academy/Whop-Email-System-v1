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
    WhopProvider,

    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            passwordHash: true,
          },
        });

        if (!user || !user.passwordHash) return null;

        const passwordValid = await compare(password, user.passwordHash);
        if (!passwordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
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
    async jwt({ token, user }) {
      // `user` is only present on the initial sign-in
      if (user?.id) {
        token.userId = user.id;

        // Fetch workspace membership and embed in the token
        const membership = await db.workspaceMembership.findFirst({
          where: { userId: user.id },
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
