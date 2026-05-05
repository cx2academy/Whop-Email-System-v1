/**
 * types/next-auth.d.ts
 *
 * Extends NextAuth's built-in types to include our custom session fields:
 *   - user.id          (user's database ID)
 *   - user.workspaceId (active workspace for multi-tenant routing)
 *   - user.workspaceRole (OWNER | ADMIN | MEMBER)
 *
 * Without this, TypeScript will complain when accessing session.user.id etc.
 */

import type { WorkspaceMemberRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      workspaceId?: string;
      workspaceRole?: WorkspaceMemberRole;
      emailVerified?: Date | null;
    } & DefaultSession["user"];
  }
}
