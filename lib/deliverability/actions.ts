'use server';

/**
 * lib/deliverability/actions.ts
 *
 * Server actions for the deliverability dashboard.
 * All actions require workspace access.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import { checkDomain, generateDkimKeyPair } from './domain-verification';
import { computeReputation } from './reputation-engine';
import { runGuardianCheck } from './inbox-guardian';
import { runSeedTest } from './seed-testing';
import { rewriteForDeliverability } from './ai-rewrite';
import { checkCredits, deductCredits } from '@/lib/ai/credits';
import { analyzeSpam } from './spam-analyzer';

// ---------------------------------------------------------------------------
// Domain management
// ---------------------------------------------------------------------------

export async function registerDomain(domain: string) {
  const { workspaceId } = await requireWorkspaceAccess();

  const clean = domain.toLowerCase().trim().replace(/^https?:\/\//, '');

  const existing = await db.sendingDomain.findFirst({
    where: { workspaceId, domain: clean },
  });
  if (existing) return { success: false, error: 'Domain already registered' };

  const keys = generateDkimKeyPair(clean);

  const created = await db.sendingDomain.create({
    data: {
      workspaceId,
      domain: clean,
      dkimSelector: keys.selector,
      dkimPublicKey: keys.publicKey,
      dkimPrivateKey: keys.privateKey,
    },
  });

  revalidatePath('/dashboard/deliverability');
  return {
    success: true,
    data: {
      id: created.id,
      domain: created.domain,
      dkimSelector: keys.selector,
      dnsValue: keys.dnsValue,
    },
  };
}

/**
 * registerDomainWithProvider — same as registerDomain but stores the
 * workspace's current email provider so the DNS record generator can
 * show provider-specific SPF includes and Return-Path values.
 */
export async function registerDomainWithProvider(
  domain: string,
  provider: string | null
) {
  const { workspaceId } = await requireWorkspaceAccess();

  const clean = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '');

  const existing = await db.sendingDomain.findFirst({
    where: { workspaceId, domain: clean },
  });
  if (existing) return { success: false, error: 'Domain already registered' };

  const keys = generateDkimKeyPair(clean);

  const created = await db.sendingDomain.create({
    data: {
      workspaceId,
      domain: clean,
      dkimSelector: keys.selector,
      dkimPublicKey: keys.publicKey,
      dkimPrivateKey: keys.privateKey,
      emailProvider: provider ?? null,
    },
  });

  revalidatePath('/dashboard/deliverability');
  return {
    success: true,
    data: {
      id: created.id,
      domain: created.domain,
      dkimSelector: keys.selector,
      dkimPublicKey: keys.publicKey,
      dnsValue: keys.dnsValue,
    },
  };
}

// ---------------------------------------------------------------------------
// Domain search log — called from /api/domain/search
// ---------------------------------------------------------------------------

export async function logDomainSearch(
  domain: string,
  available: boolean,
  priceUsd: number | null
) {
  const { workspaceId } = await requireWorkspaceAccess();

  const log = await db.domainSearchLog.create({
    data: { workspaceId, domain, available, priceUsd: priceUsd ?? null },
  });

  return { success: true, data: { id: log.id } };
}

// ---------------------------------------------------------------------------
// Affiliate click log — called from /api/domain/affiliate-click
// ---------------------------------------------------------------------------

export async function logAffiliateClickAction(
  searchLogId: string,
  registrar: string
) {
  const { workspaceId } = await requireWorkspaceAccess();

  // Verify the log belongs to this workspace
  const log = await db.domainSearchLog.findFirst({
    where: { id: searchLogId, workspaceId },
  });
  if (!log) return { success: false };

  await db.domainSearchLog.update({
    where: { id: searchLogId },
    data: { registrarClicked: registrar, clickedAt: new Date() },
  });

  return { success: true };
}

export async function verifyDomain(domainId: string) {
  const { workspaceId } = await requireWorkspaceAccess();

  const domain = await db.sendingDomain.findFirst({
    where: { id: domainId, workspaceId },
  });
  if (!domain) return { success: false, error: 'Domain not found' };

  const result = await checkDomain(domain.domain, domain.dkimSelector);

  await db.sendingDomain.update({
    where: { id: domainId },
    data: {
      spfVerified:        result.spfVerified,
      dkimVerified:       result.dkimVerified,
      dmarcVerified:      result.dmarcVerified,
      returnPathVerified: result.returnPathVerified,
    },
  });

  revalidatePath('/dashboard/deliverability');
  return { success: true, data: result };
}

export async function deleteDomain(domainId: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  await db.sendingDomain.deleteMany({ where: { id: domainId, workspaceId } });
  revalidatePath('/dashboard/deliverability');
}

// ---------------------------------------------------------------------------
// Guardian check (pre-send)
// ---------------------------------------------------------------------------

export async function runDeliverabilityCheck(campaignId: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const report = await runGuardianCheck(workspaceId, campaignId);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { success: true, data: report };
}

// ---------------------------------------------------------------------------
// Seed test
// ---------------------------------------------------------------------------

export async function runInboxTest(campaignId: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const results = await runSeedTest(campaignId, workspaceId);
  revalidatePath('/dashboard/deliverability');
  return { success: true, data: results };
}

// ---------------------------------------------------------------------------
// Reputation refresh
// ---------------------------------------------------------------------------

export async function refreshReputation() {
  const { workspaceId } = await requireWorkspaceAccess();

  const domain = await db.sendingDomain.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });

  const result = await computeReputation(
    workspaceId,
    domain?.id ?? null,
    domain?.spfVerified ?? false,
    domain?.dkimVerified ?? false
  );

  if (domain) {
    await db.sendingDomain.update({
      where: { id: domain.id },
      data: { reputationScore: result.score, reputationUpdatedAt: new Date() },
    });
  }

  revalidatePath('/dashboard/deliverability');
  return { success: true, data: result };
}

// ---------------------------------------------------------------------------
// AI rewrite
// ---------------------------------------------------------------------------

export async function aiRewriteCampaign(campaignId: string) {
  const { workspaceId } = await requireWorkspaceAccess();

  const _creditCheck = await checkCredits(workspaceId, 'rewriteForDeliverability');
  if (!_creditCheck.allowed) {
    return { success: false, error: `Not enough AI credits. Need 10, have ${_creditCheck.currentBalance}.` };
  }

  const campaign = await db.emailCampaign.findFirst({
    where: { id: campaignId, workspaceId },
    select: { subject: true, htmlBody: true },
  });
  if (!campaign) return { success: false, error: 'Campaign not found' };

  const spam = analyzeSpam(campaign.subject, campaign.htmlBody);
  const issues = spam.issues.map((i) => i.detail);

  try {
    const result = await rewriteForDeliverability(campaign.subject, campaign.htmlBody, issues);
    await deductCredits(workspaceId, 'rewriteForDeliverability');
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Rewrite failed' };
  }
}
