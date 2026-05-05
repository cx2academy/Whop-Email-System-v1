/**
 * lib/whop/billing.ts
 *
 * Whop-native billing integration.
 *
 * How it works:
 *   1. You create products on Whop for each plan and add-on.
 *   2. Each product has a unique ID (e.g. "prod_xxxx").
 *   3. Users click "Upgrade" → we redirect to whop.com/checkout/<productId>.
 *   4. Whop handles payment and sends a webhook to our endpoint.
 *   5. Our webhook handler sets workspace.plan based on the product purchased.
 *
 * Setup (one-time, in Whop Dashboard):
 *   1. Go to whop.com/dashboard → Products → New Product
 *   2. Create one product per plan (Starter $29/mo, Growth $79/mo, Scale $199/mo)
 *   3. Create one product per add-on (10k emails, 50k emails, etc.)
 *   4. Copy each product ID into your Vercel environment variables (see below)
 *
 * Required env vars:
 *   WHOP_STARTER_PRODUCT_ID=prod_xxxx
 *   WHOP_GROWTH_PRODUCT_ID=prod_xxxx
 *   WHOP_SCALE_PRODUCT_ID=prod_xxxx
 *   WHOP_ADDON_EMAILS_10K_PRODUCT_ID=prod_xxxx
 *   WHOP_ADDON_EMAILS_50K_PRODUCT_ID=prod_xxxx
 *   WHOP_ADDON_CONTACTS_1K_PRODUCT_ID=prod_xxxx
 *   WHOP_ADDON_CONTACTS_5K_PRODUCT_ID=prod_xxxx
 *   WHOP_ADDON_AI_50_PRODUCT_ID=prod_xxxx
 *   WHOP_ADDON_AI_200_PRODUCT_ID=prod_xxxx
 *
 * Whop checkout URL format:
 *   https://whop.com/checkout/<productId>/?redirectUrl=<encodedCallbackUrl>
 */

import type { PlanKey } from '@/lib/plans/config';
import type { AddonPackageId } from '@/lib/plans/packages';

// ---------------------------------------------------------------------------
// Product ID getters — read from env at call time (not module load)
// so missing vars don't crash the whole app
// ---------------------------------------------------------------------------

export function getWhopProductId(plan: Exclude<PlanKey, 'FREE'>): string | null {
  const map: Record<Exclude<PlanKey, 'FREE'>, string | undefined> = {
    STARTER: process.env.WHOP_STARTER_PRODUCT_ID,
    GROWTH:  process.env.WHOP_GROWTH_PRODUCT_ID,
    SCALE:   process.env.WHOP_SCALE_PRODUCT_ID,
  };
  return map[plan] ?? null;
}

export function getWhopAddonProductId(addonId: AddonPackageId): string | null {
  const map: Record<AddonPackageId, string | undefined> = {
    emails_10k:  process.env.WHOP_ADDON_EMAILS_10K_PRODUCT_ID,
    emails_50k:  process.env.WHOP_ADDON_EMAILS_50K_PRODUCT_ID,
    contacts_1k: process.env.WHOP_ADDON_CONTACTS_1K_PRODUCT_ID,
    contacts_5k: process.env.WHOP_ADDON_CONTACTS_5K_PRODUCT_ID,
    ai_50:       process.env.WHOP_ADDON_AI_50_PRODUCT_ID,
    ai_200:      process.env.WHOP_ADDON_AI_200_PRODUCT_ID,
  };
  return map[addonId] ?? null;
}

// ---------------------------------------------------------------------------
// Reverse lookup — given a Whop product ID, what plan does it map to?
// Used by the webhook handler to set workspace.plan.
// ---------------------------------------------------------------------------

export function resolvePlanFromProductId(productId: string): PlanKey | null {
  const map: Record<string, PlanKey> = {};

  if (process.env.WHOP_STARTER_PRODUCT_ID) map[process.env.WHOP_STARTER_PRODUCT_ID] = 'STARTER';
  if (process.env.WHOP_GROWTH_PRODUCT_ID)  map[process.env.WHOP_GROWTH_PRODUCT_ID]  = 'GROWTH';
  if (process.env.WHOP_SCALE_PRODUCT_ID)   map[process.env.WHOP_SCALE_PRODUCT_ID]   = 'SCALE';

  return map[productId] ?? null;
}

// ---------------------------------------------------------------------------
// Reverse lookup — given a Whop product ID, what add-on does it map to?
// Used by the webhook handler to grant add-on credits.
// ---------------------------------------------------------------------------

export function resolveAddonFromProductId(productId: string): AddonPackageId | null {
  const map: Record<string, AddonPackageId> = {};

  if (process.env.WHOP_ADDON_EMAILS_10K_PRODUCT_ID)  map[process.env.WHOP_ADDON_EMAILS_10K_PRODUCT_ID!]  = 'emails_10k';
  if (process.env.WHOP_ADDON_EMAILS_50K_PRODUCT_ID)  map[process.env.WHOP_ADDON_EMAILS_50K_PRODUCT_ID!]  = 'emails_50k';
  if (process.env.WHOP_ADDON_CONTACTS_1K_PRODUCT_ID) map[process.env.WHOP_ADDON_CONTACTS_1K_PRODUCT_ID!] = 'contacts_1k';
  if (process.env.WHOP_ADDON_CONTACTS_5K_PRODUCT_ID) map[process.env.WHOP_ADDON_CONTACTS_5K_PRODUCT_ID!] = 'contacts_5k';
  if (process.env.WHOP_ADDON_AI_50_PRODUCT_ID)       map[process.env.WHOP_ADDON_AI_50_PRODUCT_ID!]       = 'ai_50';
  if (process.env.WHOP_ADDON_AI_200_PRODUCT_ID)      map[process.env.WHOP_ADDON_AI_200_PRODUCT_ID!]      = 'ai_200';

  return map[productId] ?? null;
}

