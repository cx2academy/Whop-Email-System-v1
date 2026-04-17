/**
 * app/api/whop/webhook/route.ts
 *
 * Receives Whop webhook events and feeds purchases into the attribution engine.
 *
 * Setup (one-time):
 *   1. Go to your Whop dashboard → Settings → Webhooks
 *   2. Add endpoint: https://your-domain.com/api/whop/webhook
 *   3. Select events: membership.went_valid, payment.succeeded
 *   4. Copy the signing secret → add as WHOP_WEBHOOK_SECRET in Vercel env vars
 *
 * Whop signs each request with HMAC-SHA256.
 * Header: x-whop-signature: sha256=<hex>
 *
 * Events we handle:
 *   membership.went_valid  — new purchase or reactivation (most reliable)
 *   payment.succeeded      — payment processed (catches renewals)
 */

import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { db } from '@/lib/db/client';
import { recordPurchase } from '@/lib/attribution/purchase-tracker';
import { triggerAutomations } from '@/lib/automations/engine';
import { createNotification } from '@/lib/notifications/actions';
import { NotificationType } from '@prisma/client';

// ---------------------------------------------------------------------------
// Whop webhook payload types (v2 / v5 shape)
// ---------------------------------------------------------------------------

interface WhopMembershipPayload {
  id: string;
  email: string;
  product: string;       // product ID
  plan: string;          // plan ID
  company_id: string;
  amount_paid?: number;  // cents — may be 0 for free products
  currency?: string;
  created_at?: number;
}

interface WhopPaymentPayload {
  id: string;
  email: string;
  membership_id?: string;
  product_id?: string;
  company_id: string;
  amount: number;        // cents
  currency: string;
}

interface WhopWebhookEvent {
  action: string;
  data: WhopMembershipPayload | WhopPaymentPayload;
}

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

async function verifyWhopSignature(
  req: NextRequest,
  rawBody: string
): Promise<boolean> {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  
  // If no secret configured, skip verification in dev but warn
  if (!secret) {
    console.warn('[whop/webhook] WHOP_WEBHOOK_SECRET not set — skipping signature verification');
    return true;
  }

  const signature = req.headers.get('x-whop-signature');
  if (!signature) return false;

  // Whop sends: sha256=<hex_digest>
  const expected = 'sha256=' + createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < signature.length; i++) {
    diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Resolve workspace from Whop company ID
// ---------------------------------------------------------------------------

async function resolveWorkspace(companyId: string): Promise<string | null> {
  const workspace = await db.workspace.findFirst({
    where: { whopCompanyId: companyId },
    select: { id: true },
  });
  return workspace?.id ?? null;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleMembershipWentValid(
  data: WhopMembershipPayload,
  workspaceId: string
) {
  const amountCents = data.amount_paid ?? 0;

  const purchaseResult = await recordPurchase({
    workspaceId,
    email: data.email,
    productId: data.product,
    productName: `Whop product: ${data.product}`,
    amountCents,
    currency: data.currency ?? 'usd',
    source: 'whop',
    externalId: `whop_mem_${data.id}`,
  });

  // Trigger automations
  const contact = await db.contact.findUnique({
    where: { workspaceId_email: { workspaceId, email: data.email } },
    select: { id: true },
  });

  if (contact) {
    await triggerAutomations({
      workspaceId,
      contactId: contact.id,
      triggerType: 'whop_purchase',
      metadata: { productId: data.product, planId: data.plan },
    });
  }

  // Notify workspace owner of the new sale
  await createNotification({
    workspaceId,
    type: NotificationType.BILLING,
    title: 'New Sale!',
    message: `A new purchase was made by ${data.email} for $${(amountCents / 100).toFixed(2)}.`,
    actionUrl: '/dashboard/revenue',
  });

  return purchaseResult;
}

async function handlePaymentSucceeded(
  data: WhopPaymentPayload,
  workspaceId: string
) {
  const purchaseResult = await recordPurchase({
    workspaceId,
    email: data.email,
    productId: data.product_id,
    productName: data.product_id ? `Whop product: ${data.product_id}` : 'Whop payment',
    amountCents: data.amount,
    currency: data.currency,
    source: 'whop',
    externalId: `whop_pay_${data.id}`,
  });

  // Notify workspace owner of the payment
  await createNotification({
    workspaceId,
    type: NotificationType.BILLING,
    title: 'Payment Received',
    message: `Payment of $${(data.amount / 100).toFixed(2)} received from ${data.email}.`,
    actionUrl: '/dashboard/revenue',
  });

  return purchaseResult;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verify signature
  const isValid = await verifyWhopSignature(req, rawBody);
  if (!isValid) {
    console.warn('[whop/webhook] Invalid signature — rejecting');
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: WhopWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, data } = event;
  const externalEventId = (data as any).id;
  console.log(`[whop/webhook] Received: ${action} (ID: ${externalEventId})`);

  // Check for idempotency
  if (externalEventId) {
    const existing = await db.webhookLog.findUnique({
      where: { externalEventId },
      select: { id: true, status: true }
    });
    if (existing) {
      console.log(`[whop/webhook] Event ${externalEventId} already processed with status ${existing.status} — skipping`);
      return Response.json({ received: true, duplicate: true });
    }
  }

  // Resolve workspace — Whop events include company_id
  const companyId = (data as any).company_id;
  if (!companyId) {
    return Response.json({ error: 'No company_id in payload' }, { status: 422 });
  }

  const workspaceId = await resolveWorkspace(companyId);
  
  // Log the incoming webhook
  const webhookLog = await db.webhookLog.create({
    data: {
      workspaceId: workspaceId || 'unknown',
      externalEventId,
      action,
      payload: event,
      status: workspaceId ? 200 : 422,
      errorMessage: workspaceId ? null : `No workspace found for company ${companyId}`,
    }
  });

  if (!workspaceId) {
    // This Whop company isn't connected to any workspace — ignore silently
    console.log(`[whop/webhook] No workspace for company ${companyId} — skipping`);
    return Response.json({ received: true, attributed: false });
  }

  try {
    let result;

    if (action === 'membership.went_valid') {
      result = await handleMembershipWentValid(
        data as WhopMembershipPayload,
        workspaceId
      );
    } else if (action === 'payment.succeeded') {
      result = await handlePaymentSucceeded(
        data as WhopPaymentPayload,
        workspaceId
      );
    } else {
      // Update log for unhandled action
      await db.webhookLog.update({
        where: { id: webhookLog.id },
        data: { status: 204, errorMessage: `Unhandled action: ${action}` }
      });
      return Response.json({ received: true, action, handled: false });
    }

    // Update log for success
    await db.webhookLog.update({
      where: { id: webhookLog.id },
      data: { status: 200 }
    });

    console.log(`[whop/webhook] ${action} processed:`, result);
    return Response.json({ received: true, ...result });

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[whop/webhook] Error processing event:', err);
    
    // Update log for failure
    await db.webhookLog.update({
      where: { id: webhookLog.id },
      data: { status: 500, errorMessage }
    });

    return Response.json({ error: 'Processing failed' }, { status: 500 });
  }
}
