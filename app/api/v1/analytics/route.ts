/**
 * GET /api/v1/analytics
 *
 * Returns an aggregate analytics summary for the authenticated workspace.
 *
 * Query params:
 *   campaignId — filter to a single campaign (optional)
 *
 * Response:
 *   {
 *     totalSent, totalDelivered, totalOpened, totalClicked,
 *     totalBounced, totalComplaints,
 *     openRate, clickRate, bounceRate,
 *     campaigns: { id, name, sentAt, ...per-campaign rates }[]
 *   }
 */

import { NextRequest } from 'next/server';
import { db } from '@/lib/db/client';
import { resolveApiKey, unauthorizedResponse } from '@/lib/api/auth';
import { v1Limiter, rateLimitedResponse } from '@/lib/api/rate-limit';
import { logApiRequest } from '@/lib/api/logger';

export async function GET(req: NextRequest) {
  const start = Date.now();

  const apiKey = await resolveApiKey(req);
  if (!apiKey) return unauthorizedResponse();

  const rl = v1Limiter.check(apiKey.id);
  if (!rl.success) return rateLimitedResponse(rl.resetAt);

  const campaignId = req.nextUrl.searchParams.get('campaignId') ?? undefined;

  const campaigns = await db.emailCampaign.findMany({
    where: {
      workspaceId: apiKey.workspaceId,
      status: 'COMPLETED',
      ...(campaignId ? { id: campaignId } : {}),
    },
    orderBy: { sentAt: 'desc' },
    take: campaignId ? 1 : 50,
    select: {
      id: true,
      name: true,
      status: true,
      totalSent: true,
      totalDelivered: true,
      totalOpened: true,
      totalClicked: true,
      totalBounced: true,
      totalComplaints: true,
      sentAt: true,
    },
  });

  // Aggregate totals across all returned campaigns
  const totals = campaigns.reduce(
    (acc, c) => ({
      totalSent: acc.totalSent + c.totalSent,
      totalDelivered: acc.totalDelivered + c.totalDelivered,
      totalOpened: acc.totalOpened + c.totalOpened,
      totalClicked: acc.totalClicked + c.totalClicked,
      totalBounced: acc.totalBounced + c.totalBounced,
      totalComplaints: acc.totalComplaints + c.totalComplaints,
    }),
    { totalSent: 0, totalDelivered: 0, totalOpened: 0, totalClicked: 0, totalBounced: 0, totalComplaints: 0 }
  );

  const pct = (n: number, d: number) => (d > 0 ? parseFloat(((n / d) * 100).toFixed(2)) : 0);

  const summary = {
    ...totals,
    openRate: pct(totals.totalOpened, totals.totalSent),
    clickRate: pct(totals.totalClicked, totals.totalSent),
    bounceRate: pct(totals.totalBounced, totals.totalSent),
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      sentAt: c.sentAt,
      totalSent: c.totalSent,
      openRate: pct(c.totalOpened, c.totalSent),
      clickRate: pct(c.totalClicked, c.totalSent),
      bounceRate: pct(c.totalBounced, c.totalSent),
    })),
  };

  logApiRequest({
    apiKeyId: apiKey.id,
    method: 'GET',
    path: '/api/v1/analytics',
    statusCode: 200,
    durationMs: Date.now() - start,
  });

  return Response.json({ data: summary });
}
