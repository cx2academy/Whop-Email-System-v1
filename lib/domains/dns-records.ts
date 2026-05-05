/**
 * lib/domains/dns-records.ts
 *
 * Generates the complete set of DNS records a user needs to add for
 * authenticated email sending.
 *
 * Records generated:
 *   SPF         — authorises which servers can send for your domain
 *   DKIM        — cryptographically signs outbound email
 *   DMARC       — policy for what to do with unauthenticated mail
 *   Return-Path — bounce address, improves deliverability & unsubscribe handling
 *
 * Provider-awareness:
 *   The SPF include and Return-Path CNAME differ per provider.
 *   Pass the workspace's email provider so records are precise.
 *   Defaults to generic values if no provider is set.
 *
 * Cloudflare API integration (future):
 *   To auto-apply these records via the Cloudflare DNS API, call:
 *     POST https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records
 *     Authorization: Bearer {CF_API_TOKEN}
 *     Body: { type, name, content, ttl: 1, proxied: false }
 *   Each DnsRecord maps 1:1 to a Cloudflare DNS record create request.
 *   The `cloudflareType` field is already present to make that mapping trivial.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DnsRecordType = 'TXT' | 'CNAME' | 'MX';
export type DnsRecordCategory = 'spf' | 'dkim' | 'dmarc' | 'return_path';

export interface DnsRecord {
  category: DnsRecordCategory;
  label: string;          // Human-readable label shown in UI
  type: DnsRecordType;
  host: string;           // Relative host (e.g. "_dmarc" or "@")
  hostFull: string;       // Full host including domain (e.g. "_dmarc.acme.com")
  value: string;          // The record value/content
  ttl: number;            // Recommended TTL in seconds
  required: boolean;      // false = strongly recommended but optional
  helpText: string;       // Plain-English explanation for non-technical users
  verified?: boolean;     // Populated after DNS check
}

export type EmailProviderHint = 'RESEND' | 'SES' | 'SENDGRID' | null;

// ---------------------------------------------------------------------------
// SPF includes per provider
// ---------------------------------------------------------------------------

const SPF_INCLUDES: Record<NonNullable<EmailProviderHint>, string> = {
  RESEND:    'include:_spf.resend.com',
  SES:       'include:amazonses.com',
  SENDGRID:  'include:sendgrid.net',
};

function buildSpfValue(provider: EmailProviderHint): string {
  const include = provider ? SPF_INCLUDES[provider] : 'include:_spf.resend.com';
  return `v=spf1 ${include} ~all`;
}

// ---------------------------------------------------------------------------
// Return-Path CNAME targets per provider
// ---------------------------------------------------------------------------

const RETURN_PATH_TARGETS: Record<NonNullable<EmailProviderHint>, string | null> = {
  RESEND:    'feedback-smtp.us-east-1.amazonses.com',
  SES:       null,  // SES uses the domain's own Return-Path — no CNAME needed
  SENDGRID:  'sendgrid.net',
};

// ---------------------------------------------------------------------------
// DNS record generator
// ---------------------------------------------------------------------------

export function generateDnsRecords(params: {
  domain: string;
  dkimSelector: string;
  dkimPublicKey: string;    // raw base64 key (no PEM headers)
  provider: EmailProviderHint;
  dmarcEmail?: string;      // where DMARC reports should go (optional)
}): DnsRecord[] {
  const { domain, dkimSelector, dkimPublicKey, provider, dmarcEmail } = params;
  const reportEmail = dmarcEmail ?? `dmarc@${domain}`;

  const records: DnsRecord[] = [];

  // -------------------------------------------------------------------------
  // 1. SPF
  // -------------------------------------------------------------------------
  records.push({
    category: 'spf',
    label: 'SPF Record',
    type: 'TXT',
    host: '@',
    hostFull: domain,
    value: buildSpfValue(provider),
    ttl: 3600,
    required: true,
    helpText:
      'Tells receiving mail servers which services are allowed to send email on behalf of your domain. ' +
      'Without this, your emails are more likely to land in spam.',
  });

  // -------------------------------------------------------------------------
  // 2. DKIM
  // -------------------------------------------------------------------------
  const dkimHost = `${dkimSelector}._domainkey`;
  records.push({
    category: 'dkim',
    label: 'DKIM Record',
    type: 'TXT',
    host: dkimHost,
    hostFull: `${dkimHost}.${domain}`,
    value: `v=DKIM1; k=rsa; p=${dkimPublicKey}`,
    ttl: 3600,
    required: true,
    helpText:
      'A digital signature that proves emails really came from your domain. ' +
      'Gmail, Outlook, and Yahoo all check for this before deciding where to deliver your email.',
  });

  // -------------------------------------------------------------------------
  // 3. DMARC
  // -------------------------------------------------------------------------
  records.push({
    category: 'dmarc',
    label: 'DMARC Record',
    type: 'TXT',
    host: '_dmarc',
    hostFull: `_dmarc.${domain}`,
    // Start with p=none (monitor only) — upgrade to p=quarantine/reject later
    value: `v=DMARC1; p=none; rua=mailto:${reportEmail}; adkim=r; aspf=r`,
    ttl: 3600,
    required: false,
    helpText:
      'Tells receiving servers what to do if SPF or DKIM fails, and where to send reports. ' +
      'Start with "none" (monitor only). Once deliverability looks good, upgrade to "quarantine" or "reject".',
  });

  // -------------------------------------------------------------------------
  // 4. Return-Path (bounce handling)
  //    Not needed for SES (manages its own) or if provider is unknown
  // -------------------------------------------------------------------------
  const returnPathTarget = provider ? RETURN_PATH_TARGETS[provider] : null;
  if (returnPathTarget) {
    records.push({
      category: 'return_path',
      label: 'Return-Path (Bounce Handling)',
      type: 'CNAME',
      host: 'bounces',
      hostFull: `bounces.${domain}`,
      value: returnPathTarget,
      ttl: 3600,
      required: false,
      helpText:
        'Handles bounced emails — messages that could not be delivered. ' +
        'Adding this CNAME lets your provider automatically process bounces and keep your sender reputation clean.',
    });
  }

  return records;
}

// ---------------------------------------------------------------------------
// Category metadata — used to render section headers in UI
// ---------------------------------------------------------------------------

export const RECORD_CATEGORY_META: Record<
  DnsRecordCategory,
  { title: string; icon: string; importance: 'required' | 'recommended' | 'optional' }
> = {
  spf: {
    title: 'SPF',
    icon: '🛡️',
    importance: 'required',
  },
  dkim: {
    title: 'DKIM',
    icon: '🔏',
    importance: 'required',
  },
  dmarc: {
    title: 'DMARC',
    icon: '📋',
    importance: 'recommended',
  },
  return_path: {
    title: 'Return-Path',
    icon: '↩️',
    importance: 'optional',
  },
};

// ---------------------------------------------------------------------------
// Map DB-verified flags to per-category status
// ---------------------------------------------------------------------------

export function mapVerificationStatus(domain: {
  spfVerified: boolean;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  returnPathVerified: boolean;
}): Record<DnsRecordCategory, boolean> {
  return {
    spf:         domain.spfVerified,
    dkim:        domain.dkimVerified,
    dmarc:       domain.dmarcVerified,
    return_path: domain.returnPathVerified,
  };
}
