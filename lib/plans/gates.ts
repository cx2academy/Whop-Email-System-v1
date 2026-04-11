/**
 * lib/plans/gates.ts
 *
 * Central permission and usage enforcement.
 *
 * Every feature gate and limit check in the app goes through these two
 * functions. This file is the ONLY place that reads plan config + DB usage
 * together and decides whether to allow an operation.
 *
 * Usage in server actions:
 *   const gate = await checkPlanLimit({ workspaceId, feature: 'automations' });
 *   if (!gate.allowed) return gate.toActionError();  // { success: false, upgradeRequired: true, ... }
 *
 * Usage in API routes:
 *   const gate = await checkUsageLimit({ workspaceId, type: 'emails', requested: 500 });
 *   if (!gate.allowed) return NextResponse.json(gate.toResponse(), { status: 402 });
 */

import { db } from '@/lib/db/client';
import {
  getPlan,
  nextPlan,
  cheapestPlanWith,
  cheapestPlanFor,
  FEATURE_LABELS,
  formatLimit,
  type PlanKey,
  type PlanFeatureKey,
  type PlanLimits,
} from './config';

// ---------------------------------------------------------------------------
// Structured upgrade error — returned by every gate check
// ---------------------------------------------------------------------------

export interface UpgradeRequiredPayload {
  upgradeRequired: true;
  message:         string;
  feature?:        string;         // human-readable feature name
  currentPlan:     string;
  suggestedPlan:   string;
  suggestedPlanPrice: number;      // monthly USD
  currentUsage?:   number;
  limit?:          number | null;
}

export class PlanLimitError {
  readonly allowed = false as const;
  readonly payload: UpgradeRequiredPayload;

  constructor(payload: UpgradeRequiredPayload) {
    this.payload = payload;
  }

  /** For server actions: return { success: false, upgradeRequired: true, ... } */
  toActionError() {
    return {
      success:         false as const,
      error:           'plan_limit_reached' as const,
      ...this.payload,
    };
  }

  /** For API routes: return a JSON-serialisable body */
  toResponse() {
    return {
      error:           'plan_limit_reached' as const,
      ...this.payload,
    };
  }
}

export interface GateAllowed {
  allowed:     true;
  currentUsage?: number;
  limit?:        number | null;
}

export type GateResult = GateAllowed | (PlanLimitError & { allowed: false });

// ---------------------------------------------------------------------------
// Workspace plan loader (with add-on bonuses applied)
// ---------------------------------------------------------------------------

interface WorkspacePlanContext {
  plan:            PlanKey;
  emailsThisMonth: number;
  contactCount:    number;
  aiCredits:       number;
  automationCount: number;
  // Add-on bonus volumes
  addonEmails:     number;
  addonContacts:   number;
  addonAiCredits:  number;
}

async function loadWorkspacePlanContext(workspaceId: string): Promise<WorkspacePlanContext> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [workspace, emailsThisMonth, contactCount, automationCount, addons] = await Promise.all([
    db.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true, aiCredits: true },
    }),
    db.emailSend.count({
      where: {
        workspaceId,
        sentAt: { gte: monthStart },
        status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] },
      },
    }),
    db.contact.count({
      where: { workspaceId, status: 'SUBSCRIBED' },
    }),
    db.automationWorkflow.count({
      where: { workspaceId, status: { in: ['ACTIVE', 'DRAFT', 'PAUSED'] } },
    }),
    db.workspaceAddon.findMany({
      where: { workspaceId, expiresAt: { gt: new Date() } },
      select: { type: true, quantity: true },
    }),
  ]);

  // Sum add-on bonuses by type
  let addonEmails = 0, addonContacts = 0, addonAiCredits = 0;
  for (const addon of addons) {
    if (addon.type === 'emails')    addonEmails    += addon.quantity;
    if (addon.type === 'contacts')  addonContacts  += addon.quantity;
    if (addon.type === 'ai_credits') addonAiCredits += addon.quantity;
  }

  return {
    plan:            (workspace?.plan ?? 'FREE') as PlanKey,
    emailsThisMonth,
    contactCount,
    aiCredits:       workspace?.aiCredits ?? 0,
    automationCount,
    addonEmails,
    addonContacts,
    addonAiCredits,
  };
}

// ---------------------------------------------------------------------------
// checkPlanLimit — boolean feature gate
// Checks whether the workspace's current plan includes a given feature.
// ---------------------------------------------------------------------------

interface CheckFeatureOptions {
  workspaceId: string;
  feature:     PlanFeatureKey;
}

