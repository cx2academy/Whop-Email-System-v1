'use client';

/**
 * app/dashboard/deliverability/domain-wizard.tsx
 *
 * Multi-step domain onboarding wizard.
 *
 * Steps:
 *   1. SEARCH   — search domain availability + see price
 *   2. CHOOSE   — available: buy via registrar / taken: pick alternative / have one: skip to connect
 *   3. CONNECT  — enter/confirm domain to add to workspace + generate DNS records
 *   4. VERIFY   — show DNS records, verify button, live status per record
 *   5. DONE     — all required records verified
 *
 * Affiliate revenue:
 *   When user clicks a "Buy at Namecheap / GoDaddy" button, a fire-and-forget
 *   POST to /api/domain/affiliate-click logs the click for reporting.
 *   The affiliate URL already carries the tracking ID set in env vars.
 */

import { useState, useCallback } from 'react';
import { registerDomainWithProvider } from '@/lib/deliverability/actions';
import { generateDnsRecords, RECORD_CATEGORY_META } from '@/lib/domains/dns-records';
import type { DnsRecord, EmailProviderHint } from '@/lib/domains/dns-records';
import type { RegistrarLink } from '@/lib/domains/affiliates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type WizardStep = 'search' | 'choose' | 'connect' | 'verify' | 'done';

interface SearchResult {
  domain: string;
  available: boolean;
  priceFormatted: string;
  error?: string;
}

interface VerifyRecord {
  verified: boolean;
  record: string | null;
}

interface VerifyResult {
  domainId: string;
  status: 'verified' | 'partial' | 'pending';
  records: {
    spf:         VerifyRecord;
    dkim:        VerifyRecord;
    dmarc:       VerifyRecord;
    return_path: VerifyRecord;
  };
}

interface ConnectedDomainData {
  id: string;
  domain: string;
  dkimSelector: string;
  dkimPublicKey: string;
}

