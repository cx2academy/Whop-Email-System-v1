'use client';

/**
 * app/dashboard/deliverability/domain-setup.tsx
 *
 * Domain registration + authentication UI.
 * Shows DNS records to add, verify button, current auth status.
 */

import { useState, useTransition } from 'react';
import { registerDomain, verifyDomain, deleteDomain } from '@/lib/deliverability/actions';

interface DomainRow {
  id: string;
  domain: string;
  spfVerified: boolean;
  dkimVerified: boolean;
  dkimSelector: string;
  dkimPublicKey: string;
  reputationScore: number;
  createdAt: string;
}

interface DomainSetupProps {
  domains: DomainRow[];
}

export function DomainSetup({ domains: initialDomains }: DomainSetupProps) {
  const [domains, setDomains] = useState(initialDomains);
  const [newDomain, setNewDomain] = useState('');
  const [dnsInstructions, setDnsInstructions] = useState<{
    domainId: string; domain: string; dkimSelector: string; dnsValue: string;
  } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const [verifyMsg, setVerifyMsg] = useState<Record<string, string>>({});

  function handleRegister() {
    if (!newDomain.trim()) return;
    setError('');
    startTransition(async () => {
      const res = await registerDomain(newDomain.trim());
      if (!res.success) { setError(res.error ?? 'Failed'); return; }
      setNewDomain('');
      setDnsInstructions({
        domainId: res.data!.id,
        domain: res.data!.domain,
        dkimSelector: res.data!.dkimSelector,
        dnsValue: res.data!.dnsValue,
      });
    });
  }

  function handleVerify(id: string) {
    startTransition(async () => {
      const res = await verifyDomain(id);
      if (!res.success) {
        setVerifyMsg((p) => ({ ...p, [id]: 'Verification failed. Check your DNS records.' }));
        return;
      }
      const d = res.data!;
      setVerifyMsg((p) => ({
        ...p,
        [id]: `SPF: ${d.spfVerified ? '✓ Verified' : '✗ Not found'} · DKIM: ${d.dkimVerified ? '✓ Verified' : '✗ Not found'}`,
      }));
      setDomains((prev) => prev.map((dom) =>
        dom.id === id ? { ...dom, spfVerified: d.spfVerified, dkimVerified: d.dkimVerified } : dom
      ));
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteDomain(id);
      setDomains((prev) => prev.filter((d) => d.id !== id));
    });
  }

  return (
    <div className="space-y-4">
      {/* DNS instructions after registration */}
      {dnsInstructions && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm">
          <p className="mb-2 font-semibold text-blue-800">
            Add these DNS records for {dnsInstructions.domain}
          </p>
          <div className="space-y-3">
            <DnsRecord
              type="TXT"
              host={dnsInstructions.domain}
              value='v=spf1 include:resend.com ~all'
              label="SPF Record"
            />
            <DnsRecord
              type="TXT"
              host={`${dnsInstructions.dkimSelector}._domainkey.${dnsInstructions.domain}`}
              value={dnsInstructions.dnsValue}
              label="DKIM Record"
            />
          </div>
          <p className="mt-3 text-xs text-blue-600">
            DNS changes can take up to 48h to propagate. Click Verify after adding.
          </p>
          <button
            onClick={() => setDnsInstructions(null)}
            className="mt-2 text-xs underline text-blue-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Register new domain */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="yourdomain.com"
          disabled={isPending}
          className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        />
        <button
          onClick={handleRegister}
          disabled={isPending || !newDomain.trim()}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Adding...' : 'Add domain'}
        </button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Domain list */}
      {domains.length === 0 ? (
        <p className="text-sm text-muted-foreground">No domains registered yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {domains.map((d) => (
            <div key={d.id}>
              <div
                className="flex cursor-pointer items-center justify-between px-4 py-3 hover:bg-muted/30"
                onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{d.domain}</p>
                  <p className="text-xs text-muted-foreground">
                    SPF: {d.spfVerified ? '✓' : '✗'} · DKIM: {d.dkimVerified ? '✓' : '✗'} · Rep: {d.reputationScore}/100
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <AuthBadge spf={d.spfVerified} dkim={d.dkimVerified} />
                  <span className="text-xs text-muted-foreground">{expandedId === d.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expandedId === d.id && (
                <div className="border-t border-border bg-muted/20 px-4 py-4 space-y-3">
                  <DnsRecord
                    type="TXT"
                    host={d.domain}
                    value="v=spf1 include:resend.com ~all"
                    label="SPF Record"
                  />
                  <DnsRecord
                    type="TXT"
                    host={`${d.dkimSelector}._domainkey.${d.domain}`}
                    value={`v=DKIM1; k=rsa; p=${d.dkimPublicKey}`}
                    label="DKIM Record"
                  />
                  {verifyMsg[d.id] && (
                    <p className="text-xs text-muted-foreground">{verifyMsg[d.id]}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerify(d.id)}
                      disabled={isPending}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {isPending ? 'Checking...' : 'Verify DNS'}
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      disabled={isPending}
                      className="rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DnsRecord({ type, host, value, label }: { type: string; host: string; value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="rounded border border-border bg-white p-3 text-xs">
      <p className="mb-1 font-semibold text-foreground">{label}</p>
      <p><span className="text-muted-foreground">Type:</span> {type}</p>
      <p className="break-all"><span className="text-muted-foreground">Host:</span> {host}</p>
      <p className="break-all"><span className="text-muted-foreground">Value:</span> {value.slice(0, 60)}{value.length > 60 ? '…' : ''}</p>
      <button onClick={() => copy(value)} className="mt-1 text-xs text-primary underline">
        {copied ? 'Copied!' : 'Copy value'}
      </button>
    </div>
  );
}

function AuthBadge({ spf, dkim }: { spf: boolean; dkim: boolean }) {
  if (spf && dkim) return <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Verified</span>;
  if (spf || dkim) return <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Partial</span>;
  return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Not verified</span>;
}
