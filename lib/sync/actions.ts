/**
 * lib/sync/actions.ts
 *
 * Server Actions for Whop sync and contact management.
 *
 * All actions enforce workspace isolation via requireWorkspaceAccess().
 */

"use server";

import { revalidatePath } from "next/cache";
import { decrypt } from '@/lib/encryption';
import { z } from "zod";

import { db } from "@/lib/db/client";
import { runSync } from "@/lib/sync/service";
import { requireWorkspaceAccess, requireAdminAccess } from "@/lib/auth/session";
import type { ApiResponse, PaginatedResult } from "@/types";
import type { Contact, ContactStatus, Tag } from "@prisma/client";

// ---------------------------------------------------------------------------
// Sync actions
// ---------------------------------------------------------------------------

/**
 * Triggers a manual Whop member sync for the current workspace.
 * Requires ADMIN or OWNER role.
 */
export async function triggerSync(): Promise<
  ApiResponse<{
    syncLogId: string;
    status: string;
    totalUpserted: number;
    totalFetched: number;
    durationMs: number;
  }>
> {
  const { workspaceId, userId } = await requireAdminAccess();

  // Fetch the workspace's Whop API key
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { whopApiKey: true },
  });

  if (!workspace?.whopApiKey) {
    return {
      success: false,
      error:
        "No Whop API key configured. Add your API key in Settings before syncing.",
      code: "NO_API_KEY",
    };
  }

  // Run the sync — never throws, always returns a result
  const result = await runSync({
    workspaceId,
    apiKey: decrypt(workspace.whopApiKey) ?? workspace.whopApiKey,
    triggeredBy: userId,
  });

  revalidatePath("/dashboard/contacts");

  return {
    success: result.status !== "FAILED",
    data: {
      syncLogId: result.syncLogId,
      status: result.status,
      totalUpserted: result.totalUpserted,
      totalFetched: result.totalFetched,
      durationMs: result.durationMs,
    },
  };
}

/**
 * Get the most recent sync log for the current workspace.
 */
export async function getLatestSyncLog() {
  const { workspaceId } = await requireWorkspaceAccess();

  return db.syncLog.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      totalFetched: true,
      totalUpserted: true,
      totalSkipped: true,
      totalErrors: true,
      startedAt: true,
      completedAt: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Contact list / filtering
// ---------------------------------------------------------------------------

const contactFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["SUBSCRIBED", "UNSUBSCRIBED", "BOUNCED", "COMPLAINED"]).optional(),
  tagIds: z.array(z.string()).optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(25),
});

export type ContactFilters = z.infer<typeof contactFiltersSchema>;

/**
 * Fetches a paginated, filtered list of contacts for the current workspace.
 */
export async function getContacts(
  rawFilters: Partial<ContactFilters> = {}
): Promise<
  PaginatedResult<
    Contact & { tags: Array<{ tag: Pick<Tag, "id" | "name" | "color"> }> }
  >
> {
  const { workspaceId } = await requireWorkspaceAccess();
  const filters = contactFiltersSchema.parse(rawFilters);

  const where = {
    workspaceId,
    ...(filters.status && { status: filters.status as ContactStatus }),
    ...(filters.search && {
      OR: [
        { email: { contains: filters.search, mode: "insensitive" as const } },
        { firstName: { contains: filters.search, mode: "insensitive" as const } },
        { lastName: { contains: filters.search, mode: "insensitive" as const } },
      ],
    }),
    ...(filters.tagIds?.length && {
      tags: {
        some: {
          tagId: { in: filters.tagIds },
        },
      },
    }),
  };

  const [contacts, total] = await Promise.all([
    db.contact.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
    db.contact.count({ where }),
  ]);

  const totalPages = Math.ceil(total / filters.limit);

  return {
    data: contacts,
    total,
    page: filters.page,
    limit: filters.limit,
    totalPages,
    hasNextPage: filters.page < totalPages,
    hasPrevPage: filters.page > 1,
  };
}

// ---------------------------------------------------------------------------
// Tag management
// ---------------------------------------------------------------------------

const createTagSchema = z.object({
  name: z.string().min(1).max(50).trim(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color")
    .default("#6366f1"),
});

/**
 * Create a new tag scoped to the current workspace.
 */
export async function createTag(
  rawData: unknown
): Promise<ApiResponse<Tag>> {
  const { workspaceId } = await requireWorkspaceAccess();

  const parsed = createTagSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { name, color } = parsed.data;

  // Check for duplicate tag name in this workspace
  const existing = await db.tag.findUnique({
    where: { workspaceId_name: { workspaceId, name } },
  });
  if (existing) {
    return {
      success: false,
      error: `A tag named "${name}" already exists`,
      code: "TAG_EXISTS",
    };
  }

  const tag = await db.tag.create({
    data: { workspaceId, name, color },
  });

  revalidatePath("/dashboard/contacts");
  return { success: true, data: tag };
}

/**
 * Get all tags for the current workspace.
 */
export async function getTags(): Promise<Tag[]> {
  const { workspaceId } = await requireWorkspaceAccess();

  return db.tag.findMany({
    where: { workspaceId },
    orderBy: { name: "asc" },
  });
}

/**
 * Add a tag to a contact.
 * Validates that both the contact and tag belong to the current workspace.
 */
export async function addTagToContact(
  contactId: string,
  tagId: string
): Promise<ApiResponse<void>> {
  const { workspaceId } = await requireWorkspaceAccess();

  // Verify both records belong to this workspace
  const [contact, tag] = await Promise.all([
    db.contact.findUnique({
      where: { id: contactId },
      select: { workspaceId: true },
    }),
    db.tag.findUnique({
      where: { id: tagId },
      select: { workspaceId: true },
    }),
  ]);

  if (!contact || contact.workspaceId !== workspaceId) {
    return { success: false, error: "Contact not found", code: "NOT_FOUND" };
  }
  if (!tag || tag.workspaceId !== workspaceId) {
    return { success: false, error: "Tag not found", code: "NOT_FOUND" };
  }

  await db.contactTag.upsert({
    where: { contactId_tagId: { contactId, tagId } },
    create: { contactId, tagId },
    update: {},
  });

  revalidatePath("/dashboard/contacts");
  return { success: true, data: undefined };
}

/**
 * Remove a tag from a contact.
 */
export async function removeTagFromContact(
  contactId: string,
  tagId: string
): Promise<ApiResponse<void>> {
  const { workspaceId } = await requireWorkspaceAccess();

  // Ownership check
  const contact = await db.contact.findUnique({
    where: { id: contactId },
    select: { workspaceId: true },
  });

  if (!contact || contact.workspaceId !== workspaceId) {
    return { success: false, error: "Contact not found", code: "NOT_FOUND" };
  }

  await db.contactTag
    .delete({
      where: { contactId_tagId: { contactId, tagId } },
    })
    .catch(() => {
      // Already removed — idempotent, not an error
    });

  revalidatePath("/dashboard/contacts");
  return { success: true, data: undefined };
}

/**
 * Manually unsubscribe a contact.
 */
export async function unsubscribeContact(
  contactId: string
): Promise<ApiResponse<void>> {
  const { workspaceId } = await requireWorkspaceAccess();

  const contact = await db.contact.findUnique({
    where: { id: contactId },
    select: { workspaceId: true },
  });

  if (!contact || contact.workspaceId !== workspaceId) {
    return { success: false, error: "Contact not found", code: "NOT_FOUND" };
  }

  await db.contact.update({
    where: { id: contactId },
    data: {
      status: "UNSUBSCRIBED",
      unsubscribedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/contacts");
  return { success: true, data: undefined };
}
