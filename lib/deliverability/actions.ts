'use server';

/**
 * lib/deliverability/actions.ts
 *
 * Server actions for the deliverability dashboard.
 *
 * Changes in this version:
 *   - registerDomain() now calls Resend's domains.create() API and stores
 *     real DNS records returned by Resend, instead of generating homebrew DKIM.
 *   - verifyDomain() now polls resend.domains.get() for authoritative status
 *     instead of doing manual DNS TXT lookups.
 *   - saveSenderAddress() is a new action that saves prefix@domain as fromEmail
 *     after the domain has been verified.
 */

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { requireWorkspaceAccess } from '@/lib/auth/session';
import {
  registerWithResend,
  checkResendVerification,
  flattenDnsRecords,
  type FlatDnsRecord,
} from './domain-registration';
import { computeReputation } from './reputation-engine';
import { runGuardianCheck } from './inbox-guardian';
import { runSeedTest } from './seed-testing';
import { rewriteForDeliverability } from './ai-rewrite';
import { checkCredits, deductCredits } from '@/lib/ai/credits';
import { analyzeSpam } from './spam-analyzer';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RegisterDomainResult {
  success: boolean;
  error?:  string;
  data?: {
    id:         string;
    domain:     string;
    records:    FlatDnsRecord[];
    status:     string;
  };
}

// ---------------------------------------------------------------------------
// Domain management
// ---------------------------------------------------------------------------

/**
 * Register a domain with Resend and store DNS records in the DB.
 * Returns Resend's real DNS records for the user to add to their registrar.
 */
export async function registerDomain(domain: string): Promise<RegisterDomainResult> {
  const { workspaceId } = await requireWorkspaceAccess();

  const clean = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '');

  const existing = await db.sendingDomain.findFirst({
    where: { workspaceId, domain: clean },
  });

  // If already registered, return existing records so the UI can show them
  if (existing) {
    const storedRecords = existing.resendDnsRecords as FlatDnsRecord[] | null;
    if (storedRecords && storedRecords.length > 0) {
      return {
        success: true,
        data: {
          id:      existing.id,
          domain:  existing.domain,
          records: storedRecords,
          status:  existing.resendStatus ?? 'not_started',
        },
      };
    }
    // Has DB row but no records — fall through to re-register with Resend
    await db.sendingDomain.delete({ where: { id: existing.id } });
  }

  // Register with Resend — get real DNS records
  let resendResult;
  try {
    resendResult = await registerWithResend(clean);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to register domain with Resend.',
    };
  }

  const flatRecords = flattenDnsRecords(resendResult.records, clean);

  // Persist to DB
  const created = await db.sendingDomain.create({
    data: {
      workspaceId,
      domain:          clean,
      emailProvider:   'RESEND',
      resendDomainId:  resendResult.resendDomainId,
      resendStatus:    resendResult.status,
      resendDnsRecords: flatRecords as any,
      // Legacy fields — set to empty since Resend manages the actual DKIM
      dkimSelector:    'resend',
      dkimPublicKey:   null,
      dkimPrivateKey:  null,
    },
  });

  revalidatePath('/dashboard/deliverability');
  return {
    success: true,
    data: {
      id:      created.id,
      domain:  created.domain,
      records: flatRecords,
      status:  resendResult.status,
    },
  };
}

/**
 * Check domain verification status via Resend API.
 * Returns allVerified=true when Resend confirms the domain is verified.
 */
export async function verifyDomain(domainId: string) {
  const { workspaceId } = await requireWorkspaceAccess();

  const domain = await db.sendingDomain.findFirst({
    where: { id: domainId, workspaceId },
  });
  if (!domain) return { success: false, error: 'Domain not found' };

  // If no Resend domain ID, fall back to legacy DNS check
  if (!domain.resendDomainId) {
    const { checkDomain } = await import('./domain-verification');
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
    return {
      success: true,
      data: {
        ...result,
        allVerified: result.spfVerified && result.dkimVerified,
        resendStatus: null,
      },
    };
  }

  // Poll Resend for authoritative status
  const check = await checkResendVerification(domain.resendDomainId);

  // Map Resend status to our DB fields
  const isVerified = check.isVerified;
  await db.sendingDomain.update({
    where: { id: domainId },
    data: {
      resendStatus:       check.status,
      spfVerified:        isVerified,
      dkimVerified:       isVerified,
      dmarcVerified:      isVerified,
      returnPathVerified: false,   // Resend handles this internally
    },
  });

  revalidatePath('/dashboard/deliverability');
  return {
    success:  true,
    data: {
      spfVerified:        isVerified,
      dkimVerified:       isVerified,
      dmarcVerified:      isVerified,
      returnPathVerified: false,
      allVerified:        isVerified,
      resendStatus:       check.status,
    },
  };
}

/**
 * Save a sender address chosen by the user.
 * Validates the domain is verified in Resend before saving.
 * Saves `prefix@domain` as workspace.fromEmail.
 *
 * Called from onboarding step 4b (sender address picker).
 */
export async function saveSenderAddress(
  prefix: string,
  domainId: string
): Promise<{ success: boolean; error?: string; fromEmail?: string }> {
  const { workspaceId } = await requireWorkspaceAccess();

  // Validate prefix — letters, numbers, hyphens, underscores, dots only
  const cleanPrefix = prefix.trim().toLowerCase();
  if (!cleanPrefix || !/^[a-z0-9._-]+$/.test(cleanPrefix)) {
    return { success: false, error: 'Use only letters, numbers, dots, hyphens, or underscores.' };
  }
  if (cleanPrefix.length > 64) {
    return { success: false, error: 'Prefix is too long.' };
  }

  // Verify domain belongs to this workspace and is verified
  const domain = await db.sendingDomain.findFirst({
    where: { id: domainId, workspaceId },
    select: { domain: true, resendStatus: true, spfVerified: true, dkimVerified: true },
  });

  if (!domain) {
    return { success: false, error: 'Domain not found.' };
  }

  const isVerified =
    domain.resendStatus === 'verified' ||
    (domain.spfVerified && domain.dkimVerified);

  if (!isVerified) {
    return {
      success: false,
      error:   'Domain is not verified yet. Add the DNS records and wait for verification.',
    };
  }

  const fromEmail = `${cleanPrefix}@${domain.domain}`;

  await db.workspace.update({
    where: { id: workspaceId },
    data:  { fromEmail },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  return { success: true, fromEmail };
}

// ---------------------------------------------------------------------------
// Domain search log
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

export async function logAffiliateClickAction(searchLogId: string, registrar: string) {
  const { workspaceId } = await requireWorkspaceAccess();
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

export async function deleteDomain(domainId: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  await db.sendingDomain.deleteMany({ where: { id: domainId, workspaceId } });
  revalidatePath('/dashboard/deliverability');
}

// ---------------------------------------------------------------------------
// Guardian check, seed test, reputation, AI rewrite (unchanged)
// ---------------------------------------------------------------------------

export async function runDeliverabilityCheck(campaignId: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const report = await runGuardianCheck(workspaceId, campaignId);
  revalidatePath(`/dashboard/campaigns/${campaignId}`);
  return { success: true, data: report };
}

export async function runInboxTest(campaignId: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const results = await runSeedTest(campaignId, workspaceId);
  revalidatePath('/dashboard/deliverability');
  return { success: true, data: results };
}

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
  const issues = spam.issues.map((i: any) => i.detail);
  try {
    const result = await rewriteForDeliverability(campaign.subject, campaign.htmlBody, issues);
    await deductCredits(workspaceId, 'rewriteForDeliverability');
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Rewrite failed' };
  }
}
