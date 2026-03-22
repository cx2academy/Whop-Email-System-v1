/**
 * lib/deliverability/domain-registration.ts
 *
 * Wraps Resend's domains API for RevTray's sending domain lifecycle.
 *
 * Why Resend instead of homebrew DKIM:
 *   The old registerDomain() generated its own RSA key pair and produced
 *   generic DNS records. Those records were technically valid DNS entries
 *   but Resend never knew about them — so emails still went out unsigned
 *   through Resend's default DKIM, defeating the whole purpose.
 *
 *   Resend's domains.create() registers the domain under RevTray's Resend
 *   account and returns the exact DNS records Resend needs to sign outbound
 *   email on behalf of the user's domain. Once those are added and verified,
 *   every email sent through RevTray is properly DKIM-signed.
 *
 * Flow:
 *   1. registerWithResend(domain) → creates domain in Resend, returns DNS records
 *   2. User adds DNS records to their registrar
 *   3. checkResendVerification(resendDomainId) → polls until verified or failed
 *
 * The RESEND_API_KEY used here is RevTray's platform key (set in Vercel env),
 * NOT a user's key. RevTray acts as the platform sender on behalf of users.
 */

import { Resend } from 'resend';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ResendDnsRecord {
  record:    string;   // 'SPF' | 'DKIM' | 'DMARC' | 'MX'
  name:      string;   // hostname (relative to domain), e.g. "resend._domainkey"
  value:     string;   // record content
  type:      string;   // 'TXT' | 'MX' | 'CNAME'
  ttl:       number | string;
  priority?: number;
  status:    string;   // 'not_started' | 'verified' | 'failed'
}

export interface ResendDomainCreateResult {
  resendDomainId: string;
  records:        ResendDnsRecord[];
  status:         string;
}

export type ResendDomainStatus =
  | 'not_started'
  | 'pending'
  | 'verified'
  | 'partially_verified'
  | 'failed'
  | 'temporary_failure';

export interface ResendVerificationResult {
  status:       ResendDomainStatus;
  isVerified:   boolean;
  isFailed:     boolean;
  records?:     ResendDnsRecord[];
}

// ── Resend client factory ─────────────────────────────────────────────────────

function getResendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY env var is not set.');
  return new Resend(key);
}

// ── Register a domain with Resend ─────────────────────────────────────────────

/**
 * Registers `domain` with Resend and returns the DNS records the user
 * must add to their DNS provider.
 *
 * Safe to call multiple times — if the domain already exists in Resend
 * the API returns the existing domain (idempotent).
 */
export async function registerWithResend(
  domain: string
): Promise<ResendDomainCreateResult> {
  const resend = getResendClient();

  const { data, error } = await resend.domains.create({ name: domain });

  if (error || !data) {
    throw new Error(`Resend domain registration failed: ${error?.message ?? 'unknown error'}`);
  }

  // Resend v4 SDK returns `records` as an array on the domain object
  const records = (data as any).records as ResendDnsRecord[] ?? [];

  return {
    resendDomainId: data.id,
    records,
    status:         (data as any).status ?? 'not_started',
  };
}

// ── Poll verification status ──────────────────────────────────────────────────

/**
 * Fetches the current verification status of a domain from Resend.
 * Call this every ~10 seconds after the user has added their DNS records.
 */
export async function checkResendVerification(
  resendDomainId: string
): Promise<ResendVerificationResult> {
  const resend = getResendClient();

  const { data, error } = await resend.domains.get(resendDomainId);

  if (error || !data) {
    // Non-fatal — caller should retry
    return { status: 'pending', isVerified: false, isFailed: false };
  }

  const status = ((data as any).status ?? 'not_started') as ResendDomainStatus;
  const records = (data as any).records as ResendDnsRecord[] | undefined;

  return {
    status,
    isVerified: status === 'verified',
    isFailed:   status === 'failed',
    records,
  };
}

// ── Format DNS records for the UI ─────────────────────────────────────────────

export interface FlatDnsRecord {
  label: string;   // human label, e.g. "SPF"
  type:  string;   // 'TXT' | 'MX' | 'CNAME'
  host:  string;   // full hostname, e.g. "resend._domainkey.acme.com"
  value: string;   // the value to paste into DNS
}

/**
 * Converts Resend's raw DNS records to the flat shape the UI expects.
 * Resend returns `name` as a relative hostname — we append the domain.
 */
export function flattenDnsRecords(
  records: ResendDnsRecord[],
  domain: string
): FlatDnsRecord[] {
  return records
    .filter((r) => ['SPF', 'DKIM', 'DMARC', 'MX'].includes(r.record.toUpperCase()))
    .slice(0, 4)
    .map((r) => {
      // Resend returns '@' for the root or a subdomain like 'resend._domainkey'
      const host = r.name === '@' ? domain : `${r.name}.${domain}`;
      return {
        label: r.record.toUpperCase(),
        type:  r.type,
        host,
        value: r.value,
      };
    });
}
