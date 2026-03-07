/**
 * lib/attribution/purchase-tracker.ts
 *
 * Records a purchase and immediately runs attribution.
 *
 * Called by:
 *   - POST /api/attribution/purchase  (external webhook / API)
 *   - Whop webhook handler (future)
 *
 * Idempotent: duplicate externalIds are silently skipped.
 */

import { db } from '@/lib/db/client';
import { attributePurchase } from './attribution-engine';

export interface RecordPurchaseInput {
  workspaceId: string;
  email: string;
  contactId?: string;
  productId?: string;
  productName?: string;
  amountCents: number;
  currency?: string;
  source?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordPurchaseResult {
  purchaseId: string;
  attributed: boolean;
  campaignId?: string;
  workflowId?: string;
  skipped?: boolean;
}

export async function recordPurchase(
  input: RecordPurchaseInput
): Promise<RecordPurchaseResult> {
  const {
    workspaceId,
    email,
    contactId,
    productId,
    productName,
    amountCents,
    currency = 'usd',
    source = 'api',
    externalId,
    metadata,
  } = input;

  // Idempotency check
  if (externalId) {
    const existing = await db.purchase.findUnique({
      where: { workspaceId_externalId: { workspaceId, externalId } },
    });
    if (existing) {
      return { purchaseId: existing.id, attributed: false, skipped: true };
    }
  }

  // Resolve contactId from email if not given
  let resolvedContactId = contactId ?? null;
  if (!resolvedContactId) {
    const contact = await db.contact.findUnique({
      where: { workspaceId_email: { workspaceId, email } },
      select: { id: true },
    });
    resolvedContactId = contact?.id ?? null;
  }

  const purchase = await db.purchase.create({
    data: {
      workspaceId,
      contactId: resolvedContactId,
      email,
      productId,
      productName,
      amount: amountCents,
      currency,
      source,
      externalId: externalId ?? undefined,
      metadata: metadata ? (metadata as any) : undefined,
    },
  });

  // Run attribution immediately
  const result = await attributePurchase(
    purchase.id,
    workspaceId,
    resolvedContactId,
    email,
    amountCents
  );

  return {
    purchaseId: purchase.id,
    attributed: result.attributed,
    campaignId: result.campaignId,
    workflowId: result.workflowId,
  };
}
