'use server';

/**
 * lib/onboarding/actions.ts
 *
 * Server actions for the assisted onboarding flow.
 * Each action maps to one onboarding step and fires a telemetry event.
 */

import { db } from '@/lib/db/client';
import { encrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { track } from '@/lib/telemetry';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { syncWhopMembers } from '@/lib/sync/actions';
import { revalidatePath } from 'next/cache';

export interface OnboardingActionResult {
  success: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Step 1: Save sender email inline (pre-filled from user account email)
// ---------------------------------------------------------------------------

export async function saveSenderEmail(
  fromEmail: string
): Promise<OnboardingActionResult> {
  const { workspaceId } = await requireWorkspaceAccess();

  if (!fromEmail || !/^[^s@]+@[^s@]+.[^s@]+$/.test(fromEmail)) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  await db.workspace.update({
    where: { id: workspaceId },
    data: { fromEmail },
  });

  logger.info('onboarding_step_completed', { workspaceId, step: 'sender_email' });
  revalidatePath('/dashboard');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Step 2: Save Whop API key inline
// ---------------------------------------------------------------------------

export async function saveWhopApiKey(
  apiKey: string
): Promise<OnboardingActionResult> {
  const { workspaceId } = await requireWorkspaceAccess();

  if (!apiKey || apiKey.trim().length < 8) {
    return { success: false, error: 'Please enter a valid API key.' };
  }

  await db.workspace.update({
    where: { id: workspaceId },
    data: { whopApiKey: encrypt(apiKey.trim()) },
  });

  logger.info('onboarding_step_completed', { workspaceId, step: 'whop_api_key' });
  revalidatePath('/dashboard');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Step 3: Trigger member sync (reuses existing sync logic)
// ---------------------------------------------------------------------------

export async function triggerOnboardingSync(): Promise<OnboardingActionResult> {
  const { workspaceId } = await requireWorkspaceAccess();

  const result = await syncWhopMembers();

  if (!result.success) {
    return { success: false, error: result.error ?? 'Sync failed. Check your API key.' };
  }

  logger.info('onboarding_step_completed', { workspaceId, step: 'contacts_synced' });
  revalidatePath('/dashboard');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Dismiss: user explicitly closes the checklist
// ---------------------------------------------------------------------------

export async function dismissOnboarding(): Promise<void> {
  const { userId, workspaceId } = await requireWorkspaceAccess();

  await db.user.update({
    where: { id: userId },
    data: { onboardingDismissedAt: new Date() },
  });

  logger.info('onboarding_dismissed', { workspaceId, userId });
  track('onboarding_abandoned', { workspaceId, userId });
  revalidatePath('/dashboard');
}
