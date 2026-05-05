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
  aiCreditsMonthly: number | null;
  automations:      number | null;
  campaigns:        number | null;
  analyticsRetentionDays: number;
}

export interface PlanDefinition {
  key:         PlanKey;
  name:        string;
  tagline:     string;
  monthlyUsd:  number;
  limits:      PlanLimits;
  features:    Record<PlanFeatureKey, boolean>;
  stripePriceIdMonthly?: string;
  stripePriceIdAnnual?:  string;
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
      emailsPerMonth:         10_000,   // raised from 500 — competitive with Kit
      contacts:               2_500,    // raised from 250
      aiCreditsMonthly:       10,
      automations:            0,
      campaigns:              3,
      analyticsRetentionDays: 7,
    },
    features: {
      automations:             false,
      segments:                false,
      abTesting:               false,
      aiFeatures:              true,
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
      emailsPerMonth:         50_000,   // raised from 5k
      contacts:               5_000,    // raised from 2.5k
      aiCreditsMonthly:       50,
      automations:            3,
      campaigns:              null,
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
      emailsPerMonth:         250_000,  // raised from 25k
      contacts:               25_000,   // raised from 10k
      aiCreditsMonthly:       150,
      automations:            null,
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
      emailsPerMonth:         null,
      contacts:               null,
      aiCreditsMonthly:       500,
      automations:            null,
      campaigns:              null,
      analyticsRetentionDays: 999999,
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

export const PLAN_ORDER: PlanKey[] = ['FREE', 'STARTER', 'GROWTH', 'SCALE'];

export function nextPlan(current: PlanKey): PlanDefinition | null {
  const idx = PLAN_ORDER.indexOf(current);
  const nextKey = PLAN_ORDER[idx + 1];
  return nextKey ? PLANS[nextKey] : null;
}

export function cheapestPlanWith(feature: PlanFeatureKey): PlanDefinition | null {
  for (const key of PLAN_ORDER) {
    if (PLANS[key].features[feature]) return PLANS[key];
  }
  return null;
}

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

export function formatLimit(value: number | null, suffix = ''): string {
  if (value === null) return 'Unlimited';
  return value.toLocaleString() + (suffix ? ` ${suffix}` : '');
}
