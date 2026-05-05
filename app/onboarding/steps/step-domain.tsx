'use client';

/**
 * app/onboarding/steps/step-domain.tsx
 *
 * Phase flow:
 *   search → [available] buy | [taken] try-again
 *   buy    → dns
 *   dns    → verified (auto-advances after polling)
 *   verified → sender (pick prefix@domain)
 *   sender → calls onNext()
 *
 * Changes from previous version:
 *   - DNS records now come from Resend (real, accurate) not homebrew DKIM
 *   - verifyDomain() now polls Resend API status instead of raw DNS TXT
 *   - After verification, shows sender address picker inline (prefix@domain)
 *   - Availability check via RDAP is unchanged
 *   - Buy link uses Namecheap with domain pre-filled in search
 */

import { useState, useEffect, useRef } from 'react';
import { ExternalLinkIcon, CopyIcon, CheckIcon, SearchIcon, ArrowRightIcon } from 'lucide-react';
import { Shell, Btn, GhostBtn, Err, Ok, C, Spinner, Input } from '../ui';
import { registerDomain, verifyDomain, saveSenderAddress } from '@/lib/deliverability/actions';
import { searchDomain } from '@/lib/domains/search';

type Phase = 'search' | 'checking' | 'available' | 'taken' | 'buy' | 'dns' | 'verified' | 'sender';

interface FlatRecord {
  label: string;
  type:  string;
  host:  string;
  value: string;
}

interface Props {
  companyName: string;
  onNext: (fromEmail?: string) => void;
}

