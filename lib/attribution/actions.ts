'use server';

/**
 * lib/attribution/actions.ts
 * Server actions for revenue dashboard data and export.
 */

import { db } from '@/lib/db/client';
import { requireWorkspaceAccess } from '@/lib/auth/session';

const CENTS = 100;
const fmt = (cents: number) => `$${(cents / CENTS).toFixed(2)}`;

// ---------------------------------------------------------------------------
// Dashboard summary
// ---------------------------------------------------------------------------

export async function getRevenueSummary() {
  const { workspaceId } = await requireWorkspaceAccess();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const sevenDaysAgo  = new Date(Date.now() - 7  * 86400000);

  const [totalResult, last30Result, last7Result, purchaseCount] = await Promise.all([
    db.revenueAttribution.aggregate({ where: { workspaceId }, _sum: { revenue: true } }),
    db.revenueAttribution.aggregate({ where: { workspaceId, createdAt: { gte: thirtyDaysAgo } }, _sum: { revenue: true } }),
    db.revenueAttribution.aggregate({ where: { workspaceId, createdAt: { gte: sevenDaysAgo } }, _sum: { revenue: true } }),
    db.purchase.count({ where: { workspaceId } }),
  ]);

  return {
    totalRevenue:   fmt(totalResult._sum.revenue ?? 0),
    last30Days:     fmt(last30Result._sum.revenue ?? 0),
    last7Days:      fmt(last7Result._sum.revenue ?? 0),
    totalPurchases: purchaseCount,
    totalRevenueCents: totalResult._sum.revenue ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Top campaigns by revenue
// ---------------------------------------------------------------------------

export async function getTopCampaignsByRevenue(limit = 10) {
  const { workspaceId } = await requireWorkspaceAccess();

  const grouped = await db.revenueAttribution.groupBy({
    by: ['campaignId'],
    where: { workspaceId, campaignId: { not: null } },
    _sum: { revenue: true },
    _count: { purchaseId: true },
    orderBy: { _sum: { revenue: 'desc' } },
    take: limit,
  });

  const campaignIds = grouped.map((g) => g.campaignId!).filter(Boolean);
  const campaigns = await db.emailCampaign.findMany({
    where: { id: { in: campaignIds } },
    select: { id: true, name: true, subject: true, totalSent: true, sentAt: true },
  });
  const campaignMap = Object.fromEntries(campaigns.map((c) => [c.id, c]));

  return grouped.map((g) => {
    const campaign = campaignMap[g.campaignId!];
    const revCents = g._sum.revenue ?? 0;
    const purchases = g._count.purchaseId;
    const sent = campaign?.totalSent ?? 0;

    return {
      campaignId:       g.campaignId!,
      campaignName:     campaign?.name ?? 'Unknown',
      subject:          campaign?.subject ?? '',
      revenue:          fmt(revCents),
      revenueCents:     revCents,
      purchases,
      emailsSent:       sent,
      revenuePerEmail:  sent > 0 ? fmt(Math.round(revCents / sent)) : '$0.00',
      conversionRate:   sent > 0 ? ((purchases / sent) * 100).toFixed(1) + '%' : '0%',
      sentAt:           campaign?.sentAt?.toISOString() ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Top automations by revenue
// ---------------------------------------------------------------------------

export async function getTopWorkflowsByRevenue(limit = 5) {
  const { workspaceId } = await requireWorkspaceAccess();

  const grouped = await db.revenueAttribution.groupBy({
    by: ['workflowId'],
    where: { workspaceId, workflowId: { not: null } },
    _sum: { revenue: true },
    _count: { purchaseId: true },
    orderBy: { _sum: { revenue: 'desc' } },
    take: limit,
  });

  const workflowIds = grouped.map((g) => g.workflowId!).filter(Boolean);
  const workflows = await db.automationWorkflow.findMany({
    where: { id: { in: workflowIds } },
    select: { id: true, name: true, totalRuns: true },
  });
  const wfMap = Object.fromEntries(workflows.map((w) => [w.id, w]));

  return grouped.map((g) => ({
    workflowId:   g.workflowId!,
    workflowName: wfMap[g.workflowId!]?.name ?? 'Unknown',
    revenue:      fmt(g._sum.revenue ?? 0),
    revenueCents: g._sum.revenue ?? 0,
    purchases:    g._count.purchaseId,
    totalRuns:    wfMap[g.workflowId!]?.totalRuns ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Revenue per subscriber (top spenders)
// ---------------------------------------------------------------------------

export async function getTopSubscribersByRevenue(limit = 10) {
  const { workspaceId } = await requireWorkspaceAccess();

  const grouped = await db.purchase.groupBy({
    by: ['contactId', 'email'],
    where: { workspaceId, contactId: { not: null } },
    _sum: { amount: true },
    _count: { id: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: limit,
  });

  const contactIds = grouped.map((g) => g.contactId!).filter(Boolean);
  const contacts = await db.contact.findMany({
    where: { id: { in: contactIds } },
    select: { id: true, email: true, firstName: true, lastName: true },
  });
  const contactMap = Object.fromEntries(contacts.map((c) => [c.id, c]));

  return grouped.map((g) => ({
    contactId:      g.contactId!,
    email:          contactMap[g.contactId!]?.email ?? g.email,
    name:           [contactMap[g.contactId!]?.firstName, contactMap[g.contactId!]?.lastName].filter(Boolean).join(' ') || null,
    totalRevenue:   fmt(g._sum.amount ?? 0),
    totalPurchases: g._count.id,
  }));
}

// ---------------------------------------------------------------------------
// Recent purchases
// ---------------------------------------------------------------------------

export async function getRecentPurchases(limit = 20) {
  const { workspaceId } = await requireWorkspaceAccess();

  const purchases = await db.purchase.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      attributions: {
        select: { campaignId: true, workflowId: true },
        take: 1,
      },
    },
  });

  // Resolve campaign names
  const campaignIds = purchases.flatMap((p) => p.attributions.map((a) => a.campaignId)).filter(Boolean) as string[];
  const campaigns = await db.emailCampaign.findMany({
    where: { id: { in: campaignIds } },
    select: { id: true, name: true },
  });
  const campaignMap = Object.fromEntries(campaigns.map((c) => [c.id, c.name]));

  return purchases.map((p) => ({
    id:           p.id,
    email:        p.email,
    productName:  p.productName ?? p.productId ?? 'Unknown product',
    amount:       fmt(p.amount),
    amountCents:  p.amount,
    currency:     p.currency,
    source:       p.source,
    attributedTo: p.attributions[0]?.campaignId
      ? `Campaign: ${campaignMap[p.attributions[0].campaignId!] ?? 'Unknown'}`
      : p.attributions[0]?.workflowId ? 'Automation' : 'Unattributed',
    createdAt:    p.createdAt.toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Export data (for CSV generation)
// ---------------------------------------------------------------------------

export async function getRevenueExportData() {
  const { workspaceId } = await requireWorkspaceAccess();

  const campaigns = await db.emailCampaign.findMany({
    where: { workspaceId, totalRevenue: { gt: 0 } },
    select: {
      id: true, name: true, subject: true,
      totalSent: true, totalOpened: true, totalClicked: true,
      totalRevenue: true, sentAt: true,
      attributions: { select: { purchaseId: true }, distinct: ['purchaseId'] },
    },
    orderBy: { totalRevenue: 'desc' },
  });

  return campaigns.map((c) => ({
    campaignId:    c.id,
    campaignName:  c.name,
    subject:       c.subject,
    emailsSent:    c.totalSent,
    opens:         c.totalOpened,
    clicks:        c.totalClicked,
    purchases:     c.attributions.length,
    revenue:       (c.totalRevenue / 100).toFixed(2),
    sentAt:        c.sentAt?.toISOString().split('T')[0] ?? '',
  }));
}
