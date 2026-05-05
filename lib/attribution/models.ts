/**
 * lib/attribution/models.ts
 *
 * Multi-model attribution computed from raw click history.
 * No schema changes needed — existing last_click DB rows are used directly,
 * other models are computed on-the-fly from EmailSend click timestamps.
 *
 * Models:
 *   last_click   — 100% credit to the most recent click before purchase
 *   first_touch  — 100% credit to the very first click (who introduced them)
 *   linear       — Equal split across every clicked campaign in the window
 *   time_decay   — More credit to recent clicks (half-life = 3 days)
 */

import { db } from '@/lib/db/client';
import {
  type AttributionModel,
  MODEL_LABELS,
  MODEL_DESCRIPTIONS,
  type CampaignRevRow,
} from './constants';

const ATTRIBUTION_WINDOW_DAYS = 7;
const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// ---------------------------------------------------------------------------
// Revenue map: campaignId → { revenueCents, purchases }
// ---------------------------------------------------------------------------

export async function computeCampaignRevenue(
  workspaceId: string,
  model: AttributionModel
): Promise<Map<string, { revenueCents: number; purchases: number }>> {
  // last_click uses pre-computed DB rows — fastest path
  if (model === 'last_click') {
    const rows = await db.revenueAttribution.groupBy({
      by:    ['campaignId'],
      where: { workspaceId, campaignId: { not: null }, attributionModel: 'last_click' },
      _sum:   { revenue: true },
      _count: { purchaseId: true },
    });
    const map = new Map<string, { revenueCents: number; purchases: number }>();
    for (const r of rows) {
      if (r.campaignId) {
        map.set(r.campaignId, {
          revenueCents: r._sum.revenue   ?? 0,
          purchases:    r._count.purchaseId,
        });
      }
    }
    return map;
  }

  // Other models: compute from purchases + click history
  const purchases = await db.purchase.findMany({
    where:   { workspaceId },
    select:  { id: true, contactId: true, amount: true, createdAt: true },
  });

  const map = new Map<string, { revenueCents: number; purchases: number }>();

  for (const purchase of purchases) {
    if (!purchase.contactId) continue;

    const windowStart = new Date(purchase.createdAt.getTime() - ATTRIBUTION_WINDOW_DAYS * 86400000);

    const clicks = await db.emailSend.findMany({
      where: {
        contactId:  purchase.contactId,
        workspaceId,
        clickedAt:  { not: null, gte: windowStart, lte: purchase.createdAt },
      },
      orderBy: { clickedAt: 'asc' },
      select:  { campaignId: true, clickedAt: true },
    });

    if (clicks.length === 0) continue;

    const assignments = allocateCredit(
      clicks.map((c) => ({ campaignId: c.campaignId, clickedAt: c.clickedAt! })),
      purchase.amount,
      model
    );

    for (const [campaignId, cents] of assignments) {
      const existing = map.get(campaignId) ?? { revenueCents: 0, purchases: 0 };
      map.set(campaignId, {
        revenueCents: existing.revenueCents + cents,
        purchases:    existing.purchases + (cents > 0 ? 1 : 0),
      });
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Credit allocation
// ---------------------------------------------------------------------------

function allocateCredit(
  touches:    Array<{ campaignId: string | null; clickedAt: Date }>,
  totalCents: number,
  model:      AttributionModel
): Map<string, number> {
  const result = new Map<string, number>();
  const valid  = touches.filter((t) => t.campaignId !== null);
  if (valid.length === 0) return result;

  switch (model) {
    case 'first_touch': {
      const first = valid[0];
      result.set(first.campaignId!, totalCents);
      break;
    }
    case 'linear': {
      const unique = Array.from(new Set(valid.map((t) => t.campaignId!)));
      const share  = Math.round(totalCents / unique.length);
      for (const id of unique) result.set(id, share);
      break;
    }
    case 'time_decay': {
      const halfLifeMs = 3 * 86400 * 1000;
      const now        = valid[valid.length - 1].clickedAt.getTime();
      const weights    = valid.map((t) => Math.pow(0.5, (now - t.clickedAt.getTime()) / halfLifeMs));
      const total      = weights.reduce((a, b) => a + b, 0);
      valid.forEach((t, i) => {
        if (!t.campaignId) return;
        const share = Math.round((weights[i] / total) * totalCents);
        result.set(t.campaignId, (result.get(t.campaignId) ?? 0) + share);
      });
      break;
    }
    default:
      break;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Top campaigns for UI
// ---------------------------------------------------------------------------

export async function getTopCampaignsByModel(
  workspaceId: string,
  model:       AttributionModel,
  limit = 8
): Promise<CampaignRevRow[]> {
  const revenueMap = await computeCampaignRevenue(workspaceId, model);
  if (revenueMap.size === 0) return [];

  const sorted = Array.from(revenueMap.entries())
    .sort((a, b) => b[1].revenueCents - a[1].revenueCents)
    .slice(0, limit);

  const campaignIds = sorted.map(([id]) => id);
  const campaigns   = await db.emailCampaign.findMany({
    where:  { id: { in: campaignIds } },
    select: { id: true, name: true, subject: true, totalSent: true, sentAt: true },
  });
  const campMap = Object.fromEntries(campaigns.map((c) => [c.id, c]));

  return sorted.map(([campaignId, { revenueCents, purchases }]) => {
    const c    = campMap[campaignId];
    const sent = c?.totalSent ?? 0;
    return {
      campaignId,
      campaignName:    c?.name    ?? 'Unknown',
      subject:         c?.subject ?? '',
      revenue:         fmt(revenueCents),
      revenueCents,
      purchases,
      emailsSent:      sent,
      revenuePerEmail: sent > 0 ? fmt(Math.round(revenueCents / sent)) : '$0.00',
      conversionRate:  sent > 0 ? ((purchases / sent) * 100).toFixed(1) + '%' : '0%',
      sentAt:          c?.sentAt?.toISOString() ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Total revenue for a model
// ---------------------------------------------------------------------------

export async function getRevenueSummaryForModel(
  workspaceId: string,
  model:       AttributionModel
): Promise<{ totalRevenueCents: number; totalRevenue: string }> {
  const map   = await computeCampaignRevenue(workspaceId, model);
  const total = Array.from(map.values()).reduce((s, v) => s + v.revenueCents, 0);
  return { totalRevenueCents: total, totalRevenue: fmt(total) };
}
