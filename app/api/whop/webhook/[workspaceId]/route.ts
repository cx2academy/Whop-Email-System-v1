/**
 * app/api/whop/webhook/[workspaceId]/route.ts
 *
 * Per-workspace Whop webhook endpoint.
 *
 * Handles ALL Whop events for a workspace:
 *   - membership.went_valid   → upgrade plan OR grant add-on + fire automation
 *   - membership.went_invalid → downgrade to FREE + fire automation
 *   - payment.succeeded       → record purchase + fire automation
 *
 * Setup (one-time per workspace):
 *   1. Settings → Whop Integration → copy your webhook URL
 *   2. Whop Dashboard → Developer → Webhooks → Add Endpoint → paste URL
 *   3. Select events: membership.went_valid, membership.went_invalid, payment.succeeded
 *   4. Copy the signing secret → paste into Settings → Webhook Secret → Save
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
import { fireTrigger } from '@/lib/automation/trigger-system';

// ── Signature verification ─────────────────────────────────────────────────

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

// ── Helper: resolve contactId from email ──────────────────────────────────

async function resolveContactId(workspaceId: string, email: string): Promise<string | null> {
  if (!email) return null;
  const contact = await db.contact.findFirst({
    where: { workspaceId, email: email.toLowerCase() },
    select: { id: true },
  });
  return contact?.id ?? null;
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  const { workspaceId } = params;

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, webhookSecret: true },
  });

  if (!workspace) {
    return Response.json({ error: 'Workspace not found' }, { status: 404 });
  }

  const rawBody = await req.text();

  if (workspace.webhookSecret) {
    const sig = req.headers.get('x-whop-signature');
    if (!verifySignature(rawBody, sig, workspace.webhookSecret)) {
      console.warn(`[webhook/${workspaceId}] Invalid signature — rejecting`);
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.warn(`[webhook/${workspaceId}] No webhookSecret — accepting unverified`);
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
    // ── membership.went_valid ─────────────────────────────────────────────
    if (action === 'membership.went_valid') {
      const membershipId = data.id as string;
      const productId    = data.product as string;
      const email        = (data.email as string)?.toLowerCase();
      const amountCents  = (data.amount_paid as number) ?? 0;
      const renewalEnd   = data.renewal_period_end
        ? new Date((data.renewal_period_end as number) * 1000)
        : null;

      // 1. Plan upgrade check
      const plan = resolvePlanFromProductId(productId);
      if (plan) {
        await applyPlanUpgrade(workspaceId, plan, membershipId, productId, renewalEnd);
        console.log(`[webhook/${workspaceId}] Plan upgraded to ${plan}`);
        return Response.json({ received: true, type: 'plan_upgrade', plan });
      }

      // 2. Add-on check
      const addonId = resolveAddonFromProductId(productId);
      if (addonId) {
        await applyAddonGrant(workspaceId, addonId, membershipId);
        console.log(`[webhook/${workspaceId}] Add-on granted: ${addonId}`);
        return Response.json({ received: true, type: 'addon_grant', addonId });
      }

      // 3. Purchase attribution (non-RevTray product = community member's purchase)
      if (email && amountCents > 0) {
        await recordPurchase({
          workspaceId,
          email,
          productId,
          productName: `Whop: ${productId}`,
          amountCents,
          currency:    (data.currency as string) ?? 'usd',
          source:      'whop',
          externalId:  `whop_mem_${membershipId}`,
        });
      }

      // 4. Fire automation triggers
      const contactId = await resolveContactId(workspaceId, email);
      if (contactId) {
        // membership_activated — any membership going valid
        await fireTrigger({
          workspaceId, triggerType: 'membership_activated', contactId,
          metadata: { productId, membershipId },
        });

        // product_purchased — specific product
        await fireTrigger({
          workspaceId, triggerType: 'product_purchased', contactId,
          metadata: { productId, membershipId },
        });

        console.log(`[webhook/${workspaceId}] Automation triggers fired for ${email}`);
      }

      return Response.json({ received: true, type: 'membership_valid' });
    }

    // ── membership.went_invalid ───────────────────────────────────────────
    if (action === 'membership.went_invalid') {
      const productId = data.product as string;
      const email     = (data.email as string)?.toLowerCase();

      // Plan downgrade (RevTray plan canceled)
      const plan = resolvePlanFromProductId(productId);
      if (plan) {
        await applyPlanDowngrade(workspaceId, 'canceled');
        console.log(`[webhook/${workspaceId}] Plan downgraded to FREE`);
        return Response.json({ received: true, type: 'plan_downgrade' });
      }

      // Fire automation trigger for community membership deactivation
      const contactId = await resolveContactId(workspaceId, email);
      if (contactId) {
        await fireTrigger({
          workspaceId, triggerType: 'membership_deactivated', contactId,
          metadata: { productId },
        });
        console.log(`[webhook/${workspaceId}] membership_deactivated fired for ${email}`);
      }

      return Response.json({ received: true, type: 'membership_invalid' });
    }

    // ── payment.succeeded ─────────────────────────────────────────────────
    if (action === 'payment.succeeded') {
      const email = (data.email as string)?.toLowerCase();

      await recordPurchase({
        workspaceId,
        email,
        productId:   data.product_id as string | undefined,
        productName: `Whop: ${data.product_id ?? 'payment'}`,
        amountCents: data.amount as number,
        currency:    (data.currency as string) ?? 'usd',
        source:      'whop',
        externalId:  `whop_pay_${data.id}`,
      });

      // Fire automation trigger
      const contactId = await resolveContactId(workspaceId, email);
      if (contactId) {
        await fireTrigger({
          workspaceId, triggerType: 'payment_succeeded', contactId,
          metadata: { productId: data.product_id, amount: data.amount },
        });
        console.log(`[webhook/${workspaceId}] payment_succeeded fired for ${email}`);
      }

      return Response.json({ received: true, type: 'payment' });
    }

    return Response.json({ received: true, action, handled: false });

  } catch (err) {
    console.error(`[webhook/${workspaceId}] Error:`, err);
    return Response.json({ error: 'Processing failed' }, { status: 500 });
  }
}
