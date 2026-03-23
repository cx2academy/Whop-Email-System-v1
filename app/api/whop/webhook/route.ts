/**
 * app/api/whop/webhook/route.ts
 *
 * Platform-level Whop webhook — handles RevTray's OWN billing.
 * This fires when someone buys/cancels a RevTray plan on Whop.
 *
 * Setup (one-time in Whop dashboard):
 *   1. Whop Dashboard → Developer → Webhooks → Add Endpoint
 *   2. URL: https://www.revtray.com/api/whop/webhook
 *   3. Events: membership.went_valid, membership.went_invalid, payment.succeeded
 *   4. Copy the signing secret → add as WHOP_WEBHOOK_SECRET in Vercel env vars
 *
 * The workspaceId is passed via metadata in the checkout URL and echoed
 * back by Whop in the webhook payload, so we don't need to look it up.
 */

import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { recordPurchase } from '@/lib/attribution/purchase-tracker';
import {
  resolvePlanFromProductId,
  resolveAddonFromProductId,
  applyPlanUpgrade,
  applyPlanDowngrade,
  applyAddonGrant,
} from '@/lib/whop/billing';

// ── Signature verification ────────────────────────────────────────────────────

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('[billing-webhook] WHOP_WEBHOOK_SECRET not set — skipping verification');
    return true; // allow in dev; set the env var in production
  }
  if (!signature) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex');
  if (signature.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < signature.length; i++) {
    diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get('x-whop-signature');

  if (!verifySignature(rawBody, sig)) {
    console.warn('[billing-webhook] Invalid signature — rejecting');
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: { action: string; data: Record<string, any> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, data } = event;
  console.log(`[billing-webhook] ${action}`);

  // workspaceId is embedded in metadata when we build the checkout URL
  const workspaceId: string | undefined =
    data.metadata?.workspaceId ?? data.metadata?.['workspaceId'];

  try {
    // ── membership.went_valid — new purchase or renewal ──────────────────────
    if (action === 'membership.went_valid') {
      const membershipId = data.id as string;
      const productId    = (data.product ?? data.product_id) as string;
      const email        = data.email as string;
      const amountCents  = (data.amount_paid ?? 0) as number;
      const renewalEnd   = data.renewal_period_end
        ? new Date((data.renewal_period_end as number) * 1000)
        : null;

      // Check if this is a RevTray plan product
      const plan = resolvePlanFromProductId(productId);
      if (plan && workspaceId) {
        await applyPlanUpgrade(workspaceId, plan, membershipId, productId, renewalEnd);
        console.log(`[billing-webhook] Plan upgraded to ${plan} for workspace ${workspaceId}`);
        return Response.json({ received: true, type: 'plan_upgrade', plan });
      }

      // Check if this is a RevTray add-on product
      const addonId = resolveAddonFromProductId(productId);
      if (addonId && workspaceId) {
        await applyAddonGrant(workspaceId, addonId, membershipId);
        console.log(`[billing-webhook] Add-on granted: ${addonId}`);
        return Response.json({ received: true, type: 'addon_grant', addonId });
      }

      // Unknown product — record as revenue attribution for a user's workspace
      if (email && amountCents > 0 && workspaceId) {
        await recordPurchase({
          workspaceId,
          email,
          productId,
          productName: `Whop: ${productId}`,
          amountCents,
          currency: (data.currency as string) ?? 'usd',
          source: 'whop',
          externalId: `whop_mem_${membershipId}`,
        });
      }

      return Response.json({ received: true, type: 'membership', handled: false });
    }

    // ── membership.went_invalid — canceled or expired ────────────────────────
    if (action === 'membership.went_invalid') {
      const productId = (data.product ?? data.product_id) as string;
      const plan = resolvePlanFromProductId(productId);
      if (plan && workspaceId) {
        await applyPlanDowngrade(workspaceId, 'canceled');
        console.log(`[billing-webhook] Plan downgraded to FREE for workspace ${workspaceId}`);
        return Response.json({ received: true, type: 'plan_downgrade' });
      }
      return Response.json({ received: true, type: 'membership_invalid', handled: false });
    }

    // ── payment.succeeded ────────────────────────────────────────────────────
    if (action === 'payment.succeeded' && workspaceId) {
      await recordPurchase({
        workspaceId,
        email:       data.email as string,
        productId:   data.product_id as string | undefined,
        productName: `Whop: ${data.product_id ?? 'payment'}`,
        amountCents: data.amount as number,
        currency:    (data.currency as string) ?? 'usd',
        source:      'whop',
        externalId:  `whop_pay_${data.id}`,
      });
      return Response.json({ received: true, type: 'payment' });
    }

    return Response.json({ received: true, action, handled: false });

  } catch (err) {
    console.error('[billing-webhook] Error:', err);
    return Response.json({ error: 'Processing failed' }, { status: 500 });
  }
}
