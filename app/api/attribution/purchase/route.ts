/**
 * app/api/attribution/purchase/route.ts
 *
 * Records a purchase and runs attribution.
 * Called by external systems (Whop webhook, custom checkout, Zapier, etc.)
 *
 * POST /api/attribution/purchase
 * Authorization: Bearer <api_key>
 * Body: {
 *   email: string,
 *   amountCents: number,
 *   productId?: string,
 *   productName?: string,
 *   currency?: string,
 *   externalId?: string,   // for idempotency
 *   metadata?: object
 * }
 */

import { NextRequest } from 'next/server';
import { resolveApiKey } from '@/lib/api/auth';
import { recordPurchase } from '@/lib/attribution/purchase-tracker';

export async function POST(req: NextRequest) {
  const ctx = await resolveApiKey(req);
  if (!ctx) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, amountCents, productId, productName, currency, externalId, metadata } = body;

  if (!email || typeof email !== 'string') {
    return Response.json({ error: 'email is required' }, { status: 422 });
  }
  if (!amountCents || typeof amountCents !== 'number') {
    return Response.json({ error: 'amountCents (number) is required' }, { status: 422 });
  }

  const result = await recordPurchase({
    workspaceId: ctx.workspaceId,
    email,
    amountCents,
    productId:   productId as string | undefined,
    productName: productName as string | undefined,
    currency:    currency as string | undefined,
    externalId:  externalId as string | undefined,
    metadata:    metadata as Record<string, unknown> | undefined,
    source:      'api',
  });

  return Response.json({ data: result }, { status: result.skipped ? 200 : 201 });
}
