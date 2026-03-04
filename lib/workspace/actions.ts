/**
 * lib/workspace/actions.ts
 *
 * Server Actions for workspace management.
 *
 * All actions:
 *   1. Validate input with Zod
 *   2. Verify session via requireWorkspaceAccess*
 *   3. Scope every DB query to workspaceId
 *   4. Return typed ApiResponse (never throw to the client)
 */

"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hash } from "bcryptjs";

import { db } from "@/lib/db/client";
import { auth } from "@/auth";
import {
  requireWorkspaceAccess,
  requireAdminAccess,
} from "@/lib/auth/session";
import { slugify } from "@/lib/utils";
import { encrypt } from "@/lib/encryption";
import type { ApiResponse } from "@/types";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(64, "Workspace name must be under 64 characters")
    .trim(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(64).trim().optional(),
  fromEmail: z.string().email("Must be a valid email").optional().nullable(),
  fromName: z.string().max(64).optional().nullable(),
  whopApiKey: z.string().optional().nullable(),
});

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
  workspaceName: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(64)
    .trim(),
});

// ---------------------------------------------------------------------------
// Auth actions
// ---------------------------------------------------------------------------

/**
 * Register a new user with email/password and create their first workspace.
 */
export async function registerUser(
  formData: FormData
): Promise<ApiResponse<{ redirectTo: string }>> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    workspaceName: formData.get("workspaceName"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { name, email, password, workspaceName } = parsed.data;

  // Check if email already in use
  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return {
      success: false,
      error: "An account with this email already exists",
      code: "EMAIL_IN_USE",
    };
  }

  // Hash password
  const passwordHash = await hash(password, 12);

  // Create user + workspace + membership in a transaction
  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    // Generate unique workspace slug
    const baseSlug = slugify(workspaceName);
    const count = await tx.workspace.count({
      where: { slug: { startsWith: baseSlug } },
    });
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;

    const workspace = await tx.workspace.create({
      data: {
        name: workspaceName,
        slug,
      },
    });

    await tx.workspaceMembership.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER",
      },
    });
  });

  return { success: true, data: { redirectTo: "/auth/login" } };
}

// ---------------------------------------------------------------------------
// Workspace actions
// ---------------------------------------------------------------------------

/**
 * Create a new workspace for the current user.
 * Users can belong to multiple workspaces.
 */
export async function createWorkspace(
  formData: FormData
): Promise<ApiResponse<{ workspaceId: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { name } = parsed.data;
  const baseSlug = slugify(name);
  const count = await db.workspace.count({
    where: { slug: { startsWith: baseSlug } },
  });
  const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`;

  const workspace = await db.workspace.create({
    data: { name, slug },
  });

  await db.workspaceMembership.create({
    data: {
      workspaceId: workspace.id,
      userId: session.user.id,
      role: "OWNER",
    },
  });

  revalidatePath("/dashboard");
  return { success: true, data: { workspaceId: workspace.id } };
}

/**
 * Update workspace settings (admin/owner only).
 */
export async function updateWorkspace(
  rawData: Record<string, unknown>
): Promise<ApiResponse<{ workspaceId: string }>> {
  const { workspaceId } = await requireAdminAccess();

  const parsed = updateWorkspaceSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  // Encrypt whopApiKey before storing — never persisted in plaintext
  const dataToSave = { ...parsed.data };
  if (dataToSave.whopApiKey) {
    dataToSave.whopApiKey = encrypt(dataToSave.whopApiKey);
  }

  await db.workspace.update({
    where: { id: workspaceId },
    data: dataToSave,
  });

  revalidatePath("/dashboard/settings");
  return { success: true, data: { workspaceId } };
}

/**
 * Get the current user's workspace.
 * Enforces that the caller is a member of the workspace.
 */
export async function getCurrentWorkspace() {
  const { workspaceId } = await requireWorkspaceAccess();

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      fromEmail: true,
      fromName: true,
      monthlyEmailCap: true,
      createdAt: true,
      _count: {
        select: {
          contacts: true,
          campaigns: true,
        },
      },
    },
  });

  if (!workspace) redirect("/onboarding");
  return workspace;
}
