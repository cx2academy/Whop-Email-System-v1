/**
 * GET /api/v1/campaigns
 *
 * Returns all campaigns for the authenticated workspace.
 * Excludes HTML body to keep responses lightweight.
 *
 * Query params:
 *   status  — filter by CampaignStatus (optional)
 *   limit   — max results, default 20, max 100
 *   offset  — pagination offset, default 0
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

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') ?? undefined;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const [campaigns, total] = await Promise.all([
    db.emailCampaign.findMany({
      where: {
        workspaceId: apiKey.workspaceId,
        ...(status ? { status: status as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        name: true,
        status: true,
        subject: true,
        totalSent: true,
        totalOpened: true,
        totalClicked: true,
        totalBounced: true,
        sentAt: true,
        createdAt: true,
      },
    }),
    db.emailCampaign.count({
      where: {
        workspaceId: apiKey.workspaceId,
        ...(status ? { status: status as never } : {}),
      },
    }),
  ]);

  logApiRequest({ apiKeyId: apiKey.id, method: 'GET', path: '/api/v1/campaigns', statusCode: 200, durationMs: Date.now() - start });

  return Response.json({
    data: campaigns,
    meta: { total, limit, offset },
  });
}
