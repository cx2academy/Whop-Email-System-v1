/**
 * lib/ai/credits.ts
 *
 * AI Credit System — the single source of truth for all credit operations.
 *
 * Concurrency safety:
 *   Deductions use a Prisma $transaction with a raw UPDATE ... WHERE aiCredits >= cost.
 *   If two requests race, only one succeeds — the other gets 0 rows updated and
 *   returns insufficient_credits. No double-spend is possible.
 *
 * Credit costs per feature:
 *   getStrategyAdvice       →  0  (free — auto-runs on page load)
 *   optimizeSubjectLine     →  2
 *   improveEmailCopy        →  2
 *   predictEngagement       →  2
 *   buildCampaignSequence   →  5
 *   generateEmailDraft      →  5
 *   generateTemplate        →  5
 *   rewriteForDeliverability → 10 (Anthropic — most expensive)
 *
 * Adding a new AI feature:
 *   1. Add it to CREDIT_COSTS below
 *   2. Wrap the function with withCredits() or call checkAndDeduct() directly
 */

import { db } from '@/lib/db/client';

// ---------------------------------------------------------------------------
// Credit cost registry
// ---------------------------------------------------------------------------

export type AiFeatureKey =
  | 'optimizeSubjectLine'
  | 'improveEmailCopy'
  | 'predictEngagement'
  | 'buildCampaignSequence'
  | 'generateEmailDraft'
  | 'generateTemplate'
  | 'rewriteForDeliverability'
  | 'getStrategyAdvice';

export const CREDIT_COSTS: Record<AiFeatureKey, number> = {
  getStrategyAdvice:        0,   // free — passive, auto-runs
  optimizeSubjectLine:      2,
  improveEmailCopy:         2,
  predictEngagement:        2,
  buildCampaignSequence:    5,
  generateEmailDraft:       5,
  generateTemplate:         5,
  rewriteForDeliverability: 10,
};

// Low-credit warning threshold
export const LOW_CREDIT_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreditCheckResult {
  allowed: boolean;
  currentBalance: number;
  cost: number;
  reason?: 'insufficient_credits' | 'workspace_not_found';
}

export interface CreditDeductResult {
  success: boolean;
  newBalance: number;
  reason?: 'insufficient_credits' | 'workspace_not_found' | 'concurrent_conflict';
}

// ---------------------------------------------------------------------------
// checkCredits — read-only balance check (does NOT deduct)
// Call this before showing UI to decide whether to enable buttons.
// ---------------------------------------------------------------------------

export async function checkCredits(
  workspaceId: string,
  feature: AiFeatureKey
): Promise<CreditCheckResult> {
  const cost = CREDIT_COSTS[feature];

  // Free features always pass
  if (cost === 0) {
    return { allowed: true, currentBalance: Infinity, cost: 0 };
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { aiCredits: true },
  });

  if (!workspace) {
    return { allowed: false, currentBalance: 0, cost, reason: 'workspace_not_found' };
  }

  return {
    allowed: workspace.aiCredits >= cost,
    currentBalance: workspace.aiCredits,
    cost,
    reason: workspace.aiCredits < cost ? 'insufficient_credits' : undefined,
  };
}

// ---------------------------------------------------------------------------
// deductCredits — atomic deduction with concurrency safety
//
// Uses a raw UPDATE with WHERE aiCredits >= cost so two simultaneous requests
// cannot both succeed when only one credit remains. Returns the new balance.
// ---------------------------------------------------------------------------

export async function deductCredits(
  workspaceId: string,
  feature: AiFeatureKey,
  refId?: string
): Promise<CreditDeductResult> {
  const cost = CREDIT_COSTS[feature];

  // Free — nothing to deduct
  if (cost === 0) {
    const w = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { aiCredits: true },
    });
    return { success: true, newBalance: w?.aiCredits ?? 0 };
  }

  // Atomic deduction: only updates the row if balance is sufficient
  const result = await db.$executeRaw`
    UPDATE "workspaces"
    SET "aiCredits" = "aiCredits" - ${cost}
    WHERE "id" = ${workspaceId}
      AND "aiCredits" >= ${cost}
  `;

  // result = number of rows updated (0 = insufficient or not found)
  if (result === 0) {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { aiCredits: true },
    });
    if (!workspace) return { success: false, newBalance: 0, reason: 'workspace_not_found' };
    return {
      success: false,
      newBalance: workspace.aiCredits,
      reason: workspace.aiCredits < cost ? 'insufficient_credits' : 'concurrent_conflict',
    };
  }

  // Fetch new balance and write ledger entry
  const updated = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { aiCredits: true },
  });

  const newBalance = updated?.aiCredits ?? 0;

  // Fire-and-forget ledger entry — non-fatal if it fails
  db.aiCreditLog.create({
    data: {
      workspaceId,
      delta: -cost,
      balanceAfter: newBalance,
      reason: feature,
      refId: refId ?? null,
    },
  }).catch((err) => {
    console.error('[credits] Failed to write ledger entry:', err);
  });

  return { success: true, newBalance };
}

// ---------------------------------------------------------------------------
// addCredits — grant or purchase credits
// ---------------------------------------------------------------------------

export async function addCredits(
  workspaceId: string,
  amount: number,
  reason: 'purchase' | 'grant' | string,
  refId?: string
): Promise<{ newBalance: number }> {
  const updated = await db.workspace.update({
    where: { id: workspaceId },
    data: { aiCredits: { increment: amount } },
    select: { aiCredits: true },
  });

  await db.aiCreditLog.create({
    data: {
      workspaceId,
      delta: amount,
      balanceAfter: updated.aiCredits,
      reason,
      refId: refId ?? null,
    },
  });

  return { newBalance: updated.aiCredits };
}

// ---------------------------------------------------------------------------
// getBalance — thin helper for UI
// ---------------------------------------------------------------------------

export async function getBalance(workspaceId: string): Promise<number> {
  const w = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { aiCredits: true },
  });
  return w?.aiCredits ?? 0;
}

// ---------------------------------------------------------------------------
// getCreditHistory — for a credit usage log UI (optional)
// ---------------------------------------------------------------------------

export async function getCreditHistory(workspaceId: string, take = 20) {
  return db.aiCreditLog.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    take,
  });
}

// ---------------------------------------------------------------------------
// Insufficient credits error — typed so callers can branch on it
// ---------------------------------------------------------------------------

export class InsufficientCreditsError extends Error {
  constructor(
    public readonly currentBalance: number,
    public readonly required: number,
    public readonly feature: AiFeatureKey
  ) {
    super(
      `Insufficient AI credits. Need ${required}, have ${currentBalance}. Feature: ${feature}`
    );
    this.name = 'InsufficientCreditsError';
  }
}

// ---------------------------------------------------------------------------
// formatFeatureName — human-readable label for UI
// ---------------------------------------------------------------------------

export function formatFeatureName(feature: AiFeatureKey): string {
  const labels: Record<AiFeatureKey, string> = {
    getStrategyAdvice:        'Strategy Advice',
    optimizeSubjectLine:      'Subject Line Optimizer',
    improveEmailCopy:         'Copy Improver',
    predictEngagement:        'Engagement Predictor',
    buildCampaignSequence:    'Campaign Sequence Builder',
    generateEmailDraft:       'Email Draft Generator',
    generateTemplate:         'Template Generator',
    rewriteForDeliverability: 'Deliverability Rewrite',
  };
  return labels[feature];
}