export async function checkPlanLimit(
  opts: CheckFeatureOptions
): Promise<GateResult> {
  const ctx = await loadWorkspacePlanContext(opts.workspaceId);
  const plan = getPlan(ctx.plan);

  if (plan.features[opts.feature]) {
    return { allowed: true };
  }

  const suggested = cheapestPlanWith(opts.feature);
  const featureLabel = FEATURE_LABELS[opts.feature];

  return new PlanLimitError({
    upgradeRequired:    true,
    message:            `${featureLabel} is not available on the ${plan.name} plan. Upgrade to ${suggested?.name ?? 'a paid plan'} to unlock it.`,
    feature:            featureLabel,
    currentPlan:        plan.name,
    suggestedPlan:      suggested?.name ?? 'Growth',
    suggestedPlanPrice: suggested?.monthlyUsd ?? 79,
  });
}

// ---------------------------------------------------------------------------
// checkUsageLimit — numeric quota check
// Checks whether performing an action would exceed the plan's limits,
// including any active add-ons.
// ---------------------------------------------------------------------------

export type UsageLimitType =
  | 'emails'
  | 'contacts'
  | 'ai_credits'
  | 'automations'
  | 'campaigns';

interface CheckUsageOptions {
  workspaceId: string;
  type:        UsageLimitType;
  /** How many units the requested action would consume (default 1). */
  requested?:  number;
}

export async function checkUsageLimit(
  opts: CheckUsageOptions
): Promise<GateResult> {
  const requested = opts.requested ?? 1;
  const ctx = await loadWorkspacePlanContext(opts.workspaceId);
  const plan = getPlan(ctx.plan);

  switch (opts.type) {
    // -----------------------------------------------------------------------
    case 'emails': {
      const base = plan.limits.emailsPerMonth;
      if (base === null) return { allowed: true }; // unlimited
      const effectiveLimit = base + ctx.addonEmails;
      const projected = ctx.emailsThisMonth + requested;
      if (projected <= effectiveLimit) {
        return { allowed: true, currentUsage: ctx.emailsThisMonth, limit: effectiveLimit };
      }
      const suggested = cheapestPlanFor('emailsPerMonth', projected);
      return new PlanLimitError({
        upgradeRequired:    true,
        message:            `You've used ${ctx.emailsThisMonth.toLocaleString()} of ${effectiveLimit.toLocaleString()} emails this month. Upgrade to send more, or purchase an email add-on.`,
        feature:            'Monthly emails',
        currentPlan:        plan.name,
        suggestedPlan:      suggested?.name ?? 'Growth',
        suggestedPlanPrice: suggested?.monthlyUsd ?? 79,
        currentUsage:       ctx.emailsThisMonth,
        limit:              effectiveLimit,
      });
    }

    // -----------------------------------------------------------------------
    case 'contacts': {
      const base = plan.limits.contacts;
      if (base === null) return { allowed: true };
      const effectiveLimit = base + ctx.addonContacts;
      const projected = ctx.contactCount + requested;
      if (projected <= effectiveLimit) {
        return { allowed: true, currentUsage: ctx.contactCount, limit: effectiveLimit };
      }
      const suggested = cheapestPlanFor('contacts', projected);
      return new PlanLimitError({
        upgradeRequired:    true,
        message:            `You've reached your contact limit (${effectiveLimit.toLocaleString()}). Upgrade your plan or purchase a contact add-on to import more.`,
        feature:            'Contacts',
        currentPlan:        plan.name,
        suggestedPlan:      suggested?.name ?? 'Growth',
        suggestedPlanPrice: suggested?.monthlyUsd ?? 79,
        currentUsage:       ctx.contactCount,
        limit:              effectiveLimit,
      });
    }

    // -----------------------------------------------------------------------
    case 'ai_credits': {
      // AI credits are checked via lib/ai/credits.ts — defer to that system.
      // This gate checks only plan-level feature access.
      const hasAi = plan.features.aiFeatures;
      if (!hasAi) {
        const suggested = cheapestPlanWith('aiFeatures');
        return new PlanLimitError({
          upgradeRequired:    true,
          message:            `AI features are not available on the ${plan.name} plan.`,
          feature:            'AI Features',
          currentPlan:        plan.name,
          suggestedPlan:      suggested?.name ?? 'Starter',
          suggestedPlanPrice: suggested?.monthlyUsd ?? 29,
        });
      }
      return { allowed: true };
    }

    // -----------------------------------------------------------------------
    case 'automations': {
      const base = plan.limits.automations;
      if (base === null) return { allowed: true };
      if (base === 0) {
        // Plan doesn't include automations at all
        const suggested = cheapestPlanWith('automations');
        return new PlanLimitError({
          upgradeRequired:    true,
          message:            `Email automations are not included in the ${plan.name} plan. Upgrade to ${suggested?.name ?? 'Starter'} to create automated workflows.`,
          feature:            'Email Automations',
          currentPlan:        plan.name,
          suggestedPlan:      suggested?.name ?? 'Starter',
          suggestedPlanPrice: suggested?.monthlyUsd ?? 29,
          currentUsage:       ctx.automationCount,
          limit:              0,
        });
      }
      if (ctx.automationCount + requested <= base) {
        return { allowed: true, currentUsage: ctx.automationCount, limit: base };
      }
      const suggested = cheapestPlanFor('automations', ctx.automationCount + requested);
      return new PlanLimitError({
        upgradeRequired:    true,
        message:            `You've reached your automation limit (${base}). Upgrade to create more workflows.`,
        feature:            'Email Automations',
        currentPlan:        plan.name,
        suggestedPlan:      suggested?.name ?? 'Growth',
        suggestedPlanPrice: suggested?.monthlyUsd ?? 79,
        currentUsage:       ctx.automationCount,
        limit:              base,
      });
    }

    // -----------------------------------------------------------------------
    case 'campaigns': {
      const base = plan.limits.campaigns;
      if (base === null) return { allowed: true };
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const campaignsThisMonth = await db.emailCampaign.count({
        where: { workspaceId: opts.workspaceId, createdAt: { gte: monthStart } },
      });
      if (campaignsThisMonth + requested <= base) {
        return { allowed: true, currentUsage: campaignsThisMonth, limit: base };
      }
      const next = nextPlan(ctx.plan);
      return new PlanLimitError({
        upgradeRequired:    true,
        message:            `You've created ${campaignsThisMonth} of ${base} campaigns this month. Upgrade to create unlimited campaigns.`,
        feature:            'Campaigns',
        currentPlan:        plan.name,
        suggestedPlan:      next?.name ?? 'Starter',
        suggestedPlanPrice: next?.monthlyUsd ?? 29,
        currentUsage:       campaignsThisMonth,
        limit:              base,
      });
    }

    default:
      return { allowed: true };
  }
}

