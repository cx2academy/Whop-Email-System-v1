'use server';

/**
 * lib/onboarding/actions.ts
 *
 * Server actions for the assisted onboarding flow.
 *
 * Changes from original:
 *   - saveWhopApiKey: now validates the key against Whop API and
 *     auto-populates workspace.whopCompanyName from the response.
 *     This means the UI can greet the user by their company name
 *     immediately after connection.
 */

import { db } from '@/lib/db/client';
import { encrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { track } from '@/lib/telemetry';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { triggerSync } from '@/lib/sync/actions';
import { createWhopClient } from '@/lib/whop/client';
import { revalidatePath } from 'next/cache';

export interface OnboardingActionResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Step 1: Save sender email
// ---------------------------------------------------------------------------

export async function saveSenderEmail(
  fromEmail: string
): Promise<OnboardingActionResult> {
  const { workspaceId } = await requireWorkspaceAccess();

  if (!fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
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
// Step 2: Save Whop API key + auto-populate company name
// ---------------------------------------------------------------------------

export async function saveWhopApiKey(
  apiKey: string
): Promise<OnboardingActionResult> {
  const { workspaceId } = await requireWorkspaceAccess();

  if (!apiKey || apiKey.trim().length < 8) {
    return { success: false, error: 'Please enter a valid API key.' };
  }

  const trimmedKey = apiKey.trim();

  // Validate the key against Whop API before saving
  // This also returns the company name so we can auto-fill it
  let whopCompanyName: string | undefined;
  try {
    const client = createWhopClient(trimmedKey);
    const validation = await client.validateApiKey();

    if (!validation.valid) {
      return {
        success: false,
        error: 'Invalid Whop API key. Please check your key at whop.com/settings and try again.',
      };
    }

    whopCompanyName = validation.companyName ?? undefined;
  } catch {
    // Network error — still save the key, just skip company name population
    // Don't block onboarding for a validation network blip
  }

  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      whopApiKey: encrypt(trimmedKey),
      // Auto-populate company name if we got it — powers the "Welcome, {company}" UI
      ...(whopCompanyName && { whopCompanyName }),
    },
  });

  logger.info('onboarding_step_completed', { workspaceId, step: 'whop_api_key' });
  revalidatePath('/dashboard');

  return {
    success: true,
    data: { whopCompanyName },
  };
}

// ---------------------------------------------------------------------------
// Step 3: Trigger member sync
// ---------------------------------------------------------------------------

export async function triggerOnboardingSync(): Promise<OnboardingActionResult> {
  const { workspaceId } = await requireWorkspaceAccess();

  const result = await triggerSync();

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
