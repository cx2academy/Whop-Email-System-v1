'use server';

/**
 * lib/plans/actions.ts
 *
 * Server actions for plan management, usage queries, and add-on purchase.
 *
 * Stripe integration (future):
 *   Replace the simulateAddonPurchase body with a Stripe Payment Intent
 *   or Checkout Session creation. The add-on row creation at the bottom
 *   moves to the Stripe webhook handler (payment_intent.succeeded).
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { requireWorkspaceAccess, requireAdminAccess } from '@/lib/auth/session';
import { getWorkspaceUsage } from '@/lib/plans/gates';
import { PLANS, PLAN_ORDER, type PlanKey } from '@/lib/plans/config';

// ---------------------------------------------------------------------------
// Get current plan + usage — for dashboard and settings UI
// ---------------------------------------------------------------------------

export async function getPlanUsage() {
  const { workspaceId } = await requireWorkspaceAccess();
  return getWorkspaceUsage(workspaceId);
}

// ---------------------------------------------------------------------------
// Get all plan definitions — for upgrade modal
// ---------------------------------------------------------------------------

export async function getAllPlans() {
  return PLAN_ORDER.map((key) => PLANS[key]);
}

// ---------------------------------------------------------------------------
// Add-on packages available for purchase
// ---------------------------------------------------------------------------

export const ADDON_PACKAGES = {
  emails_10k:  { id: 'emails_10k',  type: 'emails'     as const, quantity: 10_000, priceUsd: 5.00,  label: '10,000 extra emails' },
  emails_50k:  { id: 'emails_50k',  type: 'emails'     as const, quantity: 50_000, priceUsd: 19.00, label: '50,000 extra emails' },
  contacts_1k: { id: 'contacts_1k', type: 'contacts'   as const, quantity: 1_000,  priceUsd: 4.00,  label: '1,000 extra contacts' },
  contacts_5k: { id: 'contacts_5k', type: 'contacts'   as const, quantity: 5_000,  priceUsd: 14.00, label: '5,000 extra contacts' },
  ai_50:       { id: 'ai_50',       type: 'ai_credits' as const, quantity: 50,     priceUsd: 9.00,  label: '50 AI credits' },
  ai_200:      { id: 'ai_200',      type: 'ai_credits' as const, quantity: 200,    priceUsd: 29.00, label: '200 AI credits' },
} as const;

export type AddonPackageId = keyof typeof ADDON_PACKAGES;

// ---------------------------------------------------------------------------
// Simulate add-on purchase (no payment yet)
// ---------------------------------------------------------------------------

export async function purchaseAddon(
  packageId: AddonPackageId
): Promise<{ success: boolean; error?: string }> {
  const { workspaceId } = await requireAdminAccess();

  const pkg = ADDON_PACKAGES[packageId];
  if (!pkg) return { success: false, error: 'Invalid package.' };

  // Calculate expiry: email/contact add-ons expire end-of-month
  // AI credit add-ons never expire (one-time grant)
  let expiresAt: Date | null = null;
  if (pkg.type === 'emails' || pkg.type === 'contacts') {
    const now = new Date();
    expiresAt = new Date(now.getFullYear(), now.getMonth() + 1, 1); // first of next month
  }

  await db.workspaceAddon.create({
    data: {
      workspaceId,
      type:      pkg.type,
      quantity:  pkg.quantity,
      expiresAt,
      // stripePaymentIntentId — populated by Stripe webhook in production
    },
  });

  // If AI credits, also top up the workspace.aiCredits balance immediately
  if (pkg.type === 'ai_credits') {
    await db.workspace.update({
      where: { id: workspaceId },
      data:  { aiCredits: { increment: pkg.quantity } },
    });
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Simulate plan upgrade (no payment yet)
// Swap this for a Stripe Checkout redirect in production.
// ---------------------------------------------------------------------------

export async function upgradePlan(
  targetPlan: PlanKey
): Promise<{ success: boolean; error?: string }> {
  const { workspaceId } = await requireAdminAccess();

  if (!PLANS[targetPlan]) return { success: false, error: 'Invalid plan.' };

  await db.workspace.update({
    where: { id: workspaceId },
    data:  { plan: targetPlan },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  return { success: true };
}
