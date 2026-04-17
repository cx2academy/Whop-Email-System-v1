'use client';

/**
 * app/onboarding/onboarding-flow.tsx
 *
 * The full 7-step RevTray onboarding flow.
 *
 * Design principles applied:
 *   - One action per screen
 *   - Centered focus layout — no chrome, no distractions
 *   - Every field pre-filled from available data
 *   - System does heavy lifting; user confirms
 *   - Auto-advance when no decision needed (step 5: sync)
 *   - Loading / success / error states on every step
 *   - Hidden complexity stays hidden
 *
 * Steps:
 *   1. Connect Whop (API key → validate → fetch company name)
 *   2. Confirm branding (name + color, pre-filled from Whop)
 *   3. Sender name (pre-filled, inbox preview)
 *   4. Domain setup (search → buy → DNS records → verify)
 *   5. Import contacts (auto-runs, progress screen)
 *   6. Build AI sequence (3 fields → generates 5 campaigns)
 *   7. You're live (send first email)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckIcon, ArrowRightIcon, LoaderIcon, SparklesIcon,
  AlertCircleIcon, ExternalLinkIcon, ChevronDownIcon,
  CopyIcon, CheckCircleIcon,
} from 'lucide-react';
import { Logo } from '@/components/ui/logo';

// Server actions
import { saveWhopApiKey, saveSenderEmail, triggerOnboardingSync } from '@/lib/onboarding/actions';
import { saveBranding } from '@/lib/branding/actions';
import { registerDomain, verifyDomain } from '@/lib/deliverability/actions';
import { searchDomain } from '@/lib/domains/search';
import { generateDnsRecords } from '@/lib/domains/dns-records';
import { createWorkspace } from '@/lib/workspace/actions';
import { buildCampaignSequence, generateEmailDraft, type CampaignBrief } from '@/lib/ai/actions';
import { materializeSequence } from '@/lib/ai/sequence-materializer';
import { sendCampaignNow } from '@/lib/campaigns/actions';
import { db } from '@/lib/db/client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  workspaceId:  string | null;
  userEmail:    string;
  userName:     string;
  startStep:    number;
  initialData: {
    whopCompanyName: string | null;
    logoUrl:         string | null;
    brandColor:      string;
    fromName:        string | null;
    fromEmail:       string | null;
    contactCount:    number;
  };
}

type StepState = 'idle' | 'loading' | 'success' | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens (RevTray light theme)
// ─────────────────────────────────────────────────────────────────────────────

const T = {
  brand:        '#22C55E',
  brandHover:   '#16A34A',
  brandTint:    'rgba(34,197,94,0.08)',
  brandTintMd:  'rgba(34,197,94,0.14)',
  textPrimary:  '#0D0F12',
  textSecondary:'#5A6472',
  textTertiary: '#9AA3AF',
  surface:      '#F7F8FA',
  card:         '#FFFFFF',
  border:       '#E6E8EC',
  red:          '#DC2626',
  redBg:        '#FEF2F2',
  redBorder:    '#FCA5A5',
  amber:        '#D97706',
  amberBg:      '#FFFBEB',
  green:        '#16A34A',
  greenBg:      '#F0FDF4',
  greenBorder:  '#BBF7D0',
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared micro-components
// ─────────────────────────────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current - 1 ? 20 : 6,
            height: 6,
            borderRadius: 99,
            background: i < current - 1 ? T.brand : i === current - 1 ? T.brand : T.border,
            opacity: i < current - 1 ? 0.4 : 1,
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

function Spinner({ size = 16, color = T.brand }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2.5" strokeOpacity="0.2"/>
      <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

function PrimaryBtn({ label, onClick, loading, disabled, icon }: {
  label: string; onClick?: () => void; loading?: boolean;
  disabled?: boolean; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        background: loading || disabled ? '#9AA3AF' : T.brand,
        color: '#fff', border: 'none', borderRadius: 10,
        padding: '13px 28px', fontSize: 15, fontWeight: 600,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s', width: '100%',
        boxShadow: loading || disabled ? 'none' : '0 2px 12px rgba(34,197,94,0.25)',
      }}
      onMouseEnter={(e) => { if (!loading && !disabled) (e.currentTarget as HTMLButtonElement).style.background = T.brandHover; }}
      onMouseLeave={(e) => { if (!loading && !disabled) (e.currentTarget as HTMLButtonElement).style.background = T.brand; }}
    >
      {loading ? <Spinner size={16} color="#fff" /> : icon}
      {label}
    </button>
  );
}

function InputField({ label, value, onChange, type = 'text', placeholder, hint, autoFocus }: {
  label?: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string; autoFocus?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: T.textSecondary }}>{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '12px 14px', fontSize: 15,
          border: `1.5px solid ${focused ? T.brand : T.border}`,
          borderRadius: 8, outline: 'none', background: T.card,
          color: T.textPrimary, fontFamily: "'DM Sans', system-ui, sans-serif",
          transition: 'border-color 0.15s', boxSizing: 'border-box',
        }}
      />
      {hint && <p style={{ fontSize: 12, color: T.textTertiary, margin: 0 }}>{hint}</p>}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 8,
      background: T.redBg, border: `1px solid ${T.redBorder}`,
      fontSize: 13, color: T.red,
    }}>
      <AlertCircleIcon size={14} style={{ flexShrink: 0 }} />
      {msg}
    </div>
  );
}

function SuccessMsg({ msg }: { msg: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 8,
      background: T.greenBg, border: `1px solid ${T.greenBorder}`,
      fontSize: 13, color: T.green,
    }}>
      <CheckIcon size={14} style={{ flexShrink: 0 }} />
      {msg}
    </div>
  );
}

function SkipLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: T.textTertiary, padding: '4px 0', fontFamily: 'inherit' }}
    >
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step wrapper
// ─────────────────────────────────────────────────────────────────────────────

function StepShell({ step, total, eyebrow, headline, sub, children }: {
  step: number; total: number;
  eyebrow?: string; headline: string; sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      key={step}
      style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
        animation: 'fadeUp 0.3s ease forwards',
      }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 28px',
        background: 'rgba(247,248,250,0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${T.border}`,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo size={28} />
          <span style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", fontSize: 16, fontWeight: 700, color: T.textPrimary, letterSpacing: '-0.03em' }}>
            RevTray
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <StepDots current={step} total={total} />
          <span style={{ fontSize: 11, color: T.textTertiary }}>{step} of {total}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ width: '100%', maxWidth: 480, marginTop: 72 }}>
        {eyebrow && (
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.brand, marginBottom: 12 }}>
            {eyebrow}
          </p>
        )}
        <h1 style={{
          fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
          fontSize: 'clamp(26px, 4vw, 34px)', fontWeight: 700,
          color: T.textPrimary, letterSpacing: '-0.035em',
          lineHeight: 1.1, margin: '0 0 10px',
        }}>
          {headline}
        </h1>
        {sub && (
          <p style={{ fontSize: 15, color: T.textSecondary, lineHeight: 1.65, margin: '0 0 32px' }}>
            {sub}
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main flow
// ─────────────────────────────────────────────────────────────────────────────

export function OnboardingFlow({ workspaceId: initialWorkspaceId, userEmail, userName, startStep, initialData }: OnboardingFlowProps) {
  const router = useRouter();
  const TOTAL = 7;

  const [step, setStep]           = useState(startStep);
  const [workspaceId, setWsId]    = useState(initialWorkspaceId);
  const [state, setState]         = useState<StepState>('idle');
  const [error, setError]         = useState('');

  // Step 1 state
  const [apiKey, setApiKey]       = useState('');

  // Step 2 state
  const [companyName, setCompanyName] = useState(initialData.whopCompanyName ?? '');
  const [brandColor, setBrandColor]   = useState(initialData.brandColor ?? '#22C55E');
  const [showEditBrand, setShowEditBrand] = useState(false);

  // Step 3 state
  const [fromName, setFromName]   = useState(initialData.fromName ?? initialData.whopCompanyName ?? userName);

  // Step 4 state
  const [domainQuery, setDomainQuery] = useState('');
  const [domainResult, setDomainResult] = useState<{ domain: string; available: boolean; priceUsd: number | null } | null>(null);
  const [dnsRecords, setDnsRecords]    = useState<Array<{ label: string; type: string; host: string; value: string }>>([]);
  const [dnsVerified, setDnsVerified]  = useState(false);
  const [domainStep, setDomainStep]    = useState<'search' | 'buy' | 'dns' | 'verified'>('search');
  const [domainId, setDomainId]        = useState<string | null>(null);
  const [copiedIdx, setCopiedIdx]      = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 5 state
  const [importCount, setImportCount] = useState(initialData.contactCount);

  // Step 6 state
  const [seqProduct,  setSeqProduct]  = useState('');
  const [seqAudience, setSeqAudience] = useState('');
  const [seqGoal,     setSeqGoal]     = useState('');
  const [campaignId,  setCampaignId]  = useState<string | null>(null);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function advance() {
    setError('');
    setState('idle');
    setStep((s) => Math.min(TOTAL, s + 1));
  }

  function clearError() { setError(''); }

  // Auto-suggest domain from company name
  useEffect(() => {
    if (step === 4 && companyName && !domainQuery) {
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
      setDomainQuery(`mail.${slug}.com`);
    }
  }, [step, companyName, domainQuery]);

  // Auto-run sync on step 5
  useEffect(() => {
    if (step !== 5) return;
    setState('loading');

    triggerOnboardingSync().then((result) => {
      if (result.success) {
        // Poll for count until we see contacts
        let ticks = 0;
        const poll = setInterval(async () => {
          ticks++;
          // After 2s, advance even if count is still 0 (could be async)
          if (ticks >= 5) {
            clearInterval(poll);
            setState('success');
            setTimeout(advance, 1500);
          }
        }, 1000);
      } else {
        setState('error');
        setError(result.error ?? 'Sync failed. Check your Whop API key.');
      }
    });
  }, [step]); // eslint-disable-line

  // DNS polling on step 4
  useEffect(() => {
    if (domainStep !== 'dns' || !domainId || !workspaceId) return;
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      const result = await verifyDomain(domainId);
      if (result.success && result.data?.allVerified) {
        clearInterval(pollRef.current!);
        setDnsVerified(true);
        setDomainStep('verified');
        setTimeout(advance, 1500);
      }
    }, 8000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [domainStep, domainId, workspaceId]); // eslint-disable-line

  // ── Step handlers ─────────────────────────────────────────────────────────

  async function handleConnectWhop() {
    if (!apiKey.trim()) { setError('Please paste your Whop API key.'); return; }
    setState('loading'); clearError();

    try {
      // Create workspace if needed
      let wsId = workspaceId;
      if (!wsId) {
        const formData = new FormData();
        formData.set('name', 'My Workspace');
        const wsResult = await createWorkspace(formData);
        if (!wsResult.success) { setState('error'); setError(wsResult.error ?? 'Failed to create workspace.'); return; }
        // Hard refresh to get new JWT with workspaceId
        window.location.href = `/api/auth/refresh?callbackUrl=/onboarding`;
        return;
      }

      const result = await saveWhopApiKey(apiKey.trim());
      if (!result.success) { setState('error'); setError(result.error ?? 'Invalid API key.'); return; }

      const fetched = result.data?.whopCompanyName as string | undefined;
      if (fetched) setCompanyName(fetched);
      if (fetched) setFromName(fetched);

      setState('success');
      setTimeout(advance, 800);
    } catch {
      setState('error');
      setError('Something went wrong. Try again.');
    }
  }

  async function handleConfirmBranding() {
    setState('loading'); clearError();
    try {
      await saveBranding({ whopCompanyName: companyName, brandColor, fromName: fromName || companyName });
      setState('success');
      setTimeout(advance, 600);
    } catch {
      setState('error');
      setError('Failed to save. Try again.');
    }
  }

  async function handleConfirmSenderName() {
    if (!fromName.trim()) { setError('Please enter a sender name.'); return; }
    setState('loading'); clearError();
    try {
      await saveSenderEmail(userEmail);
      await saveBranding({ fromName: fromName.trim() });
      setState('success');
      setTimeout(advance, 600);
    } catch {
      setState('error');
      setError('Failed to save. Try again.');
    }
  }

  async function handleDomainSearch() {
    if (!domainQuery.trim()) return;
    setState('loading'); clearError();
    try {
      const result = await searchDomain(domainQuery.trim());
      setDomainResult({ domain: result.domain, available: result.available, priceUsd: result.priceUsd });
      setDomainStep('buy');
      setState('idle');
    } catch {
      setState('error');
      setError('Could not check domain. Try again.');
    }
  }

  function handleOpenRegistrar() {
    if (!domainResult) return;
    const url = `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domainResult.domain)}`;
    window.open(url, '_blank');
    // Register domain internally to get DNS records
    handleRegisterDomain();
    setDomainStep('dns');
  }

  async function handleRegisterDomain() {
    if (!domainResult || !workspaceId) return;
    try {
      const result = await registerDomain(domainResult.domain);
      if (result.success && result.data) {
        setDomainId(result.data.id);
        const records = generateDnsRecords({
          domain:        domainResult.domain,
          dkimSelector:  result.data.dkimSelector,
          dkimPublicKey: result.data.dnsValue ?? '',
          provider:      null,
        });
        setDnsRecords(records.map((r) => ({ label: r.label, type: r.type, host: r.hostFull, value: r.value })));
      }
    } catch { /* non-fatal */ }
  }

  function copyRecord(idx: number, value: string) {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  async function handleBuildSequence() {
    if (!seqProduct.trim() || !seqAudience.trim() || !seqGoal.trim()) {
      setError('Fill in all three fields.');
      return;
    }
    setState('loading'); clearError();
    try {
      const brief: CampaignBrief = {
        product: seqProduct, audience: seqAudience,
        tone: 'friendly', goal: seqGoal,
      };
      const seqResult = await buildCampaignSequence(seqProduct, seqAudience, seqGoal);
      if (!seqResult.success) { setState('error'); setError(seqResult.error); return; }

      const matResult = await materializeSequence({ sequence: seqResult.data as any, brief, audienceTagIds: [] });
      if (!matResult.success) { setState('error'); setError(matResult.error ?? 'Failed to create campaigns.'); return; }

      const firstId = matResult.data?.campaigns[0]?.id;
      if (firstId) setCampaignId(firstId);

      setState('success');
      setTimeout(advance, 1000);
    } catch {
      setState('error');
      setError('AI generation failed. Try again.');
    }
  }

  async function handleSendNow() {
    if (!campaignId) { router.push('/dashboard/campaigns'); return; }
    setState('loading'); clearError();
    try {
      const result = await sendCampaignNow(campaignId);
      if (result.success) {
        setState('success');
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        setState('error');
        setError((result as any).error ?? 'Send failed. Go to campaigns to retry.');
      }
    } catch {
      setState('error');
      setError('Send failed. You can send from the campaigns page.');
    }
  }

  // ── Step renders ─────────────────────────────────────────────────────────

  // STEP 1 — Connect Whop
  if (step === 1) return (
    <StepShell
      step={1} total={TOTAL}
      eyebrow="Step 1 of 7"
      headline="Connect your Whop account"
      sub="We'll import your community automatically. Your key is encrypted and never shared."
    >
      <InputField
        label="Whop API key"
        type="password"
        value={apiKey}
        onChange={setApiKey}
        placeholder="Paste your key here"
        autoFocus
      />

      <a
        href="https://whop.com/settings"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: T.brand, textDecoration: 'none' }}
      >
        Get your key at whop.com/settings <ExternalLinkIcon size={12} />
      </a>

      {state === 'error' && <ErrorMsg msg={error} />}
      {state === 'success' && <SuccessMsg msg="Connected! Loading your brand…" />}

      <PrimaryBtn
        label={state === 'loading' ? 'Connecting…' : 'Connect Whop'}
        onClick={handleConnectWhop}
        loading={state === 'loading'}
        disabled={state === 'success'}
        icon={<ArrowRightIcon size={16} />}
      />
    </StepShell>
  );

  // STEP 2 — Confirm branding
  if (step === 2) return (
    <StepShell
      step={2} total={TOTAL}
      eyebrow="Step 2 of 7"
      headline={companyName ? `Is this your brand?` : 'Confirm your brand'}
      sub="We pulled this from your Whop account. Confirm to continue."
    >
      {/* Brand preview card */}
      <div style={{
        background: T.card, border: `1px solid ${T.border}`, borderRadius: 12,
        padding: '20px 20px', display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 10,
          background: brandColor + '22', border: `2px solid ${brandColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color: brandColor,
          fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
          flexShrink: 0,
        }}>
          {companyName?.[0]?.toUpperCase() ?? 'B'}
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 600, color: T.textPrimary, margin: 0 }}>
            {companyName || 'Your Brand'}
          </p>
          <p style={{ fontSize: 12, color: T.textTertiary, margin: '2px 0 0' }}>
            From Whop account
          </p>
        </div>
      </div>

      {/* Edit toggle */}
      <button
        onClick={() => setShowEditBrand(!showEditBrand)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 13, color: T.textTertiary, fontFamily: 'inherit',
        }}
      >
        <ChevronDownIcon size={14} style={{ transform: showEditBrand ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        Edit name or color
      </button>

      {showEditBrand && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px', background: T.surface, borderRadius: 8, border: `1px solid ${T.border}` }}>
          <InputField label="Brand name" value={companyName} onChange={setCompanyName} placeholder="Your brand name" />
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: T.textSecondary, display: 'block', marginBottom: 6 }}>Brand color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                style={{ width: 40, height: 36, borderRadius: 6, border: `1px solid ${T.border}`, cursor: 'pointer', padding: 2 }}
              />
              <span style={{ fontSize: 13, color: T.textSecondary, fontFamily: 'monospace' }}>{brandColor}</span>
            </div>
          </div>
        </div>
      )}

      {state === 'error' && <ErrorMsg msg={error} />}
      {state === 'success' && <SuccessMsg msg="Brand saved!" />}

      <PrimaryBtn
        label={state === 'loading' ? 'Saving…' : "That's right →"}
        onClick={handleConfirmBranding}
        loading={state === 'loading'}
        disabled={state === 'success'}
      />
    </StepShell>
  );

  // STEP 3 — Sender name
  if (step === 3) return (
    <StepShell
      step={3} total={TOTAL}
      eyebrow="Step 3 of 7"
      headline="Who are emails from?"
      sub="This is what subscribers see in the 'From' field."
    >
      <InputField
        label="Your name or brand name"
        value={fromName}
        onChange={setFromName}
        placeholder={companyName || 'Your Name'}
        autoFocus
      />

      {/* Live inbox preview */}
      {fromName && (
        <div style={{
          background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 14px', borderBottom: `1px solid ${T.border}`, background: T.surface }}>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.textTertiary }}>
              Inbox preview
            </span>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: brandColor + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: brandColor, flexShrink: 0,
              }}>
                {fromName[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, margin: 0 }}>{fromName}</p>
                <p style={{ fontSize: 12, color: T.textTertiary, margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Your subject line · First line of email content...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {state === 'error' && <ErrorMsg msg={error} />}
      {state === 'success' && <SuccessMsg msg="Sender name saved!" />}

      <PrimaryBtn
        label={state === 'loading' ? 'Saving…' : 'Use this name →'}
        onClick={handleConfirmSenderName}
        loading={state === 'loading'}
        disabled={state === 'success'}
      />
    </StepShell>
  );

  // STEP 4 — Domain setup
  if (step === 4) return (
    <StepShell
      step={4} total={TOTAL}
      eyebrow="Step 4 of 7"
      headline={domainStep === 'verified' ? 'Domain verified!' : 'Set up your sending domain'}
      sub={
        domainStep === 'search' ? 'A custom domain means emails land in inbox, not spam.' :
        domainStep === 'buy'    ? `${domainResult?.available ? 'This domain is available.' : 'Alternative available.'} Buy it, then come back here.` :
        domainStep === 'dns'    ? 'Copy these 3 records into your domain DNS settings.' :
        'All DNS records verified. Your domain is ready.'
      }
    >
      {/* Search phase */}
      {domainStep === 'search' && (
        <>
          <InputField
            label="Your sending domain"
            value={domainQuery}
            onChange={setDomainQuery}
            placeholder="mail.yourbrand.com"
            autoFocus
          />
          {state === 'error' && <ErrorMsg msg={error} />}
          <PrimaryBtn
            label={state === 'loading' ? 'Checking…' : 'Check availability →'}
            onClick={handleDomainSearch}
            loading={state === 'loading'}
          />
          <SkipLink label="Skip for now — set up later in settings" onClick={advance} />
        </>
      )}

      {/* Buy phase */}
      {domainStep === 'buy' && domainResult && (
        <>
          <div style={{
            background: domainResult.available ? T.greenBg : T.amberBg,
            border: `1px solid ${domainResult.available ? T.greenBorder : '#FCD34D'}`,
            borderRadius: 10, padding: '16px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 600, color: T.textPrimary, margin: 0 }}>{domainResult.domain}</p>
              <p style={{ fontSize: 12, color: T.textSecondary, margin: '2px 0 0' }}>
                {domainResult.available ? 'Available' : 'Check availability on Namecheap'}
              </p>
            </div>
            {domainResult.priceUsd && (
              <span style={{ fontSize: 14, fontWeight: 600, color: T.textSecondary }}>
                ${(domainResult.priceUsd / 100).toFixed(2)}/yr
              </span>
            )}
          </div>

          <PrimaryBtn
            label="Buy at Namecheap →"
            onClick={handleOpenRegistrar}
            icon={<ExternalLinkIcon size={15} />}
          />
          <p style={{ fontSize: 12, color: T.textTertiary, textAlign: 'center', margin: 0 }}>
            Opens Namecheap in a new tab. Come back here after purchase.
          </p>
          <SkipLink label="I already have a domain set up — skip" onClick={advance} />
        </>
      )}

      {/* DNS records phase */}
      {domainStep === 'dns' && (
        <>
          <div style={{ background: T.amberBg, borderRadius: 8, padding: '10px 14px', border: '1px solid #FCD34D', fontSize: 13, color: '#92400E' }}>
            Add these 3 records in your Namecheap DNS settings, then wait — we'll verify automatically.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(dnsRecords.length > 0 ? dnsRecords.slice(0, 3) : [
              { label: 'SPF Record',  type: 'TXT',   host: domainResult?.domain ?? '', value: 'v=spf1 include:_spf.resend.com ~all' },
              { label: 'DKIM Record', type: 'TXT',   host: `wee1._domainkey.${domainResult?.domain ?? ''}`, value: 'v=DKIM1; k=rsa; p=...' },
              { label: 'DMARC',       type: 'TXT',   host: `_dmarc.${domainResult?.domain ?? ''}`, value: 'v=DMARC1; p=none' },
            ]).map((rec, idx) => (
              <div key={idx} style={{
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 8,
                padding: '12px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.textTertiary }}>{rec.label} · {rec.type}</span>
                  <button
                    onClick={() => copyRecord(idx, rec.value)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: copiedIdx === idx ? T.green : T.brand, padding: 0 }}
                  >
                    {copiedIdx === idx ? <CheckIcon size={12} /> : <CopyIcon size={12} />}
                    {copiedIdx === idx ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p style={{ fontSize: 11, fontFamily: 'monospace', color: T.textSecondary, margin: '2px 0 0', wordBreak: 'break-all' }}>{rec.host}</p>
                <p style={{ fontSize: 11, fontFamily: 'monospace', color: T.textPrimary, margin: '4px 0 0', wordBreak: 'break-all', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: T.surface, borderRadius: 8, border: `1px solid ${T.border}` }}>
            <Spinner size={14} color={T.textTertiary} />
            <span style={{ fontSize: 13, color: T.textTertiary }}>Checking DNS records automatically every 8 seconds…</span>
          </div>

          <SkipLink label="Skip — I'll verify later" onClick={advance} />
        </>
      )}

      {/* Verified */}
      {domainStep === 'verified' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: T.greenBg, border: `2px solid ${T.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckIcon size={28} color={T.green} />
          </div>
          <p style={{ fontSize: 15, color: T.textSecondary }}>All 3 DNS records verified. Advancing…</p>
        </div>
      )}
    </StepShell>
  );

  // STEP 5 — Import contacts (auto-run, no user action)
  if (step === 5) return (
    <StepShell
      step={5} total={TOTAL}
      eyebrow="Step 5 of 7"
      headline="Importing your community"
      sub="We're pulling in your Whop members. This takes about 30 seconds."
    >
      {/* Progress display */}
      {state === 'loading' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ margin: '0 auto 20px', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size={40} color={T.brand} />
          </div>
          <p style={{ fontSize: 28, fontWeight: 700, color: T.textPrimary, fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", margin: '0 0 6px' }}>
            {importCount > 0 ? importCount.toLocaleString() : '…'}
          </p>
          <p style={{ fontSize: 14, color: T.textTertiary, margin: 0 }}>
            {importCount > 0 ? 'contacts imported' : 'Connecting to Whop…'}
          </p>
        </div>
      )}

      {state === 'success' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: T.greenBg, border: `2px solid ${T.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckIcon size={28} color={T.green} />
          </div>
          <p style={{ fontSize: 22, fontWeight: 700, color: T.textPrimary, fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", margin: '0 0 4px' }}>
            {importCount > 0 ? `${importCount.toLocaleString()} members imported` : 'Sync complete'}
          </p>
          <p style={{ fontSize: 14, color: T.textTertiary, margin: 0 }}>Moving to next step…</p>
        </div>
      )}

      {state === 'error' && (
        <>
          <ErrorMsg msg={error} />
          <PrimaryBtn label="Retry sync" onClick={() => { setState('idle'); setStep(5); }} />
          <SkipLink label="Skip — I'll sync later from Contacts" onClick={advance} />
        </>
      )}
    </StepShell>
  );

  // STEP 6 — Build AI sequence
  if (step === 6) return (
    <StepShell
      step={6} total={TOTAL}
      eyebrow="Step 6 of 7"
      headline="Build your first campaign"
      sub="Three sentences and we'll write 5 emails for you."
    >
      <InputField
        label="What you sell"
        value={seqProduct}
        onChange={setSeqProduct}
        placeholder="e.g. real estate wholesaling course"
        autoFocus
      />
      <InputField
        label="Who it's for"
        value={seqAudience}
        onChange={setSeqAudience}
        placeholder="e.g. beginners with no experience"
      />
      <InputField
        label="What you want them to do"
        value={seqGoal}
        onChange={setSeqGoal}
        placeholder="e.g. join my course"
      />

      {state === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: T.surface, borderRadius: 8, border: `1px solid ${T.border}` }}>
          <Spinner size={16} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: T.textPrimary, margin: 0 }}>Writing your 5 emails…</p>
            <p style={{ fontSize: 12, color: T.textTertiary, margin: '2px 0 0' }}>This takes about 30 seconds</p>
          </div>
        </div>
      )}

      {state === 'success' && <SuccessMsg msg="5 campaigns created! Moving to final step…" />}
      {state === 'error' && <ErrorMsg msg={error} />}

      <p style={{ fontSize: 12, color: T.textTertiary, margin: 0 }}>
        Uses 25 AI credits · Creates 5 draft campaigns
      </p>

      <PrimaryBtn
        label={state === 'loading' ? 'Writing your emails…' : state === 'success' ? '5 emails ready!' : 'Build my sequence →'}
        onClick={handleBuildSequence}
        loading={state === 'loading'}
        disabled={state === 'success'}
        icon={<SparklesIcon size={16} />}
      />

      <SkipLink label="Skip — I'll create a campaign manually" onClick={() => router.push('/dashboard/campaigns/new')} />
    </StepShell>
  );

  // STEP 7 — You're live
  if (step === 7) return (
    <StepShell
      step={7} total={TOTAL}
      eyebrow="You're ready"
      headline="Your first campaign is ready."
      sub="Email 1 is written and addressed to your whole community. Send it now or review first."
    >
      {/* Campaign preview card */}
      <div style={{
        background: T.card, border: `1px solid ${T.greenBorder}`, borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{ background: T.greenBg, padding: '10px 16px', borderBottom: `1px solid ${T.greenBorder}` }}>
          <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.green }}>
            Email 1 of 5 — ready to send
          </span>
        </div>
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: brandColor + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: brandColor, flexShrink: 0,
            }}>
              {fromName?.[0]?.toUpperCase() ?? 'Y'}
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: T.textPrimary, margin: 0 }}>{fromName || companyName}</p>
              <p style={{ fontSize: 12, color: T.textTertiary, margin: '1px 0 0' }}>
                Story / Hook — your opening email
              </p>
            </div>
          </div>
          <div style={{ marginTop: 12, padding: '10px 12px', background: T.surface, borderRadius: 6 }}>
            <p style={{ fontSize: 12, color: T.textSecondary, margin: 0, lineHeight: 1.5 }}>
              Sending to {importCount > 0 ? `${importCount.toLocaleString()} subscribers` : 'your community'} · Scheduled for today
            </p>
          </div>
        </div>
      </div>

      {state === 'error' && <ErrorMsg msg={error} />}

      {state === 'success' ? (
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: T.greenBg, border: `2px solid ${T.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <CheckCircleIcon size={26} color={T.green} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: T.green, margin: '0 0 4px' }}>Campaign sent!</p>
          <p style={{ fontSize: 13, color: T.textTertiary, margin: 0 }}>Redirecting to your dashboard…</p>
        </div>
      ) : (
        <>
          <PrimaryBtn
            label={state === 'loading' ? 'Sending…' : 'Send Email 1 now'}
            onClick={handleSendNow}
            loading={state === 'loading'}
            icon={<ArrowRightIcon size={16} />}
          />
          <SkipLink
            label="Review all 5 drafts first"
            onClick={() => router.push('/dashboard/campaigns')}
          />
        </>
      )}
    </StepShell>
  );

  return null;
}
