'use client';

/**
 * app/onboarding/steps/step-whop.tsx
 *
 * Phase 1 — Launch pad: "Open Whop settings" button
 * Phase 2 — Guide: step switcher (1 image at a time, full size) + paste field
 *
 * Layout fits entirely without scrolling:
 *   - 3 numbered step tabs at top
 *   - 1 full image shown (16:9, no cropping)
 *   - Caption below image
 *   - Paste field at bottom
 */

import { useState, useEffect } from 'react';
import { ExternalLinkIcon, CheckIcon, ArrowRightIcon } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { Shell, Btn, GhostBtn, Err, C, Spinner } from '../ui';
import { saveWhopApiKey } from '@/lib/onboarding/actions';

interface Props {
  onNext: (companyName: string | null) => void;
}

type Phase = 'launch' | 'guide' | 'validating' | 'done' | 'error';

const WHOP_DEV_URL = 'https://whop.com/dashboard/developer';

const STEPS = [
  {
    img:     '/images/onboarding/whop-step1.png',
    caption: 'Click "+ Create" in the top right of the Company API keys section',
  },
  {
    img:     '/images/onboarding/whop-step2.png',
    caption: 'Name it "RevTray", choose Admin role, then click "Create"',
  },
  {
    img:     '/images/onboarding/whop-step3.png',
    caption: 'Click the copy icon next to your key, then paste it below',
  },
];

