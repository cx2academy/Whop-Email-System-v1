/**
 * lib/auth/session.ts
 *
 * Server-side session utilities.
 *
 * Every server action and API route that touches workspace data MUST call
 * requireWorkspaceAccess() before any DB query. This is the second layer
 * of protection (middleware is the first).
 *
 * Usage:
 *   const { userId, workspaceId } = await requireWorkspaceAccess();
 *   const contacts = await db.contact.findMany({ where: { workspaceId } });
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import type { WorkspaceMemberRole } from "@prisma/client";

// ---------------------------------------------------------------------------
// Bypass Helper
// ---------------------------------------------------------------------------

/**
 * Checks if the preview/staging bypass should be active.
 * In production, it requires a 'staging_bypass' cookie matching STAGING_BYPASS_TOKEN.
 */
export async function isBypassActive(): Promise<boolean> {
  const isDev = process.env.NODE_ENV === "development" && process.env.PREVIEW_MODE === "true";
  if (isDev) return true;

  if (process.env.NEXT_PUBLIC_STAGING_MODE === "true" && process.env.STAGING_BYPASS_TOKEN) {
    const cookieStore = await cookies();
    const bypassCookie = cookieStore.get("staging_bypass")?.value;
    return bypassCookie === process.env.STAGING_BYPASS_TOKEN;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthenticatedContext {
  userId: string;
  workspaceId: string;
  workspaceRole: WorkspaceMemberRole;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "UNAUTHENTICATED"
      | "NO_WORKSPACE"
      | "UNAUTHORIZED"
      | "NOT_FOUND" = "UNAUTHENTICATED"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Returns the current session or null. Does NOT throw or redirect.
 * Use this when auth is optional (e.g., public pages that adapt for logged-in users).
 */
export async function getSession() {
  return auth();
}

/**
 * Requires a valid session and workspace membership.
 * Redirects to /auth/login if unauthenticated.
 * Redirects to /onboarding if no workspace.
 *
 * Use this at the top of every protected Server Component and Server Action.
 *
 * @returns Verified { userId, workspaceId, workspaceRole }
 */
export async function requireWorkspaceAccess(): Promise<AuthenticatedContext> {
  // --- PREVIEW MODE BYPASS ---
  if (await isBypassActive()) {
    return {
      userId: "preview-user-id",
      workspaceId: "preview-workspace-id",
      workspaceRole: "OWNER",
    };
  }
  // --- END PREVIEW MODE BYPASS ---

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (!session.user.workspaceId) {
    redirect("/onboarding");
  }

  // Double-verify membership in the DB — session could be stale
  const membership = await db.workspaceMembership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: session.user.workspaceId,
        userId: session.user.id,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    // User somehow has a workspaceId in session but no real membership
    redirect("/onboarding");
  }

  return {
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
    workspaceRole: membership.role,
  };
}

/**
 * Like requireWorkspaceAccess() but throws AuthError instead of redirecting.
 * Use this in API route handlers where redirecting makes no sense.
 *
 * @throws AuthError if unauthenticated or unauthorized
 */
export async function requireWorkspaceAccessOrThrow(): Promise<AuthenticatedContext> {
  // --- PREVIEW MODE BYPASS ---
  if (await isBypassActive()) {
    // Reuse the logic from requireWorkspaceAccess
    return requireWorkspaceAccess();
  }
  // --- END PREVIEW MODE BYPASS ---

  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthError("Not authenticated", "UNAUTHENTICATED");
  }

  if (!session.user.workspaceId) {
    throw new AuthError("No workspace found", "NO_WORKSPACE");
  }

  const membership = await db.workspaceMembership.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: session.user.workspaceId,
        userId: session.user.id,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    throw new AuthError("Not a member of this workspace", "UNAUTHORIZED");
  }

  return {
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
    workspaceRole: membership.role,
  };
}

/**
 * Requires the user to be an OWNER or ADMIN of their workspace.
 * Use for destructive or privileged operations.
 *
 * @throws AuthError if user is a plain MEMBER
 */
export async function requireAdminAccess(): Promise<AuthenticatedContext> {
  const ctx = await requireWorkspaceAccessOrThrow();

  if (ctx.workspaceRole === "MEMBER") {
    throw new AuthError(
      "Admin or Owner role required for this action",
      "UNAUTHORIZED"
    );
  }

  return ctx;
}
