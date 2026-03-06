/**
 * lib/deliverability/domain-verification.ts
 *
 * DNS-based domain authentication checks.
 * Uses Node.js built-in dns.promises — no extra packages.
 *
 * SPF check: looks for a TXT record starting with "v=spf1"
 * DKIM check: looks for a TXT record at <selector>._domainkey.<domain>
 *             containing "p=" (public key)
 *
 * DKIM key generation: produces RSA-2048 key pair.
 *   - Private key stored encrypted in DB (never exposed)
 *   - Public key published as DNS TXT record by the user
 */

import { resolveTxt } from 'dns/promises';
import { generateKeyPairSync } from 'crypto';

export interface DomainCheckResult {
  spfVerified: boolean;
  spfRecord: string | null;
  dkimVerified: boolean;
  dkimRecord: string | null;
}

export interface DkimKeyPair {
  selector: string;
  publicKey: string;   // goes in DNS: <selector>._domainkey.<domain> TXT "v=DKIM1; k=rsa; p=<this>"
  privateKey: string;  // stored encrypted in DB
  dnsValue: string;    // full DNS TXT value the user copies into their DNS
}

// ---------------------------------------------------------------------------
// SPF check
// ---------------------------------------------------------------------------

export async function checkSpf(domain: string): Promise<{ verified: boolean; record: string | null }> {
  try {
    const records = await resolveTxt(domain);
    const spf = records
      .flat()
      .find((r) => r.startsWith('v=spf1')) ?? null;
    return { verified: !!spf, record: spf };
  } catch {
    return { verified: false, record: null };
  }
}

// ---------------------------------------------------------------------------
// DKIM check
// ---------------------------------------------------------------------------

export async function checkDkim(
  domain: string,
  selector: string
): Promise<{ verified: boolean; record: string | null }> {
  try {
    const dkimDomain = `${selector}._domainkey.${domain}`;
    const records = await resolveTxt(dkimDomain);
    const dkim = records.flat().join('');
    const verified = dkim.includes('p=') && dkim.includes('v=DKIM1');
    return { verified, record: dkim || null };
  } catch {
    return { verified: false, record: null };
  }
}

// ---------------------------------------------------------------------------
// Full domain check
// ---------------------------------------------------------------------------

export async function checkDomain(
  domain: string,
  selector: string
): Promise<DomainCheckResult> {
  const [spf, dkim] = await Promise.all([
    checkSpf(domain),
    checkDkim(domain, selector),
  ]);
  return {
    spfVerified: spf.verified,
    spfRecord: spf.record,
    dkimVerified: dkim.verified,
    dkimRecord: dkim.record,
  };
}

// ---------------------------------------------------------------------------
// DKIM key pair generation
// ---------------------------------------------------------------------------

export function generateDkimKeyPair(domain: string, selector = 'wee1'): DkimKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  // Strip PEM headers and newlines to get raw base64 for DNS
  const rawPublicKey = publicKey
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\n/g, '');

  const dnsValue = `v=DKIM1; k=rsa; p=${rawPublicKey}`;

  return { selector, publicKey: rawPublicKey, privateKey, dnsValue };
}
