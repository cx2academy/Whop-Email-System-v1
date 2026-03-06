/**
 * lib/deliverability/reputation-engine.ts
 *
 * Computes sender reputation score (0–100) for a domain.
 *
 * Inputs drawn from existing DB data — no new tables required.
 *
 * Formula:
 *   score = 100
 *         - (bounceRate  * 200)   // hard penalty — ISPs care most about bounces
 *         - (complaintRate * 500) // ISPs will block you fast for complaints
 *         - (avgSpamScore * 5)    // content quality
 *         + authBonus             // +10 for SPF verified, +10 for DKIM verified
 *
 * Categories:
 *   90–100  Excellent
 *   70–89   Good
 *   50–69   Risky
 *   <50     Dangerous
 */

import { db } from '@/lib/db/client';

export interface ReputationResult {
  score: number;
  category: 'excellent' | 'good' | 'risky' | 'dangerous';
  breakdown: {
    bounceRate: number;
    complaintRate: number;
    avgSpamScore: number;
    authBonus: number;
  };
}

export function scoreToCategory(score: number): ReputationResult['category'] {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'risky';
  return 'dangerous';
}

export async function computeReputation(
  workspaceId: string,
  domainId: string | null,
  spfVerified: boolean,
  dkimVerified: boolean
): Promise<ReputationResult> {
  // Pull aggregate send stats from EmailSend (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalSends, bouncedSends, complainedSends, reports] = await Promise.all([
    db.emailSend.count({ where: { workspaceId, sentAt: { gte: thirtyDaysAgo } } }),
    db.emailSend.count({ where: { workspaceId, status: 'BOUNCED', sentAt: { gte: thirtyDaysAgo } } }),
    db.emailSend.count({ where: { workspaceId, status: 'COMPLAINED', sentAt: { gte: thirtyDaysAgo } } }),
    // Average spam score from deliverability reports
    db.deliverabilityReport.findMany({
      where: { campaign: { workspaceId } },
      select: { details: true },
      take: 20,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const bounceRate    = totalSends > 0 ? bouncedSends / totalSends : 0;
  const complaintRate = totalSends > 0 ? complainedSends / totalSends : 0;

  // Extract spam scores from report details JSON
  const spamScores = reports
    .map((r) => {
      try { return (JSON.parse(r.details) as { spamScore?: number }).spamScore ?? 0; }
      catch { return 0; }
    })
    .filter((s) => s > 0);
  const avgSpamScore = spamScores.length > 0
    ? spamScores.reduce((a, b) => a + b, 0) / spamScores.length
    : 0;

  const authBonus = (spfVerified ? 10 : 0) + (dkimVerified ? 10 : 0);

  const raw = 100
    - (bounceRate * 200)
    - (complaintRate * 500)
    - (avgSpamScore * 5)
    + authBonus;

  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return {
    score,
    category: scoreToCategory(score),
    breakdown: { bounceRate, complaintRate, avgSpamScore, authBonus },
  };
}
