/**
 * lib/plans/config.ts
 *
 * Single source of truth for all plan definitions.
 *
 * Rules:
 *   - NEVER read from this file on the client. Import types only.
 *   - All limit checks go through lib/plans/gates.ts — never inline here.
 *   - null means "unlimited" throughout.
 *   - Add new features by adding to PlanFeatureKey and each plan's features map.
 *
 * Stripe integration (future):
 *   Map STRIPE_PRICE_ID env vars to plan keys. The plan field on Workspace
 *   is the source of truth — set it in the Stripe webhook handler.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Mirrors the Prisma WorkspacePlan enum — keep in sync. */
export type PlanKey = 'FREE' | 'STARTER' | 'GROWTH' | 'SCALE';

/**
 * Every boolean-gated feature in the app.
 * Add here when building a new feature that should be plan-gated.
 */
export type PlanFeatureKey =
  | 'automations'
  | 'segments'
  | 'abTesting'
  | 'aiFeatures'
  | 'customDomain'
  | 'revenueAttribution'
  | 'apiAccess'
  | 'advancedAnalytics'
  | 'deliverabilityRewrite'
  | 'multipleEmailProviders'
  | 'prioritySupport';

/** Numeric limits — null = unlimited. */
export interface PlanLimits {
  emailsPerMonth:   number | null;
  contacts:         number | null;
  aiCreditsMonthly: number | null;  // auto-granted on billing cycle reset (future)
  automations:      number | null;  // max active workflows
  campaigns:        number | null;  // max campaigns per month
  analyticsRetentionDays: number;
}

export interface PlanDefinition {
  key:         PlanKey;
  name:        string;
  tagline:     string;
  monthlyUsd:  number;          // 0 = free
  limits:      PlanLimits;
  features:    Record<PlanFeatureKey, boolean>;
  /** Stripe price IDs — set via env vars, not hardcoded */
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?:  string;
  /** Highlight on pricing page */
  popular?: boolean;
}

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

export const PLANS: Record<PlanKey, PlanDefinition> = {
  FREE: {
    key:       'FREE',
    name:      'Free',
    tagline:   'For creators just getting started',
    monthlyUsd: 0,
    limits: {
      emailsPerMonth:         500,
      contacts:               250,
      aiCreditsMonthly:       10,
      automations:            0,     // no automations on free
      campaigns:              3,
      analyticsRetentionDays: 7,
    },
    features: {
      automations:             false,
      segments:                false,
      abTesting:               false,
      aiFeatures:              true,  // gated by credit balance, not plan
      customDomain:            false,
      revenueAttribution:      false,
      apiAccess:               false,
      advancedAnalytics:       false,
      deliverabilityRewrite:   false,
      multipleEmailProviders:  false,
      prioritySupport:         false,
    },
  },

  STARTER: {
    key:       'STARTER',
    name:      'Starter',
    tagline:   'For growing communities',
    monthlyUsd: 29,
    limits: {
      emailsPerMonth:         5_000,
      contacts:               2_500,
      aiCreditsMonthly:       50,
      automations:            3,
      campaigns:              null,   // unlimited
      analyticsRetentionDays: 30,
    },
    features: {
      automations:             true,
      segments:                true,
      abTesting:               false,
      aiFeatures:              true,
      customDomain:            true,
      revenueAttribution:      false,
      apiAccess:               false,
      advancedAnalytics:       false,
      deliverabilityRewrite:   false,
      multipleEmailProviders:  false,
      prioritySupport:         false,
    },
  },

  GROWTH: {
    key:       'GROWTH',
    name:      'Growth',
    tagline:   'For serious email marketers',
    monthlyUsd: 79,
    popular:   true,
    limits: {
      emailsPerMonth:         25_000,
      contacts:               10_000,
      aiCreditsMonthly:       150,
      automations:            null,   // unlimited
      campaigns:              null,
      analyticsRetentionDays: 365,
    },
    features: {
      automations:             true,
      segments:                true,
      abTesting:               true,
      aiFeatures:              true,
      customDomain:            true,
      revenueAttribution:      true,
      apiAccess:               true,
      advancedAnalytics:       true,
      deliverabilityRewrite:   true,
      multipleEmailProviders:  false,
      prioritySupport:         false,
    },
  },

  SCALE: {
    key:       'SCALE',
    name:      'Scale',
    tagline:   'For high-volume senders',
    monthlyUsd: 199,
    limits: {
      emailsPerMonth:         null,   // unlimited
      contacts:               null,
      aiCreditsMonthly:       500,
      automations:            null,
      campaigns:              null,
      analyticsRetentionDays: 999999, // effectively unlimited
    },
    features: {
      automations:             true,
      segments:                true,
      abTesting:               true,
      aiFeatures:              true,
      customDomain:            true,
      revenueAttribution:      true,
      apiAccess:               true,
      advancedAnalytics:       true,
      deliverabilityRewrite:   true,
      multipleEmailProviders:  true,
      prioritySupport:         true,
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getPlan(key: PlanKey): PlanDefinition {
  return PLANS[key];
}

/** Ordered list for upgrade suggestions — from cheapest to most expensive. */
export const PLAN_ORDER: PlanKey[] = ['FREE', 'STARTER', 'GROWTH', 'SCALE'];

/**
 * Returns the next plan up from the current one.
 * Returns null if already on the highest plan.
 */
export function nextPlan(current: PlanKey): PlanDefinition | null {
  const idx = PLAN_ORDER.indexOf(current);
  const nextKey = PLAN_ORDER[idx + 1];
  return nextKey ? PLANS[nextKey] : null;
}

/**
 * Returns the cheapest plan that has the given feature enabled.
 */
export function cheapestPlanWith(feature: PlanFeatureKey): PlanDefinition | null {
  for (const key of PLAN_ORDER) {
    if (PLANS[key].features[feature]) return PLANS[key];
  }
  return null;
}

/**
 * Returns the cheapest plan that supports at least `amount` of a limit.
 */
export function cheapestPlanFor(
  limitKey: keyof PlanLimits,
  amount: number
): PlanDefinition | null {
  for (const key of PLAN_ORDER) {
    const limit = PLANS[key].limits[limitKey];
    if (limit === null || limit >= amount) return PLANS[key];
  }
  return null;
}

/** Human-readable label for feature keys */
export const FEATURE_LABELS: Record<PlanFeatureKey, string> = {
  automations:            'Email Automations',
  segments:               'Contact Segments',
  abTesting:              'A/B Testing',
  aiFeatures:             'AI Features',
  customDomain:           'Custom Sending Domain',
  revenueAttribution:     'Revenue Attribution',
  apiAccess:              'API Access',
  advancedAnalytics:      'Advanced Analytics',
  deliverabilityRewrite:  'AI Deliverability Rewrite',
  multipleEmailProviders: 'Multiple Email Providers',
  prioritySupport:        'Priority Support',
};

/** Format a limit value for display */
export function formatLimit(value: number | null, suffix = ''): string {
  if (value === null) return 'Unlimited';
  return value.toLocaleString() + (suffix ? ` ${suffix}` : '');
}