// ---------------------------------------------------------------------------
// getWorkspaceUsage — for UI usage bars
// Returns current usage + limits for display.
// ---------------------------------------------------------------------------

export interface WorkspaceUsage {
  plan:       PlanKey;
  planName:   string;
  emails: {
    used:  number;
    limit: number | null;
    pct:   number;
  };
  contacts: {
    used:  number;
    limit: number | null;
    pct:   number;
  };
  aiCredits: {
    used:  number;   // credits already spent (limit - current balance)
    limit: number | null;
    pct:   number;
    balance: number; // current spendable balance
  };
  automations: {
    used:  number;
    limit: number | null;
    pct:   number;
  };
}

function pct(used: number, limit: number | null): number {
  if (limit === null || limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export async function getWorkspaceUsage(workspaceId: string): Promise<WorkspaceUsage> {
  const ctx = await loadWorkspacePlanContext(workspaceId);
  const plan = getPlan(ctx.plan);
  const pl = plan.limits;

  const emailLimit    = pl.emailsPerMonth   === null ? null : pl.emailsPerMonth   + ctx.addonEmails;
  const contactLimit  = pl.contacts         === null ? null : pl.contacts         + ctx.addonContacts;
  const autoLimit     = pl.automations;

  // AI credits: the plan grants a monthly allowance. The DB aiCredits is the
  // current spendable balance. We don't know the base grant without looking at
  // the credit log, so we approximate used = (monthly allowance - balance).
  const aiMonthly = pl.aiCreditsMonthly === null ? null : pl.aiCreditsMonthly + ctx.addonAiCredits;
  const aiUsed = aiMonthly !== null
    ? Math.max(0, aiMonthly - ctx.aiCredits)
    : 0;

  return {
    plan:     ctx.plan,
    planName: plan.name,
    emails: {
      used:  ctx.emailsThisMonth,
      limit: emailLimit,
      pct:   pct(ctx.emailsThisMonth, emailLimit),
    },
    contacts: {
      used:  ctx.contactCount,
      limit: contactLimit,
      pct:   pct(ctx.contactCount, contactLimit),
    },
    aiCredits: {
      used:    aiUsed,
      limit:   aiMonthly,
      pct:     pct(aiUsed, aiMonthly),
      balance: ctx.aiCredits,
    },
    automations: {
      used:  ctx.automationCount,
      limit: autoLimit,
      pct:   pct(ctx.automationCount, autoLimit),
    },
  };
}
