/**
 * lib/automation/trigger-constants.ts
 *
 * Client-safe trigger constants and types.
 * No server imports, no DB — safe to use in 'use client' components.
 *
 * trigger-system.ts imports these too so everything stays in sync.
 */

export type TriggerType =
  | 'new_member'
  | 'purchase'
  | 'api'
  | 'manual'
  | 'membership_activated'
  | 'membership_deactivated'
  | 'payment_succeeded'
  | 'product_purchased'
  | 'product_not_purchased';

export const WHOP_TRIGGER_LABELS: Record<TriggerType, string> = {
  new_member:             'New member joins',
  purchase:               'Purchase (legacy)',
  api:                    'API trigger',
  manual:                 'Manual trigger',
  membership_activated:   'Membership activated',
  membership_deactivated: 'Membership canceled / expired',
  payment_succeeded:      'Payment succeeded',
  product_purchased:      'Specific product purchased',
  product_not_purchased:  'Product not purchased after X days',
};

export const TRIGGER_ICONS: Record<string, string> = {
  new_member:             '👋',
  purchase:               '💳',
  api:                    '⚡',
  manual:                 '🖐️',
  membership_activated:   '✅',
  membership_deactivated: '❌',
  payment_succeeded:      '💰',
  product_purchased:      '🛒',
  product_not_purchased:  '⏰',
};
