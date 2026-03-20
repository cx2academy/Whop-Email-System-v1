/**
 * app/api/whop/webhook/[workspaceId]/route.ts
 *
 * Per-workspace Whop webhook endpoint.
 *
 * Handles ALL Whop events for a workspace:
 *   - membership.went_valid   → upgrade plan OR grant add-on (based on product ID)
 *   - membership.went_invalid → downgrade to FREE (canceled/expired)
 *   - payment.succeeded       → record purchase for revenue attribution
 *
 * Setup (one-time per workspace):
 *   1. Settings → Whop Integration → copy your webhook URL
 *   2. Whop Dashboard → Developer → Webhooks → Add Endpoint → paste URL
 *   3. Select events: membership.went_valid, membership.went_invalid, payment.succeeded
 *   4. Copy the signing secret → paste into Settings → Webhook Secret → Save
 *
 * For billing to work, also set these env vars in Vercel:
 *   WHOP_STARTER_PRODUCT_ID, WHOP_GROWTH_PRODUCT_ID, WHOP_SCALE_PRODUCT_ID
 *   (and add-on product IDs — see lib/whop/billing.ts)
 */

import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { db } from '@/lib/db/client';
import { recordPurchase } from '@/lib/attribution/purchase-tracker';
import {
  resolvePlanFromProductId,
  resolveAddonFromProductId,
  applyPlanUpgrade,
  applyPlanDowngrade,
  applyAddonGrant,
} from '@/lib/whop/billing';

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

function verifySignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  if (signature.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < signature.length; i++) {
    diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  const { workspaceId } = params;

  // Load workspace + secret
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, webhookSecret: true },
  });

  if (!workspace) {
    return Response.json({ error: 'Workspace not found' }, { status: 404 });
  }

  const rawBody = await req.text();

  // Verify signature if secret is configured
  if (workspace.webhookSecret) {
    const sig = req.headers.get('x-whop-signature');
    const valid = verifySignature(rawBody, sig, workspace.webhookSecret);
    if (!valid) {
      console.warn(`[webhook/${workspaceId}] Invalid signature`);
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn(`[webhook/${workspaceId}] No webhookSecret configured — accepting unverified`);
  }

  let event: { action: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, data } = event;
  console.log(`[webhook/${workspaceId}] ${action}`);

  try {
    // -----------------------------------------------------------------------
    // membership.went_valid — new purchase, reactivation, or renewal
    // -----------------------------------------------------------------------
    if (action === 'membership.went_valid') {
      const membershipId = data.id as string;
      const productId    = data.product as string;
      const email        = data.email as string;
      const amountCents  = (data.amount_paid as number) ?? 0;
      const renewalEnd   = data.renewal_period_end
        ? new Date((data.renewal_period_end as number) * 1000)
        : null;

      // 1. Check if this product maps to a plan upgrade
      const plan = resolvePlanFromProductId(productId);
      if (plan) {
        await applyPlanUpgrade(workspaceId, plan, membershipId, productId, renewalEnd);
        console.log(`[webhook/${workspaceId}] Plan upgraded to ${plan}`);
        return Response.json({ received: true, type: 'plan_upgrade', plan });
      }

      // 2. Check if this product maps to an add-on
      const addonId = resolveAddonFromProductId(productId);
      if (addonId) {
        await applyAddonGrant(workspaceId, addonId, membershipId);
        console.log(`[webhook/${workspaceId}] Add-on granted: ${addonId}`);
        return Response.json({ received: true, type: 'addon_grant', addonId });
      }

      // 3. Unknown product — record as a purchase for revenue attribution
      if (email && amountCents > 0) {
        const result = await recordPurchase({
          workspaceId,
          email,
          productId,
          productName: `Whop: ${productId}`,
          amountCents,
          currency: (data.currency as string) ?? 'usd',
          source:   'whop',
          externalId: `whop_mem_${membershipId}`,
        });
        return Response.json({ received: true, type: 'purchase', ...result });
      }

      return Response.json({ received: true, type: 'membership', handled: false });
    }

    // -----------------------------------------------------------------------
    // membership.went_invalid — canceled or expired
    // -----------------------------------------------------------------------
    if (action === 'membership.went_invalid') {
      const productId = data.product as string;

      // Only downgrade if this is a plan product (not an add-on or random product)
      const plan = resolvePlanFromProductId(productId);
      if (plan) {
        await applyPlanDowngrade(workspaceId, 'canceled');
        console.log(`[webhook/${workspaceId}] Plan downgraded to FREE (membership invalid)`);
        return Response.json({ received: true, type: 'plan_downgrade' });
      }

      return Response.json({ received: true, type: 'membership_invalid', handled: false });
    }

    // -----------------------------------------------------------------------
    // payment.succeeded — renewal payment or one-off charge
    // -----------------------------------------------------------------------
    if (action === 'payment.succeeded') {
      const result = await recordPurchase({
        workspaceId,
        email:       data.email as string,
        productId:   data.product_id as string | undefined,
        productName: `Whop: ${data.product_id ?? 'payment'}`,
        amountCents: data.amount as number,
        currency:    (data.currency as string) ?? 'usd',
        source:      'whop',
        externalId:  `whop_pay_${data.id}`,
      });
      return Response.json({ received: true, type: 'payment', ...result });
    }

    // Unhandled event — acknowledge so Whop doesn't retry
    return Response.json({ received: true, action, handled: false });

  } catch (err) {
    console.error(`[webhook/${workspaceId}] Error:`, err);
    return Response.json({ error: 'Processing failed' }, { status: 500 });
  }
}