interface Props {
  emailProvider: EmailProviderHint;
  onDomainConnected?: (domainId: string, domain: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function StatusDot({ verified }: { verified: boolean }) {
  return verified
    ? <span className="inline-flex h-2 w-2 rounded-full bg-green-500" />
    : <span className="inline-flex h-2 w-2 rounded-full bg-amber-400" />;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-2 shrink-0 rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'search',  label: 'Search'  },
  { key: 'choose',  label: 'Choose'  },
  { key: 'connect', label: 'Connect' },
  { key: 'verify',  label: 'Verify'  },
];

function StepIndicator({ current }: { current: WizardStep }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="mb-6 flex items-center gap-0">
      {STEPS.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className={[
            'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
            i < idx  ? 'bg-primary text-primary-foreground' :
            i === idx ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background' :
                        'bg-muted text-muted-foreground',
          ].join(' ')}>
            {i < idx ? '✓' : i + 1}
          </div>
          <span className={`ml-1.5 text-xs ${i === idx ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
            {step.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`mx-3 h-px w-8 ${i < idx ? 'bg-primary' : 'bg-border'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Search
// ---------------------------------------------------------------------------

function StepSearch({ onResult }: {
  onResult: (result: SearchResult, suggestions: SearchResult[], registrarLinks: RegistrarLink[], searchLogId: string | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/domain/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json() as {
        result?: SearchResult;
        suggestions?: SearchResult[];
        registrarLinks?: RegistrarLink[];
        searchLogId?: string;
        error?: string;
      };

      if (!res.ok || !data.result) {
        setError(data.error ?? 'Search failed. Try again.');
        return;
      }

      onResult(data.result, data.suggestions ?? [], data.registrarLinks ?? [], data.searchLogId ?? null);
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Find your sending domain</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          A custom domain (e.g. <code className="rounded bg-muted px-1 text-xs">emails.yourbrand.com</code>) dramatically
          improves inbox placement and looks professional.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="yourbrand.com"
          disabled={loading}
          className="flex h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading && <Spinner className="h-3.5 w-3.5 text-primary-foreground" />}
          {loading ? 'Checking…' : 'Search'}
        </button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <p className="text-xs text-muted-foreground">
        Already have a domain?{' '}
        <button
          type="button"
          onClick={() => onResult(
            { domain: query.trim() || 'yourdomain.com', available: false, priceFormatted: '' },
            [], [], null
          )}
          className="underline underline-offset-2 hover:text-foreground"
        >
          Skip to connect →
        </button>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Choose
// ---------------------------------------------------------------------------

function StepChoose({
  result,
  suggestions,
  registrarLinks,
  searchLogId,
  onBuy,
  onUseThis,
  onBack,
}: {
  result: SearchResult;
  suggestions: SearchResult[];
  registrarLinks: RegistrarLink[];
  searchLogId: string | null;
  onBuy: (domain: string) => void;
  onUseThis: (domain: string) => void;
  onBack: () => void;
}) {
  async function trackClick(registrar: string) {
    if (!searchLogId) return;
    // Fire-and-forget — don't await
    fetch('/api/domain/affiliate-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchLogId, registrar }),
    }).catch(() => {});
  }

  return (
    <div className="space-y-5">
      {/* Primary result */}
      <div className={[
        'rounded-lg border p-4',
        result.available ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30' : 'border-border bg-muted/30',
      ].join(' ')}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">{result.domain}</p>
            <p className={`text-sm ${result.available ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground'}`}>
              {result.available ? `Available — ${result.priceFormatted}` : 'Already registered'}
            </p>
            {result.error && <p className="text-xs text-amber-600">{result.error}</p>}
          </div>
          {result.available ? (
            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
              Available
            </span>
          ) : (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Taken
            </span>
          )}
        </div>

        {/* Buy buttons — only shown if available */}
        {result.available && registrarLinks.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-foreground">Buy from:</p>
            <div className="flex flex-wrap gap-2">
              {registrarLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => { trackClick(link.name); onBuy(result.domain); }}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                >
                  {link.label}
                  <span className="text-muted-foreground">↗</span>
                </a>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              After buying, come back here to connect your domain.
            </p>
          </div>
        )}

        {/* Use this domain button */}
        <button
          type="button"
          onClick={() => onUseThis(result.domain)}
          className="mt-3 text-xs text-primary underline underline-offset-2 hover:opacity-80"
        >
          {result.available ? 'I already own this domain, skip to connect →' : 'Connect this domain anyway →'}
        </button>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Alternatives</p>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div
                key={s.domain}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{s.domain}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.available ? s.priceFormatted : 'Taken'}
                  </p>
                </div>
                {s.available && (
                  <button
                    type="button"
                    onClick={() => onUseThis(s.domain)}
                    className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    Use this
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={onBack} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
        ← Search again
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Connect
// ---------------------------------------------------------------------------

function StepConnect({
  prefill,
  emailProvider,
  onConnected,
  onBack,
}: {
  prefill: string;
  emailProvider: EmailProviderHint;
  onConnected: (data: ConnectedDomainData, records: DnsRecord[]) => void;
  onBack: () => void;
}) {
  const [domain, setDomain] = useState(prefill);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;
    setError('');
    setLoading(true);

    const result = await registerDomainWithProvider(domain.trim(), emailProvider);

    setLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Failed to register domain.');
      return;
    }

    const data = result.data!;
    const records = generateDnsRecords({
      domain: data.domain,
      dkimSelector: data.dkimSelector,
      dkimPublicKey: data.dkimPublicKey,
      provider: emailProvider,
    });

    onConnected(data, records);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Connect your domain</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the domain you own. We'll generate the DNS records you need to add to your DNS provider.
        </p>
      </div>

      <form onSubmit={handleConnect} className="space-y-3">
        <div>
          <label htmlFor="connect-domain" className="mb-1 block text-sm font-medium text-foreground">
            Your domain
          </label>
          <input
            id="connect-domain"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="yourbrand.com"
            disabled={loading}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Use your root domain (acme.com) or a subdomain (mail.acme.com).
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading || !domain.trim()}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading && <Spinner className="h-3.5 w-3.5 text-primary-foreground" />}
            {loading ? 'Generating records…' : 'Generate DNS records'}
          </button>
          <button type="button" onClick={onBack} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
            Back
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4 — Verify
// ---------------------------------------------------------------------------

function StepVerify({
  domainData,
  records,
  onVerified,
}: {
  domainData: ConnectedDomainData;
  records: DnsRecord[];
  onVerified: () => void;
}) {
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('spf');

  async function handleVerify() {
    setVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/domain/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId: domainData.id }),
      });

      const data = await res.json() as VerifyResult & { error?: string };

      if (!res.ok) {
        setError(data.error ?? 'Verification failed.');
        return;
      }

      setVerifyResult(data);

      if (data.status === 'verified') {
        setTimeout(onVerified, 1200);
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setVerifying(false);
    }
  }

  // Group records by category for display
  const categories = Array.from(new Set(records.map((r) => r.category)));

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Add DNS records</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Log in to your domain registrar (where you bought <strong>{domainData.domain}</strong>) and
          add the records below. Changes can take up to 48 hours to propagate.
        </p>
      </div>

      {/* Provider hint */}
      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Common registrars:</strong> Namecheap → Domains → Manage → Advanced DNS.
        GoDaddy → My Products → DNS. Cloudflare → DNS → Records. Add each record below exactly as shown.
      </div>

      {/* DNS record groups */}
      <div className="space-y-2">
        {categories.map((cat) => {
          const catRecords = records.filter((r) => r.category === cat);
          const meta = RECORD_CATEGORY_META[cat];
          const isExpanded = expandedCategory === cat;
          const verifiedStatus = verifyResult?.records[cat as keyof typeof verifyResult.records];

          return (
            <div key={cat} className="rounded-lg border border-border overflow-hidden">
              {/* Category header */}
              <button
                type="button"
                onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                className="flex w-full items-center justify-between bg-muted/30 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{meta.icon}</span>
                  <div>
                    <span className="text-sm font-medium text-foreground">{meta.title}</span>
                    <span className={[
                      'ml-2 rounded-full px-1.5 py-0.5 text-xs font-medium',
                      meta.importance === 'required'    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                      meta.importance === 'recommended' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                                                          'bg-muted text-muted-foreground',
                    ].join(' ')}>
                      {meta.importance}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {verifyResult && <StatusDot verified={verifiedStatus?.verified ?? false} />}
                  <span className="text-xs text-muted-foreground">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Records */}
              {isExpanded && (
                <div className="divide-y divide-border">
                  {catRecords.map((rec, i) => (
                    <div key={i} className="px-4 py-3 space-y-2">
                      <p className="text-xs text-muted-foreground">{rec.helpText}</p>
                      <div className="space-y-1.5 rounded-md bg-muted/50 p-3 font-mono text-xs">
                        <div className="flex items-start gap-2">
                          <span className="w-12 shrink-0 text-muted-foreground">Type</span>
                          <span className="text-foreground">{rec.type}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-12 shrink-0 text-muted-foreground">Host</span>
                          <span className="break-all text-foreground">{rec.host}</span>
                          <CopyButton value={rec.host} />
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-12 shrink-0 text-muted-foreground">Value</span>
                          <span className="break-all text-foreground">
                            {rec.value.length > 80 ? `${rec.value.slice(0, 80)}…` : rec.value}
                          </span>
                          <CopyButton value={rec.value} />
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="w-12 shrink-0 text-muted-foreground">TTL</span>
                          <span className="text-foreground">{rec.ttl}</span>
                        </div>
                      </div>
                      {/* Post-verify status */}
                      {verifyResult && (
                        <p className={`text-xs font-medium ${verifiedStatus?.verified ? 'text-green-600' : 'text-amber-600'}`}>
                          {verifiedStatus?.verified ? '✓ Verified in DNS' : '⏳ Not found yet — DNS may still be propagating'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Verify button */}
      <div className="space-y-2">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {verifyResult && (
          <div className={[
            'rounded-md border px-4 py-3 text-sm',
            verifyResult.status === 'verified' ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300' :
            verifyResult.status === 'partial'  ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300' :
                                                 'border-border bg-muted/30 text-muted-foreground',
          ].join(' ')}>
            {verifyResult.status === 'verified' && '✓ All required records verified! Redirecting…'}
            {verifyResult.status === 'partial'  && '⚠ SPF and DKIM verified. DMARC and Return-Path are optional but recommended.'}
            {verifyResult.status === 'pending'  && 'Records not found yet. DNS propagation can take up to 48 hours.'}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {verifying && <Spinner className="h-3.5 w-3.5 text-primary-foreground" />}
            {verifying ? 'Checking DNS…' : 'Verify DNS records'}
          </button>
          {verifyResult?.status === 'partial' && (
            <button
              type="button"
              onClick={onVerified}
              className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Continue anyway →
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Added the records? Click Verify. Not seeing them yet? Wait 10–30 minutes and try again.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5 — Done
// ---------------------------------------------------------------------------

function StepDone({ domain }: { domain: string }) {
  return (
    <div className="space-y-4 py-2 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
        <svg className="h-7 w-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <h3 className="text-base font-semibold text-foreground">Domain connected!</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          <strong>{domain}</strong> is now authenticated for sending.
          Your emails will have improved inbox placement and professional branding.
        </p>
      </div>
      <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-left text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-sm">What's next</p>
        <p>• Set your From email to an address at this domain in Settings.</p>
        <p>• Your domain is now warming up — sending limits increase over 30 days.</p>
        <p>• Check the Deliverability page to monitor reputation score over time.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main wizard component
// ---------------------------------------------------------------------------

export function DomainWizard({ emailProvider, onDomainConnected }: Props) {
  const [step, setStep] = useState<WizardStep>('search');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [registrarLinks, setRegistrarLinks] = useState<RegistrarLink[]>([]);
  const [searchLogId, setSearchLogId] = useState<string | null>(null);
  const [prefillDomain, setPrefillDomain] = useState('');
  const [connectedData, setConnectedData] = useState<ConnectedDomainData | null>(null);
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);

  const handleSearchResult = useCallback((
    result: SearchResult,
    sugs: SearchResult[],
    links: RegistrarLink[],
    logId: string | null
  ) => {
    setSearchResult(result);
    setSuggestions(sugs);
    setRegistrarLinks(links);
    setSearchLogId(logId);
    setStep('choose');
  }, []);

  const handleUseThis = useCallback((domain: string) => {
    setPrefillDomain(domain);
    setStep('connect');
  }, []);

  const handleConnected = useCallback((data: ConnectedDomainData, records: DnsRecord[]) => {
    setConnectedData(data);
    setDnsRecords(records);
    setStep('verify');
  }, []);

  const handleVerified = useCallback(() => {
    setStep('done');
    if (connectedData) {
      onDomainConnected?.(connectedData.id, connectedData.domain);
    }
  }, [connectedData, onDomainConnected]);

  return (
    <div className="space-y-2">
      {step !== 'done' && <StepIndicator current={step} />}

      {step === 'search' && (
        <StepSearch onResult={handleSearchResult} />
      )}

      {step === 'choose' && searchResult && (
        <StepChoose
          result={searchResult}
          suggestions={suggestions}
          registrarLinks={registrarLinks}
          searchLogId={searchLogId}
          onBuy={(domain) => setPrefillDomain(domain)}
          onUseThis={handleUseThis}
          onBack={() => setStep('search')}
        />
      )}

      {step === 'connect' && (
        <StepConnect
          prefill={prefillDomain}
          emailProvider={emailProvider}
          onConnected={handleConnected}
          onBack={() => setStep(searchResult ? 'choose' : 'search')}
        />
      )}

      {step === 'verify' && connectedData && (
        <StepVerify
          domainData={connectedData}
          records={dnsRecords}
          onVerified={handleVerified}
        />
      )}

      {step === 'done' && connectedData && (
        <StepDone domain={connectedData.domain} />
      )}
    </div>
  );
}