// ---------------------------------------------------------------------------
// Checkout URL builder
// ---------------------------------------------------------------------------

const WHOP_CHECKOUT_BASE = 'https://whop.com/checkout';

export interface CheckoutUrlOptions {
  productId: string;
  /** URL to redirect to after successful payment */
  successUrl: string;
  /** Pre-fill the user's email in Whop checkout */
  email?: string;
  /** Arbitrary metadata passed back in the webhook (Whop passes it through) */
  metadata?: Record<string, string>;
}

export function buildCheckoutUrl(opts: CheckoutUrlOptions): string {
  const params = new URLSearchParams();
  params.set('redirectUrl', opts.successUrl);
  if (opts.email) params.set('email', opts.email);
  if (opts.metadata) {
    for (const [k, v] of Object.entries(opts.metadata)) {
      params.set(`metadata[${k}]`, v);
    }
  }
  return `${WHOP_CHECKOUT_BASE}/${opts.productId}/?${params.toString()}`;
}

// ---------------------------------------------------------------------------
// Plan checkout URL — the main entry point from the upgrade modal
// ---------------------------------------------------------------------------

export function buildPlanCheckoutUrl(
  plan: Exclude<PlanKey, 'FREE'>,
  workspaceId: string,
  userEmail: string,
  appUrl: string
): string | null {
  const productId = getWhopProductId(plan);
  if (!productId) return null;

  const successUrl = `${appUrl}/api/whop/billing-success?workspaceId=${workspaceId}&plan=${plan}`;

  return buildCheckoutUrl({
    productId,
    successUrl,
    email: userEmail,
    metadata: { workspaceId, targetPlan: plan },
  });
}

// ---------------------------------------------------------------------------
// Add-on checkout URL
// ---------------------------------------------------------------------------

export function buildAddonCheckoutUrl(
  addonId: AddonPackageId,
  workspaceId: string,
  userEmail: string,
  appUrl: string
): string | null {
  const productId = getWhopAddonProductId(addonId);
  if (!productId) return null;

  const successUrl = `${appUrl}/api/whop/billing-success?workspaceId=${workspaceId}&addon=${addonId}`;

  return buildCheckoutUrl({
    productId,
    successUrl,
    email: userEmail,
    metadata: { workspaceId, addonId },
  });
}

// ---------------------------------------------------------------------------
// Apply a plan upgrade to a workspace — called by webhook handler
// ---------------------------------------------------------------------------

export async function applyPlanUpgrade(
  workspaceId: string,
  plan: PlanKey,
  membershipId: string,
  productId: string,
  renewalPeriodEnd: Date | null
): Promise<void> {
  const { db } = await import('@/lib/db/client');
  const { revalidatePath } = await import('next/cache');

  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      plan,
      whopMembershipId:  membershipId,
      whopPlanProductId: productId,
      billingStatus:     'active',
      billingPeriodEnd:  renewalPeriodEnd,
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
}

// ---------------------------------------------------------------------------
// Apply a plan downgrade (membership expired/canceled) — called by webhook
// ---------------------------------------------------------------------------

export async function applyPlanDowngrade(
  workspaceId: string,
  reason: 'canceled' | 'expired'
): Promise<void> {
  const { db } = await import('@/lib/db/client');
  const { revalidatePath } = await import('next/cache');

  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      plan:             'FREE',
      billingStatus:    reason,
      billingPeriodEnd: null,
    },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
}

// ---------------------------------------------------------------------------
// Apply an add-on grant — called by webhook after add-on purchase
// ---------------------------------------------------------------------------

export async function applyAddonGrant(
  workspaceId: string,
  addonId: AddonPackageId,
  membershipId: string
): Promise<void> {
  const { db } = await import('@/lib/db/client');
  const { ADDON_PACKAGES } = await import('@/lib/plans/packages');
  const { revalidatePath } = await import('next/cache');

  const pkg = ADDON_PACKAGES[addonId];
  if (!pkg) return;

  const now = new Date();
  const expiresAt = (pkg.type === 'emails' || pkg.type === 'contacts')
    ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
    : null;

  await db.workspaceAddon.create({
    data: {
      workspaceId,
      type:            pkg.type,
      quantity:        pkg.quantity,
      whopMembershipId: membershipId,
      expiresAt,
    },
  });

  // AI credits: top up balance immediately
  if (pkg.type === 'ai_credits') {
    await db.workspace.update({
      where: { id: workspaceId },
      data:  { aiCredits: { increment: pkg.quantity } },
    });
  }

  revalidatePath('/dashboard');
}
