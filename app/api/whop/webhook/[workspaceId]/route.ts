/**
 * app/api/whop/webhook/[workspaceId]/route.ts
 *
 * Per-workspace Whop webhook endpoint.
 *
 * Each workspace gets their own URL:
 *   https://your-domain.com/api/whop/webhook/<workspaceId>
 *
 * This means:
 *  - No shared secret in environment variables
 *  - Each user pastes their own URL into Whop
 *  - Verified using a per-workspace webhookSecret stored in the DB
 *
 * Setup flow (shown to user in Settings):
 *  1. Copy your webhook URL from Settings → Whop Integration
 *  2. Go to Whop Dashboard → Settings → Webhooks → Add Endpoint
 *  3. Paste the URL and select: membership.went_valid, payment.succeeded
 *  4. Copy the signing secret Whop gives you
 *  5. Paste it into Settings → Whop Integration → Webhook Secret → Save
 */

import { NextRequest } from 'next/server';
import { createHmac } from 'crypto';
import { db } from '@/lib/db/client';
import { recordPurchase } from '@/lib/attribution/purchase-tracker';

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
    // Secret not set yet — still accept but log a warning
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
    if (action === 'membership.went_valid') {
      const result = await recordPurchase({
        workspaceId,
        email: data.email as string,
        productId:   data.product as string | undefined,
        productName: `Whop: ${data.product ?? 'product'}`,
        amountCents: (data.amount_paid as number) ?? 0,
        currency:    (data.currency as string) ?? 'usd',
        source:      'whop',
        externalId:  `whop_mem_${data.id}`,
      });
      return Response.json({ received: true, ...result });
    }

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
      return Response.json({ received: true, ...result });
    }

    // Unhandled event — acknowledge so Whop doesn't retry
    return Response.json({ received: true, action, handled: false });

  } catch (err) {
    console.error(`[webhook/${workspaceId}] Error:`, err);
    return Response.json({ error: 'Processing failed' }, { status: 500 });
  }
}
