'use client';

/**
 * app/onboarding/steps/step-whop.tsx
 *
 * Phase 1 — Launch pad: "Open Whop settings" button
 * Phase 2 — Guide: 3 annotated screenshots + paste field (auto-submits on valid input)
 */

import { useState, useEffect } from 'react';
import { ExternalLinkIcon, CheckIcon } from 'lucide-react';
import { Shell, Btn, GhostBtn, Err, C, Spinner } from '../ui';
import { saveWhopApiKey } from '@/lib/onboarding/actions';

interface Props {
  onNext: (companyName: string | null) => void;
}

type Phase = 'launch' | 'guide' | 'validating' | 'done' | 'error';

const WHOP_DEV_URL = 'https://whop.com/dashboard/developer';

const STEPS = [
  {
    img:  '/images/onboarding/whop-step1.png',
    text: 'Click "+ Create" in the top right of the Company API keys section',
  },
  {
    img:  '/images/onboarding/whop-step2.png',
    text: 'Name it "RevTray", keep the role set to Admin, then click Create',
  },
  {
    img:  '/images/onboarding/whop-step3.png',
    text: 'Click the copy icon next to your key, then come back here and paste it',
  },
];

export default function StepWhop({ onNext }: Props) {
  const [phase,   setPhase]   = useState<Phase>('launch');
  const [apiKey,  setApiKey]  = useState('');
  const [error,   setError]   = useState('');
  const [focused, setFocused] = useState(false);

  // Auto-validate when a full key is pasted (Whop keys start with "apik_")
  useEffect(() => {
    const trimmed = apiKey.trim();
    if (trimmed.length >= 20 && phase === 'guide') {
      // Small debounce — feel instant but not jittery
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
      setError(res.error ?? 'Invalid key. Double-check and try again.');
      return;
    }

    setPhase('done');
    const name = (res.data?.whopCompanyName as string | null) ?? null;
    setTimeout(() => onNext(name), 700);
  }

  // ── Phase: Launch pad ─────────────────────────────────────────────────────
  if (phase === 'launch') {
    return (
      <Shell
        step={1} total={7}
        eyebrow="Step 1 of 7"
        headline="Connect your Whop account"
        sub="We'll walk you through it. Takes about 2 minutes."
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

  // ── Phase: Guide (screenshots + paste) ───────────────────────────────────
  if (phase === 'guide' || phase === 'validating' || phase === 'error') {
    const isValidating = phase === 'validating';

    return (
      <Shell
        step={1} total={7}
        eyebrow="Step 1 of 7"
        headline="Follow these 3 steps"
        sub="Then paste your key below — it'll connect automatically."
      >
        {/* Screenshot guide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STEPS.map((s, i) => (
            <div
              key={i}
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {/* Annotated screenshot */}
              <img
                src={s.img}
                alt={`Step ${i + 1}`}
                style={{ width: '100%', display: 'block', maxHeight: 180, objectFit: 'cover', objectPosition: 'top' }}
              />
              {/* Caption */}
              <div style={{ padding: '9px 14px', borderTop: `1px solid ${C.border}`, background: C.bg }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.brand, marginRight: 6 }}>
                  {i + 1}.
                </span>
                <span style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5 }}>{s.text}</span>
              </div>
            </div>
          ))}
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
              disabled={isValidating || phase === 'done'}
              autoFocus
              style={{
                width: '100%', padding: '12px 44px 12px 14px', fontSize: 15,
                border: `1.5px solid ${phase === 'error' ? C.red : focused ? C.brand : C.border}`,
                borderRadius: 8, outline: 'none',
                background: isValidating ? C.bg : C.card,
                color: C.text, boxSizing: 'border-box', fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
            />
            {/* Inline status icon */}
            <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>
              {isValidating && <Spinner size={16} />}
              {phase === 'done' && <CheckIcon size={16} color={C.green} />}
            </div>
          </div>
          {error && (
            <p style={{ fontSize: 12, color: C.red, margin: 0 }}>
              {error}
            </p>
          )}
          <p style={{ fontSize: 11, color: C.textHint, margin: 0 }}>
            {isValidating ? 'Connecting to Whop…' : 'Paste your key and it connects automatically'}
          </p>
        </div>

        {/* Manual submit fallback (visible if they typed instead of pasted) */}
        {apiKey.length > 0 && !isValidating && phase !== 'done' && (
          <Btn
            label="Connect Whop"
            onClick={() => handleConnect()}
            loading={isValidating}
          />
        )}

        <GhostBtn
          label="Open Whop settings again"
          onClick={() => window.open(WHOP_DEV_URL, '_blank', 'noopener')}
        />
      </Shell>
    );
  }

  // ── Phase: Done ───────────────────────────────────────────────────────────
  return (
    <Shell step={1} total={7} eyebrow="Step 1 of 7" headline="Whop connected!" >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', margin: '0 auto 14px',
          background: '#F0FDF4', border: '2px solid #BBF7D0',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckIcon size={26} color={C.green} />
        </div>
        <p style={{ fontSize: 15, color: C.textSub, margin: 0 }}>
          Loading your brand…
        </p>
      </div>
    </Shell>
  );
}
