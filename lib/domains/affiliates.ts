/**
 * lib/domains/affiliates.ts
 *
 * Affiliate URL builder for domain registrars.
 *
 * Revenue model:
 *   Namecheap: ~$5–15 commission per domain registration
 *   GoDaddy:   ~$10–20 commission per registration
 *
 * Setup:
 *   Set these env vars in Vercel to activate affiliate tracking:
 *     NAMECHEAP_AFFILIATE_ID=your_id     (from namecheap.com/affiliates)
 *     GODADDY_AFFILIATE_ID=your_id       (from godaddy.com/affiliate)
 *
 *   Without env vars, links still work — they just don't have your affiliate
 *   tracking code attached. Users can still buy domains; you just won't earn
 *   commission until you add the IDs.
 *
 * Cloudflare Registrar (future):
 *   Cloudflare doesn't run an affiliate programme, but at-cost pricing
 *   (~$8.57/yr for .com) is a strong selling point. Add a direct link.
 *   When you have the Cloudflare API integration, the purchase flow can
 *   be done entirely in-app via:
 *     POST /client/v4/accounts/{id}/registrar/domains/{domain}/registration
 */

export type RegistrarName = 'namecheap' | 'godaddy' | 'cloudflare';

export interface RegistrarLink {
  name: RegistrarName;
  label: string;
  tagline: string;
  url: string;
  hasAffiliate: boolean;
  /** Commission rate description for your records */
  commissionNote: string;
}

// ---------------------------------------------------------------------------
// URL builders per registrar
// ---------------------------------------------------------------------------

function namecheapUrl(domain: string): string {
  const affiliateId = process.env.NAMECHEAP_AFFILIATE_ID;
  const base = `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`;
  if (affiliateId) {
    return `${base}&aff=${encodeURIComponent(affiliateId)}`;
  }
  return base;
}

function godaddyUrl(domain: string): string {
  const affiliateId = process.env.GODADDY_AFFILIATE_ID;
  const base = `https://www.godaddy.com/domainsearch/find?checkAvail=1&domainToCheck=${encodeURIComponent(domain)}`;
  if (affiliateId) {
    // GoDaddy uses ISC (Impact affiliate network) tracking params
    return `${base}&isc=${encodeURIComponent(affiliateId)}`;
  }
  return base;
}

function cloudflareUrl(domain: string): string {
  // Cloudflare requires account login before domain search — send to
  // the main registrar page. When API integration is built, this becomes
  // an in-app purchase flow instead.
  return `https://www.cloudflare.com/products/registrar/?domain=${encodeURIComponent(domain)}`;
}

// ---------------------------------------------------------------------------
// Public builder — returns all registrar options for a given domain
// ---------------------------------------------------------------------------

export function buildRegistrarLinks(domain: string): RegistrarLink[] {
  return [
    {
      name: 'namecheap',
      label: 'Namecheap',
      tagline: 'Best value · Free WhoisGuard',
      url: namecheapUrl(domain),
      hasAffiliate: !!process.env.NAMECHEAP_AFFILIATE_ID,
      commissionNote: '~$5–15 per registration',
    },
    {
      name: 'godaddy',
      label: 'GoDaddy',
      tagline: 'Most popular · Easy to use',
      url: godaddyUrl(domain),
      hasAffiliate: !!process.env.GODADDY_AFFILIATE_ID,
      commissionNote: '~$10–20 per registration',
    },
    {
      name: 'cloudflare',
      label: 'Cloudflare',
      tagline: 'At-cost pricing · Auto-DNS coming soon',
      url: cloudflareUrl(domain),
      hasAffiliate: false,
      commissionNote: 'No affiliate programme',
    },
  ];
}

// ---------------------------------------------------------------------------
// Log a registrar click (called by the API route when user clicks a buy link)
// ---------------------------------------------------------------------------

export async function logAffiliateClick(
  workspaceId: string,
  searchLogId: string,
  registrar: RegistrarName
): Promise<void> {
  // Lazy import to keep this file edge-runtime safe
  const { db } = await import('@/lib/db/client');
  await db.domainSearchLog.update({
    where: { id: searchLogId },
    data: { registrarClicked: registrar, clickedAt: new Date() },
  });
}
