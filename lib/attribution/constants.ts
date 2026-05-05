/**
 * lib/attribution/constants.ts
 *
 * Shared types and UI constants for revenue attribution.
 * This file is safe to import in client components as it has no DB dependencies.
 */

export type AttributionModel = 'last_click' | 'first_touch' | 'linear' | 'time_decay';

export const MODEL_LABELS: Record<AttributionModel, string> = {
  last_click:  'Last click',
  first_touch: 'First touch',
  linear:      'Linear',
  time_decay:  'Time decay',
};

export const MODEL_DESCRIPTIONS: Record<AttributionModel, string> = {
  last_click:  '100% credit to the last email clicked before purchase',
  first_touch: '100% credit to the first email that introduced the buyer',
  linear:      'Equal credit split across all clicked emails in the window',
  time_decay:  'More credit to recent touches, less to older ones',
};

export interface CampaignRevRow {
  campaignId:      string;
  campaignName:    string;
  subject:         string;
  revenue:         string;
  revenueCents:    number;
  purchases:       number;
  emailsSent:      number;
  revenuePerEmail: string;
  conversionRate:  string;
  sentAt:          string | null;
}
