/**
 * lib/deliverability/seed-testing.ts
 *
 * Simulated inbox placement testing.
 *
 * Real inbox testing requires commercial seed lists (Litmus, GlockApps, etc.)
 * and is outside the scope of a self-hosted system. This module provides
 * rule-based placement prediction based on spam analysis + auth status.
 *
 * Results are stored as InboxTestResult rows and shown in the dashboard.
 * When real seed list integration is added, replace simulatePlacement()
 * with actual delivery + placement check via provider API.
 */

import { db } from '@/lib/db/client';
import { analyzeSpam } from './spam-analyzer';

const SEED_PROVIDERS = ['gmail', 'outlook', 'yahoo'] as const;
type SeedProvider = typeof SEED_PROVIDERS[number];

export interface SeedTestResult {
  provider: SeedProvider;
  placement: 'inbox' | 'spam' | 'promotions';
}

/**
 * Predicts inbox placement based on spam score + auth status.
 * Rule-based simulation — not a real send.
 */
function simulatePlacement(
  provider: SeedProvider,
  spamScore: number,
  spfVerified: boolean,
  dkimVerified: boolean
): 'inbox' | 'spam' | 'promotions' {
  const authPenalty = (!spfVerified ? 2 : 0) + (!dkimVerified ? 1.5 : 0);
  const effectiveScore = spamScore + authPenalty;

  // Gmail is strict about promotions tab
  if (provider === 'gmail') {
    if (effectiveScore >= 6) return 'spam';
    if (effectiveScore >= 2) return 'promotions';
    return 'inbox';
  }
  // Outlook is moderate
  if (provider === 'outlook') {
    if (effectiveScore >= 7) return 'spam';
    if (effectiveScore >= 4) return 'promotions';
    return 'inbox';
  }
  // Yahoo is more lenient
  if (provider === 'yahoo') {
    if (effectiveScore >= 8) return 'spam';
    return 'inbox';
  }
  return 'inbox';
}

export async function runSeedTest(
  campaignId: string,
  workspaceId: string
): Promise<SeedTestResult[]> {
  const [campaign, domain] = await Promise.all([
    db.emailCampaign.findUnique({
      where: { id: campaignId },
      select: { subject: true, htmlBody: true },
    }),
    db.sendingDomain.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  if (!campaign) throw new Error('Campaign not found');

  const spam = analyzeSpam(campaign.subject, campaign.htmlBody);
  const spfVerified  = domain?.spfVerified  ?? false;
  const dkimVerified = domain?.dkimVerified ?? false;

  const results: SeedTestResult[] = SEED_PROVIDERS.map((provider) => ({
    provider,
    placement: simulatePlacement(provider, spam.score, spfVerified, dkimVerified),
  }));

  // Persist results — delete old results for this campaign first
  await db.inboxTestResult.deleteMany({ where: { campaignId } });
  await db.inboxTestResult.createMany({
    data: results.map((r) => ({
      campaignId,
      provider: r.provider,
      placement: r.placement,
    })),
  });

  return results;
}
