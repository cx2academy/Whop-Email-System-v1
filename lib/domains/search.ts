/**
 * lib/domains/search.ts
 *
 * Domain availability checking via RDAP (Registration Data Access Protocol).
 * RDAP is the ICANN standard — no API key required.
 *
 * Flow:
 *   1. Validate + normalise the input
 *   2. Query the RDAP bootstrap registry to get the right RDAP server for the TLD
 *   3. Query that server — 200 = registered (unavailable), 404 = available
 *   4. Return availability + price from the static TLD price table
 *
 * Cloudflare API hook (future):
 *   When you're ready to use the Cloudflare Registrar API for actual purchases,
 *   replace the `checkAvailabilityViaRdap` call with:
 *     POST https://api.cloudflare.com/client/v4/accounts/{id}/registrar/domains/search
 *     { name: domain }
 *   The rest of the shape (DomainSearchResult) stays identical.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DomainSearchResult {
  domain: string;       // normalised, e.g. "acme.com"
  tld: string;          // e.g. "com"
  available: boolean;
  priceUsd: number | null;  // cents/year, null if TLD not in price table
  checkedAt: string;    // ISO timestamp
  error?: string;       // set if RDAP check failed (treat as unknown)
}

export type SuggestedDomain = DomainSearchResult & {
  originalQuery: string;
};

// ---------------------------------------------------------------------------
// TLD price table (cents/year, first-year registration)
// Source: approximate 2026 market rates — update via env or DB config later
// ---------------------------------------------------------------------------

export const TLD_PRICES: Record<string, number> = {
  'com':    1299,   // $12.99
  'net':    1299,
  'org':    1299,
  'io':     3999,   // $39.99
  'co':     2999,
  'app':    1999,
  'dev':    1499,
  'ai':     8999,   // $89.99
  'so':     4999,
  'email':  1999,
  'store':  599,
  'shop':   599,
  'online': 299,
  'site':   299,
  'tech':   1999,
  'me':     1299,
  'info':   999,
  'us':     899,
  'uk':     999,
  'ca':     1499,
  'au':     1599,
  'de':     999,
  'fr':     1299,
};

// ---------------------------------------------------------------------------
// Domain normalisation
// ---------------------------------------------------------------------------

export function normaliseDomain(input: string): string | null {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')       // strip paths
    .replace(/\?.*$/, '');      // strip query strings

  // Basic validity: at least one dot, valid chars, no leading/trailing hyphens
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})(\.[a-z]{2,})?$/.test(cleaned)) {
    return null;
  }

  return cleaned;
}

export function extractTld(domain: string): string {
  const parts = domain.split('.');
  // Handle 2-part TLDs like co.uk by checking if last segment < 3 chars
  if (parts.length >= 3 && parts[parts.length - 2].length <= 2) {
    return parts.slice(-2).join('.');
  }
  return parts[parts.length - 1];
}

// ---------------------------------------------------------------------------
// RDAP availability check
//
// Protocol: https://www.rfc-editor.org/rfc/rfc7483
// Bootstrap: https://data.iana.org/rdap/dns.json
//
// We use the Cloudflare RDAP proxy which is reliable and CORS-friendly
// from server-side requests.
// ---------------------------------------------------------------------------

const RDAP_BASE = 'https://rdap.cloudflare.com/rdap/v1';

async function checkAvailabilityViaRdap(
  domain: string
): Promise<{ available: boolean; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

  try {
    const res = await fetch(`${RDAP_BASE}/domain/${domain}`, {
      signal: controller.signal,
      headers: { Accept: 'application/rdap+json' },
      // Never cache availability — always check live
      cache: 'no-store',
    });

    clearTimeout(timeout);

    if (res.status === 404) return { available: true };
    if (res.status === 200) return { available: false };

    // 5xx or unexpected — treat as unknown, don't block user
    return { available: false, error: `RDAP ${res.status}` };
  } catch (err) {
    clearTimeout(timeout);
    if ((err as Error).name === 'AbortError') {
      return { available: false, error: 'RDAP timeout' };
    }
    return { available: false, error: String(err) };
  }
}

// ---------------------------------------------------------------------------
// Public search function
// ---------------------------------------------------------------------------

export async function searchDomain(input: string): Promise<DomainSearchResult> {
  const domain = normaliseDomain(input);

  if (!domain) {
    return {
      domain: input,
      tld: '',
      available: false,
      priceUsd: null,
      checkedAt: new Date().toISOString(),
      error: 'Invalid domain name. Use format: yourdomain.com',
    };
  }

  const tld = extractTld(domain);
  const priceUsd = TLD_PRICES[tld] ?? null;

  const { available, error } = await checkAvailabilityViaRdap(domain);

  return {
    domain,
    tld,
    available,
    priceUsd,
    checkedAt: new Date().toISOString(),
    ...(error && { error }),
  };
}

// ---------------------------------------------------------------------------
// Suggest alternatives if primary domain is taken
// Appends common TLD variants and common prefixes/suffixes
// ---------------------------------------------------------------------------

export async function suggestAlternatives(
  baseDomain: string,
  primaryResult: DomainSearchResult
): Promise<SuggestedDomain[]> {
  const parts = baseDomain.split('.');
  const name = parts[0]; // e.g. "acme"

  // TLD alternatives
  const tldAlts = ['com', 'io', 'co', 'app', 'dev']
    .filter((t) => t !== primaryResult.tld)
    .map((t) => `${name}.${t}`);

  // Name variations (only suggest if primary is taken)
  const nameAlts = primaryResult.available
    ? []
    : [`get${name}.com`, `${name}hq.com`, `${name}app.com`, `try${name}.com`];

  const candidates = [...tldAlts, ...nameAlts].slice(0, 5);

  const results = await Promise.allSettled(
    candidates.map((d) => searchDomain(d))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<DomainSearchResult> => r.status === 'fulfilled')
    .map((r) => ({ ...r.value, originalQuery: baseDomain }));
}

// ---------------------------------------------------------------------------
// Price formatter
// ---------------------------------------------------------------------------

export function formatPrice(cents: number | null): string {
  if (cents === null) return 'Price varies';
  return `$${(cents / 100).toFixed(2)}/yr`;
}
