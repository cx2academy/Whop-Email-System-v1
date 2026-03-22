'use server';

/**
 * lib/plans/actions.ts
 *
 * Server actions only — async functions exclusively.
 * ADDON_PACKAGES and AddonPackageId have moved to lib/plans/packages.ts
 * so client components can import them without breaking the 'use server' rule.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { requireWorkspaceAccess, requireAdminAccess } from '@/lib/auth/session';
import { getWorkspaceUsage } from '@/lib/plans/gates';
import { PLANS, PLAN_ORDER, type PlanKey } from '@/lib/plans/config';
import { buildPlanCheckoutUrl, buildAddonCheckoutUrl } from '@/lib/whop/billing';
import { ADDON_PACKAGES, type AddonPackageId } from '@/lib/plans/packages';
import { auth } from '@/auth';

export async function getPlanUsage() {
  const { workspaceId } = await requireWorkspaceAccess();
  return getWorkspaceUsage(workspaceId);
}

export async function getAllPlans() {
  return PLAN_ORDER.map((key) => PLANS[key]);
}

export async function upgradePlan(
  targetPlan: PlanKey
): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> {
  const { workspaceId } = await requireAdminAccess();

  if (!PLANS[targetPlan] || targetPlan === 'FREE') {
    return { success: false, error: 'Invalid plan.' };
  }

  const session = await auth();
  const userEmail = session?.user?.email ?? '';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

  const checkoutUrl = buildPlanCheckoutUrl(
    targetPlan as Exclude<PlanKey, 'FREE'>,
    workspaceId,
    userEmail,
    appUrl
  );

  // No product ID set → dev-mode simulated upgrade
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

  // No product ID set → dev-mode simulated grant
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
