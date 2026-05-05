/**
 * app/api/domain/search/route.ts
 *
 * GET /api/domain/search?q=acme.com
 *
 * Returns:
 *   - Domain availability (via RDAP)
 *   - Price (from static TLD table)
 *   - Suggested alternatives if unavailable
 *   - Registrar affiliate links (ready for click tracking)
 *   - A search log ID to record affiliate clicks against
 *
 * Auth: requires session + workspace
 * Rate limit: 20 searches per minute per workspace
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rate-limit';
import { searchDomain, suggestAlternatives, formatPrice } from '@/lib/domains/search';
import { buildRegistrarLinks } from '@/lib/domains/affiliates';
import { db } from '@/lib/db/client';

const searchLimiter = rateLimit({ limit: 20, windowMs: 60_000 });

export async function GET(req: NextRequest) {
  // --- Auth ---
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- Rate limit ---
  const rl = searchLimiter.check(`domain:search:${workspaceId}`);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many searches. Wait a moment and try again.' },
      { status: 429 }
    );
  }

  // --- Input ---
  const query = req.nextUrl.searchParams.get('q')?.trim();
  if (!query || query.length < 3) {
    return NextResponse.json(
      { error: 'Query must be at least 3 characters.' },
      { status: 400 }
    );
  }

  // --- Domain check ---
  const result = await searchDomain(query);

  // --- Suggestions (only fetch if primary is taken and no check error) ---
  const suggestions = (!result.available && !result.error)
    ? await suggestAlternatives(result.domain, result)
    : [];

  // --- Log search for affiliate tracking ---
  let searchLogId: string | null = null;
  try {
    const log = await db.domainSearchLog.create({
      data: {
        workspaceId,
        domain: result.domain,
        available: result.available,
        priceUsd: result.priceUsd,
      },
    });
    searchLogId = log.id;
  } catch {
    // Non-fatal — search still works without logging
  }

  // --- Build affiliate links ---
  const registrarLinks = result.available
    ? buildRegistrarLinks(result.domain)
    : [];

  return NextResponse.json({
    result: {
      ...result,
      priceFormatted: formatPrice(result.priceUsd),
    },
    suggestions: suggestions.map((s) => ({
      ...s,
      priceFormatted: formatPrice(s.priceUsd),
    })),
    registrarLinks,
    searchLogId,
  });
}