export default function StepWhop({ onNext }: Props) {
  const [phase,       setPhase]       = useState<Phase>('launch');
  const [activeStep,  setActiveStep]  = useState(0);
  const [apiKey,      setApiKey]      = useState('');
  const [error,       setError]       = useState('');
  const [focused,     setFocused]     = useState(false);

  // Auto-validate on paste — debounced 400ms
  useEffect(() => {
    const trimmed = apiKey.trim();
    if (trimmed.length >= 20 && phase === 'guide') {
      const t = setTimeout(() => handleConnect(trimmed), 400);
      return () => clearTimeout(t);
    }
  }, [apiKey]); // eslint-disable-line

  function handleOpenWhop() {
    window.open(WHOP_DEV_URL, '_blank', 'noopener');
    setPhase('guide');
  }

  async function handleConnect(key = apiKey) {
    const trimmed = key.trim();
    if (!trimmed) { setError('Paste your API key to continue.'); return; }
    setPhase('validating');
    setError('');

    const res = await saveWhopApiKey(trimmed);
    if (!res.success) {
      setPhase('error');
      setError(res.error ?? 'Invalid key — double-check and try again.');
      return;
    }

    setPhase('done');
    const name = (res.data?.whopCompanyName as string | null) ?? null;
    setTimeout(() => onNext(name), 700);
  }

  // ── Phase: Launch ─────────────────────────────────────────────────────────
  if (phase === 'launch') {
    return (
      <Shell
        step={1} total={7}
        eyebrow="Step 1 of 7"
        headline="Connect your Whop account"
        sub="We'll walk you through it step by step. Takes 2 minutes."
      >
        <Btn
          label="Open Whop API settings"
          onClick={handleOpenWhop}
          icon={<ExternalLinkIcon size={15} />}
        />
        <p style={{ fontSize: 12, color: C.textHint, textAlign: 'center', margin: 0 }}>
          Opens Whop in a new tab — come back here after
        </p>
      </Shell>
    );
  }

  // ── Phase: Done ───────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <Shell step={1} total={7} eyebrow="Step 1 of 7" headline="Whop connected!">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 14px',
            background: '#F0FDF4', border: '2px solid #BBF7D0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckIcon size={26} color={C.green} />
          </div>
          <p style={{ fontSize: 15, color: C.textSub, margin: 0 }}>Loading your brand…</p>
        </div>
      </Shell>
    );
  }

  // ── Phase: Guide ──────────────────────────────────────────────────────────
  const isValidating = phase === 'validating';
  const current = STEPS[activeStep];

  return (
    // Override Shell's gap to keep everything tight
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '72px 24px 24px',
      background: '#F7F8FA',
    }}>
      {/* Top bar (same as Shell) */}
      <style>{`@keyframes ob-in { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } } .ob-in { animation: ob-in 0.28s ease forwards; }`}</style>
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10,
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px',
        background: 'rgba(247,248,250,0.92)', backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Logo size={26} />
          <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: '-0.03em' }}>
            RevTray
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ height: 5, borderRadius: 99, width: i === 0 ? 18 : 5, background: i < 1 ? C.brand : i === 0 ? C.brand : C.border, opacity: i < 1 ? 0.4 : 1 }} />
          ))}
          <span style={{ fontSize: 11, color: C.textHint, marginLeft: 6 }}>1/7</span>
        </div>
      </header>

      <div className="ob-in" style={{ width: '100%', maxWidth: 520 }}>

        {/* Eyebrow + headline */}
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: C.brand, margin: '0 0 10px' }}>
          Step 1 of 7
        </p>
        <h1 style={{
          fontFamily: "'Bricolage Grotesque',system-ui,sans-serif",
          fontSize: 28, fontWeight: 700, color: C.text,
          letterSpacing: '-0.035em', lineHeight: 1.1, margin: '0 0 16px',
        }}>
          Follow these 3 steps
        </h1>

        {/* Step tab pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13, fontWeight: 600,
                transition: 'all 0.15s',
                background: activeStep === i ? C.brand : C.card,
                color: activeStep === i ? '#fff' : C.textSub,
                boxShadow: activeStep === i ? '0 2px 8px rgba(34,197,94,0.22)' : 'none',
                outline: activeStep !== i ? `1px solid ${C.border}` : 'none',
              }}
            >
              Step {i + 1}
            </button>
          ))}
        </div>

        {/* Full image — no crop, full aspect ratio */}
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          overflow: 'hidden',
          marginBottom: 10,
        }}>
          <img
            key={activeStep}
            src={current.img}
            alt={`Step ${activeStep + 1}`}
            style={{
              width: '100%',
              display: 'block',
              // 16:9 aspect ratio maintained, no cropping
              aspectRatio: '16 / 9',
              objectFit: 'contain',
              background: '#1a1a2e',
            }}
          />
          {/* Caption */}
          <div style={{
            padding: '10px 14px',
            borderTop: `1px solid ${C.border}`,
            background: C.bg,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span style={{
              flexShrink: 0,
              width: 22, height: 22, borderRadius: '50%',
              background: C.brand, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
            }}>
              {activeStep + 1}
            </span>
            <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.5 }}>
              {current.caption}
            </span>
            {/* Next step nudge */}
            {activeStep < 2 && (
              <button
                onClick={() => setActiveStep(activeStep + 1)}
                style={{
                  flexShrink: 0, marginLeft: 'auto',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 3,
                  fontSize: 12, color: C.brand, fontFamily: 'inherit', fontWeight: 600,
                  padding: '2px 0',
                }}
              >
                Next <ArrowRightIcon size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Paste field */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 500, color: C.textSub }}>
            Paste your API key here
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setError(''); }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="apik_..."
              disabled={isValidating}
              autoComplete="off"
              style={{
                width: '100%', padding: '12px 44px 12px 14px', fontSize: 15,
                border: `1.5px solid ${error ? C.red : focused ? C.brand : C.border}`,
                borderRadius: 8, outline: 'none',
                background: isValidating ? C.bg : C.card,
                color: C.text, boxSizing: 'border-box', fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
            />
            <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
              {isValidating && <Spinner size={16} />}
              {phase === 'done' && <CheckIcon size={16} color={C.green} />}
            </div>
          </div>
          {error
            ? <p style={{ fontSize: 12, color: C.red, margin: 0 }}>{error}</p>
            : <p style={{ fontSize: 11, color: C.textHint, margin: 0 }}>
                {isValidating ? 'Connecting to Whop…' : 'Paste your key and it connects automatically'}
              </p>
          }
        </div>

        {/* Manual submit — shows if they typed instead of pasted */}
        {apiKey.length > 0 && !isValidating && phase !== 'done' && (
          <div style={{ marginTop: 10 }}>
            <Btn label="Connect Whop" onClick={() => handleConnect()} loading={isValidating} />
          </div>
        )}

        {/* Re-open link */}
        <div style={{ marginTop: 8 }}>
          <GhostBtn
            label="Open Whop settings again"
            onClick={() => window.open(WHOP_DEV_URL, '_blank', 'noopener')}
          />
        </div>

      </div>
    </div>
  );
}