export default function StepDomain({ companyName, onNext }: Props) {
  const suggested = companyName
    ? `mail.${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`
    : '';

  const [query,       setQuery]       = useState(suggested);
  const [phase,       setPhase]       = useState<Phase>('search');
  const [domain,      setDomain]      = useState('');
  const [domainId,    setDomainId]    = useState<string | null>(null);
  const [dnsRecords,  setDnsRecords]  = useState<FlatRecord[]>([]);
  const [copied,      setCopied]      = useState<number | null>(null);
  const [error,       setError]       = useState('');
  const [prefix,      setPrefix]      = useState('hello');
  const [saving,      setSaving]      = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── DNS polling ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'dns' || !domainId) return;
    pollRef.current = setInterval(async () => {
      const r = await verifyDomain(domainId);
      if (r.success && r.data) {
        const d = r.data as { allVerified: boolean };
        if (d.allVerified) {
          clearInterval(pollRef.current!);
          setPhase('verified');
          // Short pause before advancing to sender picker
          setTimeout(() => setPhase('sender'), 1200);
        }
      }
    }, 10_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [phase, domainId]);

  // ── Check availability ─────────────────────────────────────────────────────
  async function handleCheck() {
    if (!query.trim()) return;
    setError('');
    setPhase('checking');
    try {
      const r = await searchDomain(query.trim());
      setDomain(r.domain);
      setPhase(r.available ? 'available' : 'taken');
    } catch {
      setError('Could not check availability. Try again.');
      setPhase('search');
    }
  }

  // ── User clicks "Buy on Namecheap" — register domain in Resend first ───────
  async function handleBuy() {
    setError('');
    setPhase('buy');

    // Register with Resend to get real DNS records
    const reg = await registerDomain(domain);
    if (reg.success && reg.data) {
      setDomainId(reg.data.id);
      setDnsRecords(reg.data.records as FlatRecord[]);
    }
    // Open Namecheap in new tab
    window.open(
      `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`,
      '_blank', 'noopener'
    );
    // Move to DNS step immediately
    setPhase('dns');
  }

  // ── User already owns the domain — skip to DNS setup ──────────────────────
  async function handleAlreadyOwn() {
    setError('');
    const reg = await registerDomain(domain);
    if (reg.success && reg.data) {
      setDomainId(reg.data.id);
      setDnsRecords(reg.data.records as FlatRecord[]);
    }
    setPhase('dns');
  }

  function copy(idx: number, val: string) {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  }

  // ── Save sender address ────────────────────────────────────────────────────
  async function handleSaveSender() {
    if (!prefix.trim() || !domainId) { onNext(); return; }
    setSaving(true);
    const r = await saveSenderAddress(prefix.trim(), domainId);
    setSaving(false);
    if (r.success) {
      onNext(r.fromEmail);
    } else {
      setError(r.error ?? 'Failed to save sender address.');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH phase
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'search' || phase === 'checking') return (
    <Shell step={4} total={7} eyebrow="Step 4 of 7"
      headline="Set up your sending domain"
      sub="A custom domain keeps emails out of spam and lets you send from hello@yourbrand.com."
    >
      <Input
        label="Your sending domain"
        value={query}
        onChange={setQuery}
        placeholder="mail.yourbrand.com"
        autoFocus
        disabled={phase === 'checking'}
      />
      {error && <Err msg={error} />}
      <Btn
        label={phase === 'checking' ? 'Checking…' : 'Check availability'}
        onClick={handleCheck}
        loading={phase === 'checking'}
        icon={<SearchIcon size={15} />}
      />
      <GhostBtn label="Skip — set up later in settings" onClick={() => onNext()} />
    </Shell>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // AVAILABLE phase
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'available') return (
    <Shell step={4} total={7} eyebrow="Step 4 of 7"
      headline="That domain is available"
      sub="Buy it on Namecheap, then come back here. Takes 2 minutes."
    >
      {/* Domain result card */}
      <div style={{
        background: C.greenBg, border: `1px solid ${C.greenBorder}`,
        borderRadius: 10, padding: '14px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0 }}>{domain}</p>
          <p style={{ fontSize: 12, color: C.green, margin: '2px 0 0' }}>✓ Available</p>
        </div>
        <CheckIcon size={18} color={C.green} />
      </div>

      <Btn
        label="Buy on Namecheap →"
        onClick={handleBuy}
        icon={<ExternalLinkIcon size={15} />}
      />
      <p style={{ fontSize: 12, color: C.textHint, textAlign: 'center', margin: 0 }}>
        Opens Namecheap in a new tab. Come back here after purchasing.
      </p>
      <GhostBtn label="I already own this domain" onClick={handleAlreadyOwn} />
    </Shell>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // TAKEN phase
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'taken') return (
    <Shell step={4} total={7} eyebrow="Step 4 of 7"
      headline="That domain is taken"
      sub="Try a different name or subdomain, or use a domain you already own."
    >
      <div style={{
        background: '#FFF7ED', border: '1px solid #FCD34D',
        borderRadius: 10, padding: '14px 18px',
      }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: C.text, margin: 0 }}>{domain}</p>
        <p style={{ fontSize: 12, color: C.amber, margin: '2px 0 0' }}>Not available</p>
      </div>

      <Input
        label="Try a different domain"
        value={query}
        onChange={setQuery}
        placeholder="mail.yourbrand.com"
        autoFocus
      />
      <Btn
        label="Check availability"
        onClick={handleCheck}
        icon={<SearchIcon size={15} />}
      />
      <GhostBtn label="I already own a domain" onClick={() => {
        setDomain(query.trim() || domain);
        handleAlreadyOwn();
      }} />
      <GhostBtn label="Skip — set up later" onClick={() => onNext()} />
    </Shell>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // BUY transition phase (brief — registers with Resend then moves to DNS)
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'buy') return (
    <Shell step={4} total={7} eyebrow="Step 4 of 7" headline="Setting up your domain…">
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Spinner size={36} />
        <p style={{ fontSize: 14, color: C.textSub, margin: '14px 0 0' }}>
          Preparing DNS records…
        </p>
      </div>
    </Shell>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // DNS phase — show real Resend records, poll every 10s
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'dns') return (
    <Shell step={4} total={7} eyebrow="Step 4 of 7"
      headline="Add these DNS records"
      sub="Paste them into your domain's DNS settings. We'll detect them automatically."
    >
      <div style={{
        background: '#FFFBEB', border: '1px solid #FCD34D',
        borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400E',
      }}>
        In Namecheap: Domain List → Manage → Advanced DNS → Add New Record
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(dnsRecords.length > 0 ? dnsRecords : [
          { label: 'SPF',  type: 'TXT', host: domain || 'yourdomain.com', value: 'v=spf1 include:_spf.resend.com ~all' },
          { label: 'DKIM', type: 'TXT', host: `resend._domainkey.${domain || 'yourdomain.com'}`, value: 'Loading…' },
          { label: 'DMARC', type: 'TXT', host: `_dmarc.${domain || 'yourdomain.com'}`, value: 'v=DMARC1; p=none;' },
        ]).map((rec, idx) => (
          <div key={idx} style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textHint }}>
                {rec.label} · {rec.type}
              </span>
              <button
                onClick={() => copy(idx, rec.value)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, color: copied === idx ? C.green : C.brand,
                  padding: 0, fontFamily: 'inherit',
                }}
              >
                {copied === idx ? <CheckIcon size={11} /> : <CopyIcon size={11} />}
                {copied === idx ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p style={{ fontSize: 10, fontFamily: 'monospace', color: C.textSub, margin: '2px 0 0', wordBreak: 'break-all' }}>
              {rec.host}
            </p>
            <p style={{ fontSize: 10, fontFamily: 'monospace', color: C.text, margin: '3px 0 0', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {rec.value}
            </p>
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px', background: C.bg,
        borderRadius: 8, border: `1px solid ${C.border}`,
        fontSize: 13, color: C.textHint,
      }}>
        <Spinner size={14} color={C.textHint} />
        Checking for DNS records automatically every 10 seconds…
      </div>

      <GhostBtn label="Skip — verify later in settings" onClick={() => onNext()} />
    </Shell>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // VERIFIED transition
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'verified') return (
    <Shell step={4} total={7} eyebrow="Step 4 of 7" headline="Domain verified!">
      <Ok msg="All DNS records confirmed. Setting up your sender address…" />
    </Shell>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // SENDER ADDRESS phase — pick prefix@domain
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === 'sender') return (
    <Shell step={4} total={7} eyebrow="Step 4 of 7"
      headline="Choose your sender address"
      sub="This is the From address your subscribers will see."
    >
      {/* Prefix @ domain picker */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 10, overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, background: C.bg }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textHint }}>
            Sender address preview
          </span>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 0 }}>
          {/* Prefix input */}
          <input
            type="text"
            value={prefix}
            onChange={(e) => {
              setPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''));
              setError('');
            }}
            placeholder="hello"
            autoFocus
            style={{
              flex: '0 0 auto', width: 110,
              padding: '10px 12px', fontSize: 15, fontWeight: 500,
              border: `1.5px solid ${error ? C.red : C.brand}`,
              borderRight: 'none',
              borderRadius: '8px 0 0 8px', outline: 'none',
              background: C.card, color: C.text, fontFamily: 'inherit',
            }}
          />
          {/* @ domain */}
          <div style={{
            flex: 1, padding: '10px 12px', fontSize: 15,
            background: C.bg, border: `1.5px solid ${C.border}`,
            borderLeft: 'none', borderRadius: '0 8px 8px 0',
            color: C.textSub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            @{domain}
          </div>
        </div>
      </div>

      {/* Suggestions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['hello', 'team', 'news', 'support', 'hi'].map((s) => (
          <button
            key={s}
            onClick={() => setPrefix(s)}
            style={{
              padding: '5px 12px', borderRadius: 99, border: 'none',
              cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
              background: prefix === s ? C.brand : C.bg,
              color: prefix === s ? '#fff' : C.textSub,
              outline: prefix !== s ? `1px solid ${C.border}` : 'none',
              transition: 'all 0.15s',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {error && <Err msg={error} />}

      <Btn
        label={saving ? 'Saving…' : `Use ${prefix || 'hello'}@${domain}`}
        onClick={handleSaveSender}
        loading={saving}
        icon={<ArrowRightIcon size={15} />}
      />
      <GhostBtn label="Skip — set later in settings" onClick={() => onNext()} />
    </Shell>
  );

  return null;
}
