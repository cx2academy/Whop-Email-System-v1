'use client';

/**
 * app/dashboard/deliverability/domain-setup.tsx
 *
 * Replaced original DomainSetup with a two-panel layout:
 *   - If no domains: show DomainWizard directly
 *   - If domains exist: show domain list (with full 4-record verification)
 *     + a collapsed "Add another domain" panel using the wizard
 *
 * Breaking changes from v1:
 *   - DomainRow now includes dmarcVerified, returnPathVerified, emailProvider
 *   - verifyMsg shows per-category status, not just SPF/DKIM
 */

import { useState, useTransition } from 'react';
import { deleteDomain } from '@/lib/deliverability/actions';
import { generateDnsRecords, RECORD_CATEGORY_META } from '@/lib/domains/dns-records';
import type { EmailProviderHint } from '@/lib/domains/dns-records';
import { DomainWizard } from './domain-wizard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DomainRow {
  id: string;
  domain: string;
  spfVerified: boolean;
  dkimVerified: boolean;
  dmarcVerified: boolean;
  returnPathVerified: boolean;
  dkimSelector: string;
  dkimPublicKey: string;
  emailProvider: string | null;
  reputationScore: number;
  createdAt: string;
}

interface DomainSetupProps {
  domains: DomainRow[];
  emailProvider: EmailProviderHint;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function AuthBadge({ spf, dkim, dmarc }: { spf: boolean; dkim: boolean; dmarc: boolean }) {
  if (spf && dkim && dmarc)
    return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">Fully verified</span>;
  if (spf && dkim)
    return <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">Core verified</span>;
  if (spf || dkim)
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">Partial</span>;
  return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300">Not verified</span>;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="shrink-0 rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
    >
      {copied ? '✓' : 'Copy'}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Single domain row (expanded shows all 4 record categories)
// ---------------------------------------------------------------------------

function DomainItem({
  domain: d,
  onDelete,
  onVerify,
  verifyStatus,
}: {
  domain: DomainRow;
  onDelete: (id: string) => void;
  onVerify: (id: string) => void;
  verifyStatus: Record<string, { spf: boolean; dkim: boolean; dmarc: boolean; returnPath: boolean }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');

  const status = verifyStatus[d.id] ?? {
    spf:        d.spfVerified,
    dkim:       d.dkimVerified,
    dmarc:      d.dmarcVerified,
    returnPath: d.returnPathVerified,
  };

  const records = generateDnsRecords({
    domain: d.domain,
    dkimSelector: d.dkimSelector,
    dkimPublicKey: d.dkimPublicKey,
    provider: (d.emailProvider as EmailProviderHint) ?? null,
  });

  async function handleVerify() {
    setVerifying(true);
    setVerifyMsg('');

    try {
      const res = await fetch('/api/domain/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId: d.id }),
      });
      const data = await res.json() as {
        status: string;
        records: { spf: { verified: boolean }; dkim: { verified: boolean }; dmarc: { verified: boolean }; return_path: { verified: boolean } };
        error?: string;
      };

      if (!res.ok) { setVerifyMsg(data.error ?? 'Verification failed.'); return; }

      onVerify(d.id);
      setVerifyMsg(
        `SPF: ${data.records.spf.verified ? '✓' : '✗'} · DKIM: ${data.records.dkim.verified ? '✓' : '✗'} · DMARC: ${data.records.dmarc.verified ? '✓' : '✗'} · Return-Path: ${data.records.return_path.verified ? '✓' : '✗'}`
      );
    } catch {
      setVerifyMsg('Network error. Try again.');
    } finally {
      setVerifying(false);
    }
  }

  const categories = Array.from(new Set(records.map((r) => r.category)));

  return (
    <div>
      {/* Header row */}
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div>
          <p className="text-sm font-medium text-foreground">{d.domain}</p>
          <p className="text-xs text-muted-foreground">
            SPF {status.spf ? '✓' : '✗'} · DKIM {status.dkim ? '✓' : '✗'} · DMARC {status.dmarc ? '✓' : '✗'} · Rep: {d.reputationScore}/100
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AuthBadge spf={status.spf} dkim={status.dkim} dmarc={status.dmarc} />
          <span className="text-xs text-muted-foreground">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded — DNS records + actions */}
      {expanded && (
        <div className="border-t border-border bg-muted/20 px-4 py-4 space-y-4">
          {/* Per-category DNS records */}
          {categories.map((cat) => {
            const meta = RECORD_CATEGORY_META[cat];
            const catRecords = records.filter((r) => r.category === cat);
            const catVerified = cat === 'spf' ? status.spf : cat === 'dkim' ? status.dkim : cat === 'dmarc' ? status.dmarc : status.returnPath;

            return (
              <div key={cat} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span>{meta.icon}</span>
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{meta.title}</span>
                  {catVerified
                    ? <span className="text-xs text-green-600 dark:text-green-400">✓ Verified</span>
                    : <span className="text-xs text-amber-600 dark:text-amber-400">Not verified</span>
                  }
                </div>
                {catRecords.map((rec, i) => (
                  <div key={i} className="rounded-md bg-muted/50 p-3 font-mono text-xs space-y-1.5">
                    <div className="flex gap-2"><span className="w-12 text-muted-foreground">Type</span><span>{rec.type}</span></div>
                    <div className="flex items-start gap-2">
                      <span className="w-12 shrink-0 text-muted-foreground">Host</span>
                      <span className="break-all">{rec.host}</span>
                      <CopyButton value={rec.host} />
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-12 shrink-0 text-muted-foreground">Value</span>
                      <span className="break-all">{rec.value.length > 70 ? `${rec.value.slice(0, 70)}…` : rec.value}</span>
                      <CopyButton value={rec.value} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}

          {verifyMsg && <p className="text-xs text-muted-foreground">{verifyMsg}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {verifying ? 'Checking…' : 'Verify DNS'}
            </button>
            <button
              onClick={() => onDelete(d.id)}
              className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DomainSetup({ domains: initialDomains, emailProvider }: DomainSetupProps) {
  const [domains, setDomains] = useState(initialDomains);
  const [showWizard, setShowWizard] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<Record<string, { spf: boolean; dkim: boolean; dmarc: boolean; returnPath: boolean }>>({});
  const [, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteDomain(id);
      setDomains((prev) => prev.filter((d) => d.id !== id));
    });
  }

  function handleVerify(id: string) {
    // Optimistic update — the API route already persisted to DB
    // The actual values come from the DomainItem's fetch result
    setVerifyStatus((prev) => ({ ...prev }));
  }

  function handleDomainConnected(domainId: string, domainName: string) {
    // Reload page so the new domain appears in the server-rendered list
    window.location.reload();
  }

  // No domains — show wizard directly
  if (domains.length === 0) {
    return (
      <DomainWizard
        emailProvider={emailProvider}
        onDomainConnected={handleDomainConnected}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing domain list */}
      <div className="divide-y divide-border rounded-md border border-border">
        {domains.map((d) => (
          <DomainItem
            key={d.id}
            domain={d}
            onDelete={handleDelete}
            onVerify={handleVerify}
            verifyStatus={verifyStatus}
          />
        ))}
      </div>

      {/* Add another domain */}
      {!showWizard ? (
        <button
          type="button"
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground hover:border-border/80 hover:text-foreground transition-colors"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add another domain
        </button>
      ) : (
        <div className="rounded-lg border border-border p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Add domain</p>
            <button
              type="button"
              onClick={() => setShowWizard(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>
          <DomainWizard
            emailProvider={emailProvider}
            onDomainConnected={handleDomainConnected}
          />
        </div>
      )}
    </div>
  );
}
