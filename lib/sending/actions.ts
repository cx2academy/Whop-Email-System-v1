'use server';

/**
 * lib/sending/actions.ts
 *
 * Server actions for smart sending settings.
 * All actions require ADMIN or OWNER role.
 */

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { requireAdminAccess } from '@/lib/auth/session';
import { clearAbuseFlag } from '@/lib/sending/abuse-detector';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const sendingSettingsSchema = z.object({
  engagementFilterEnabled: z.boolean(),
  engagementFilterDays:    z.number().int().min(1).max(365),
  deduplicationEnabled:    z.boolean(),
  sendRateLimitEnabled:    z.boolean(),
  sendRateLimitPerMinute:  z.number().int().min(1).max(10000),
  abuseDetectionEnabled:   z.boolean(),
});

export type SendingSettingsInput = z.infer<typeof sendingSettingsSchema>;

// ---------------------------------------------------------------------------
// Load current settings — for the settings page
// ---------------------------------------------------------------------------

export async function getSendingSettings() {
  const { workspaceId } = await requireAdminAccess();

  return db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      engagementFilterEnabled: true,
      engagementFilterDays:    true,
      deduplicationEnabled:    true,
      sendRateLimitEnabled:    true,
      sendRateLimitPerMinute:  true,
      abuseDetectionEnabled:   true,
      abuseFlagged:            true,
      abuseFlaggedReason:      true,
      abuseFlaggedAt:          true,
    },
  });
}

// ---------------------------------------------------------------------------
// Save settings
// ---------------------------------------------------------------------------

export async function updateSendingSettings(
  raw: SendingSettingsInput
): Promise<{ success: boolean; error?: string }> {
  const { workspaceId } = await requireAdminAccess();

  const parsed = sendingSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid settings',
    };
  }

  await db.workspace.update({
    where: { id: workspaceId },
    data: parsed.data,
  });

  revalidatePath('/dashboard/settings');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Clear abuse flag — admin action to unblock workspace after review
// ---------------------------------------------------------------------------

export async function clearWorkspaceAbuseFlag(): Promise<{
  success: boolean;
  error?: string;
}> {
  const { workspaceId } = await requireAdminAccess();

  await clearAbuseFlag(workspaceId);
  revalidatePath('/dashboard/settings');
  return { success: true };
}
