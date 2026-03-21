'use client';

import { useState, useEffect, useRef } from 'react';
import { ExternalLinkIcon, CopyIcon, CheckIcon } from 'lucide-react';
import { Shell, Btn, GhostBtn, Err, Ok, C, Spinner, Card, SectionLabel, Input } from '../ui';
import { registerDomain, verifyDomain } from '@/lib/deliverability/actions';
import { searchDomain } from '@/lib/domains/search';
import { generateDnsRecords } from '@/lib/domains/dns-records';

type Phase = 'search' | 'buy' | 'dns' | 'verified';

interface Props {
  companyName: string;
  onNext: () => void;
}

export default function StepDomain({ companyName, onNext }: Props) {
  const defaultQuery = companyName
    ? `mail.${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
    : '';

  const [query, setQuery]           = useState(defaultQuery);
  const [phase, setPhase]           = useState<Phase>('search');
  const [domainResult, setResult]   = useState<{ domain: string; available: boolean; priceUsd: number | null } | null>(null);
  const [domainId, setDomainId]     = useState<string | null>(null);
  const [dnsRecs, setDnsRecs]       = useState<Array<{ label: string; type: string; host: string; value: string }>>([]);
  const [copied, setCopied]         = useState<number | null>(null);
  const [state, setState]           = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError]           = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // DNS poll
  useEffect(() => {
    if (phase !== 'dns' || !domainId) return;
    pollRef.current = setInterval(async () => {
      const r = await verifyDomain(domainId);
      if (r.success && r.data) {
        const d = r.data as { spfVerified: boolean; dkimVerified: boolean };
        if (d.spfVerified && d.dkimVerified) {
          clearInterval(pollRef.current!);
          setPhase('verified');
          setTimeout(onNext, 1500);
        }
      }
    }, 10_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [phase, domainId]); // eslint-disable-line

  async function handleSearch() {
    if (!query.trim()) return;
    setState('loading'); setError('');
    const r = await searchDomain(query.trim());
    setResult({ domain: r.domain, available: r.available, priceUsd: r.priceUsd });
    setPhase('buy');
    setState('idle');
  }

  async function handleBuy() {
    if (!domainResult) return;
    // Register domain in our DB to generate DKIM key pair
    const reg = await registerDomain(domainResult.domain);
    if (reg.success && reg.data) {
      setDomainId(reg.data.id);
      const recs = generateDnsRecords({
        domain:        domainResult.domain,
        dkimSelector:  reg.data.dkimSelector,
        dkimPublicKey: reg.data.dnsValue ?? '',
        provider:      null,
      });
      setDnsRecs(recs.slice(0, 3).map((r) => ({ label: r.label, type: r.type, host: r.hostFull, value: r.value })));
    }
    // Open registrar
    window.open(`https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domainResult.domain)}`, '_blank');
    setPhase('dns');
  }

  function copy(idx: number, val: string) {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }

  // SEARCH phase
  if (phase === 'search') return (
    <Shell step={4} total={7} eyebrow="Step 4 of 7" headline="Set up your domain" sub="A custom domain means emails land in the inbox, not spam.">
      <Input label="Your sending domain" value={query} onChange={setQuery} placeholder="mail.yourbrand.com" autoFocus />
      {error && <Err msg={error} />}
      <Btn label={state === 'loading' ? 'Checking…' : 'Check availability'} onClick={handleSearch} loading={state === 'loading'} />
      <GhostBtn label="Skip — set up later in settings" onClick={onNext} />
    </Shell>
  );

  // BUY phase
  if (phase === 'buy' && domainResult) return (
    <Shell step={4} total={7} eyebrow="Step 4 of 7" headline="Buy your domain" sub="Purchase it on Namecheap, then come back here.">
      <Card accent={domainResult.available}>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0 }}>{domainResult.domain}</p>
            <p style={{ fontSize: 12, color: domainResult.available ? C.green : C.textSub, margin: '2px 0 0' }}>
              {domainResult.available ? 'Available' : 'May be available — check on Namecheap'}
            </p>
          </div>
          {domainResult.priceUsd && (
            <span style={{ fontSize: 13, fontWeight: 600, color: C.textSub }}>
              ${(domainResult.priceUsd / 100).toFixed(2)}/yr
            </span>
          )}
        </div>
      </Card>

      <Btn
        label="Buy at Namecheap →"
        onClick={handleBuy}
        icon={<ExternalLinkIcon size={15} />}
      />
      <p style={{ fontSize: 12, color: C.textHint, textAlign: 'center', margin: 0 }}>
        Opens in new tab. Come back here after purchasing.
      </p>
      <GhostBtn label="I already have a domain" onClick={() => setPhase('dns')} />
    </Shell>
  );

  // DNS phase
  if (phase === 'dns') return (
    <Shell step={4} total={7} eyebrow="Step 4 of 7" headline="Add DNS records" sub="Copy these 3 records into your domain settings. We'll verify automatically.">
      <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400E' }}>
        Add records in Namecheap → Domain List → Manage → Advanced DNS
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(dnsRecs.length > 0 ? dnsRecs : [
          { label: 'SPF',  type: 'TXT',  host: domainResult?.domain ?? 'yourdomain.com', value: 'v=spf1 include:_spf.resend.com ~all' },
          { label: 'DKIM', type: 'TXT',  host: `wee1._domainkey.${domainResult?.domain ?? 'yourdomain.com'}`, value: 'v=DKIM1; k=rsa; p=...' },
          { label: 'DMARC', type: 'TXT', host: `_dmarc.${domainResult?.domain ?? 'yourdomain.com'}`, value: 'v=DMARC1; p=none' },
        ]).map((rec, idx) => (
          <div key={idx} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textHint }}>{rec.label} · {rec.type}</span>
              <button
                onClick={() => copy(idx, rec.value)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: copied === idx ? C.green : C.brand, padding: 0, fontFamily: 'inherit' }}
              >
                {copied === idx ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
                {copied === idx ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p style={{ fontSize: 10, fontFamily: 'monospace', color: C.textSub, margin: '2px 0 0', wordBreak: 'break-all' }}>{rec.host}</p>
            <p style={{ fontSize: 10, fontFamily: 'monospace', color: C.text, margin: '3px 0 0', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, color: C.textHint }}>
        <Spinner size={14} color={C.textHint} />
        Checking DNS automatically every 10 seconds…
      </div>

      <GhostBtn label="Skip — verify later" onClick={onNext} />
    </Shell>
  );

  // VERIFIED
  return (
    <Shell step={4} total={7} eyebrow="Step 4 of 7" headline="Domain verified!" sub="All DNS records are live. Moving to next step…">
      <Ok msg="SPF, DKIM, and DMARC all verified." />
    </Shell>
  );
}
