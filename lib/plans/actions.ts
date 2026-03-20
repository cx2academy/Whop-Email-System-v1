'use server';

/**
 * lib/plans/actions.ts
 *
 * Server actions for plan management, usage queries, and Whop billing.
 *
 * Payment flow:
 *   1. User clicks "Upgrade to Growth"
 *   2. upgradePlan('GROWTH') returns { checkoutUrl } 
 *   3. Client redirects to checkoutUrl (whop.com/checkout/...)
 *   4. User pays on Whop
 *   5. Whop sends membership.went_valid webhook to /api/whop/webhook/[workspaceId]
 *   6. Webhook calls applyPlanUpgrade() which sets workspace.plan
 *
 * If WHOP_GROWTH_PRODUCT_ID is not set, falls back to simulated upgrade
 * so the UI still works during development.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { requireWorkspaceAccess, requireAdminAccess } from '@/lib/auth/session';
import { getWorkspaceUsage } from '@/lib/plans/gates';
import { PLANS, PLAN_ORDER, type PlanKey } from '@/lib/plans/config';
import { buildPlanCheckoutUrl, buildAddonCheckoutUrl } from '@/lib/whop/billing';
import { auth } from '@/auth';

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
// Upgrade plan — returns Whop checkout URL
// ---------------------------------------------------------------------------

export async function upgradePlan(
  targetPlan: PlanKey
): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> {
  const { workspaceId } = await requireAdminAccess();

  if (!PLANS[targetPlan] || targetPlan === 'FREE') {
    return { success: false, error: 'Invalid plan.' };
  }

  // Get user email to pre-fill Whop checkout
  const session = await auth();
  const userEmail = session?.user?.email ?? '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

  // Build Whop checkout URL
  const checkoutUrl = buildPlanCheckoutUrl(
    targetPlan as Exclude<PlanKey, 'FREE'>,
    workspaceId,
    userEmail,
    appUrl
  );

  // If product ID not configured yet, simulate upgrade (dev mode)
  if (!checkoutUrl) {
    console.warn(`[billing] No Whop product ID for plan ${targetPlan} — simulating upgrade`);
    await db.workspace.update({
      where: { id: workspaceId },
      data:  { plan: targetPlan, billingStatus: 'active' },
    });
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/settings');
    return { success: true };
  }

  return { success: true, checkoutUrl };
}

// ---------------------------------------------------------------------------
// Purchase add-on — returns Whop checkout URL
// ---------------------------------------------------------------------------

export async function purchaseAddon(
  packageId: AddonPackageId
): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> {
  const { workspaceId } = await requireAdminAccess();

  const pkg = ADDON_PACKAGES[packageId];
  if (!pkg) return { success: false, error: 'Invalid package.' };

  const session = await auth();
  const userEmail = session?.user?.email ?? '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

  const checkoutUrl = buildAddonCheckoutUrl(packageId, workspaceId, userEmail, appUrl);

  // If product ID not configured yet, simulate grant (dev mode)
  if (!checkoutUrl) {
    console.warn(`[billing] No Whop product ID for addon ${packageId} — simulating grant`);

    const now = new Date();
    const expiresAt = (pkg.type === 'emails' || pkg.type === 'contacts')
      ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
      : null;

    await db.workspaceAddon.create({
      data: { workspaceId, type: pkg.type, quantity: pkg.quantity, expiresAt },
    });

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

  return { success: true, checkoutUrl };
}
