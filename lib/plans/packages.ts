/**
 * lib/plans/packages.ts
 *
 * Static add-on package definitions — NOT a server action file.
 * Exported as plain data so both client components AND server actions
 * can import it without violating Next.js 15's rule that 'use server'
 * files may only export async functions.
 *
 * Import this instead of ADDON_PACKAGES from lib/plans/actions.ts.
 */

export const ADDON_PACKAGES = {
  emails_10k:  { id: 'emails_10k',  type: 'emails'     as const, quantity: 10_000, priceUsd: 5.00,  label: '10,000 extra emails' },
  emails_50k:  { id: 'emails_50k',  type: 'emails'     as const, quantity: 50_000, priceUsd: 19.00, label: '50,000 extra emails' },
  contacts_1k: { id: 'contacts_1k', type: 'contacts'   as const, quantity: 1_000,  priceUsd: 4.00,  label: '1,000 extra contacts' },
  contacts_5k: { id: 'contacts_5k', type: 'contacts'   as const, quantity: 5_000,  priceUsd: 14.00, label: '5,000 extra contacts' },
  ai_50:       { id: 'ai_50',       type: 'ai_credits' as const, quantity: 50,     priceUsd: 9.00,  label: '50 AI credits' },
  ai_200:      { id: 'ai_200',      type: 'ai_credits' as const, quantity: 200,    priceUsd: 29.00, label: '200 AI credits' },
} as const;

export type AddonPackageId = keyof typeof ADDON_PACKAGES;
