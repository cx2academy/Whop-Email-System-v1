/**
 * lib/deliverability/inbox-guardian.ts
 *
 * Pre-send deliverability check that produces a score + warnings.
 * Result is stored as a DeliverabilityReport and shown to the user
 * before they confirm sending.
 *
 * Score inputs:
 *   - Domain authentication (+30 for SPF, +20 for DKIM)
 *   - Spam content score  (up to -40)
 *   - Sender reputation   (0–30 contribution)
 *   - Domain age          (up to -15 for new domains)
 *
 * Users must acknowledge warnings to send.
 */

import { db } from '@/lib/db/client';
import { analyzeSpam } from './spam-analyzer';
import { computeReputation } from './reputation-engine';

export interface GuardianReport {
  score: number;       // 0–100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  warnings: string[];
  recommendations: string[];
  details: {
    spamScore: number;
    authStatus: { spf: boolean; dkim: boolean };
    reputationScore: number;
    domainAgeDays: number | null;
  };
}

function scoreToGrade(score: number): GuardianReport['grade'] {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

export async function runGuardianCheck(
  workspaceId: string,
  campaignId: string
): Promise<GuardianReport> {
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

  const warnings: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  // --- Authentication ---
  const spfVerified  = domain?.spfVerified  ?? false;
  const dkimVerified = domain?.dkimVerified ?? false;

  if (!spfVerified) {
    score -= 20;
    warnings.push('SPF record not verified');
    recommendations.push('Add an SPF TXT record to your DNS (e.g. "v=spf1 include:resend.com ~all")');
  }
  if (!dkimVerified) {
    score -= 15;
    warnings.push('DKIM not verified');
    recommendations.push('Add the DKIM TXT record to your DNS under the provided selector');
  }

  // --- Spam score ---
  const spam = analyzeSpam(campaign.subject, campaign.htmlBody);
  const spamPenalty = Math.min(spam.score * 4, 40);
  score -= spamPenalty;

  if (spam.score >= 5) {
    warnings.push(`High spam score: ${spam.score}/10`);
    recommendations.push('Review and rewrite flagged content to reduce spam signals');
  } else if (spam.score >= 3) {
    warnings.push(`Moderate spam score: ${spam.score}/10`);
    recommendations.push('Consider reducing spam trigger phrases');
  }
  for (const issue of spam.issues.filter((i) => i.severity === 'high')) {
    warnings.push(issue.detail);
  }

  // --- Domain age ---
  const domainAgeDays = domain
    ? Math.floor((Date.now() - domain.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (domainAgeDays !== null && domainAgeDays < 7) {
    score -= 15;
    warnings.push(`Domain is only ${domainAgeDays} day(s) old — ISPs may be suspicious`);
    recommendations.push('Send smaller batches while warming up the domain');
  } else if (domainAgeDays !== null && domainAgeDays < 14) {
    score -= 5;
    warnings.push(`Domain warmup in progress (day ${domainAgeDays}/14)`);
  }

  // --- Reputation ---
  const reputation = await computeReputation(workspaceId, domain?.id ?? null, spfVerified, dkimVerified);
  const repContribution = Math.round((reputation.score / 100) * 20);
  score = score - 20 + repContribution; // replace placeholder 20 with actual reputation contribution

  if (reputation.breakdown.bounceRate > 0.05) {
    warnings.push(`Bounce rate is ${(reputation.breakdown.bounceRate * 100).toFixed(1)}% (limit: 5%)`);
    recommendations.push('Clean your contact list to remove invalid addresses');
  }
  if (reputation.breakdown.complaintRate > 0.001) {
    warnings.push(`Complaint rate is ${(reputation.breakdown.complaintRate * 100).toFixed(2)}% (limit: 0.1%)`);
    recommendations.push('Review your unsubscribe flow and content relevance');
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  // --- Persist report ---
  await db.deliverabilityReport.upsert({
    where: { campaignId },
    create: {
      campaignId,
      domainId: domain?.id ?? null,
      score: finalScore,
      warnings: JSON.stringify(warnings),
      details: JSON.stringify({
        spamScore: spam.score,
        authStatus: { spf: spfVerified, dkim: dkimVerified },
        reputationScore: reputation.score,
        domainAgeDays,
      }),
    },
    update: {
      score: finalScore,
      warnings: JSON.stringify(warnings),
      details: JSON.stringify({
        spamScore: spam.score,
        authStatus: { spf: spfVerified, dkim: dkimVerified },
        reputationScore: reputation.score,
        domainAgeDays,
      }),
    },
  });

  return {
    score: finalScore,
    grade: scoreToGrade(finalScore),
    warnings,
    recommendations,
    details: {
      spamScore: spam.score,
      authStatus: { spf: spfVerified, dkim: dkimVerified },
      reputationScore: reputation.score,
      domainAgeDays,
    },
  };
}
