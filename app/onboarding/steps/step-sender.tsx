'use client';

import { useState } from 'react';
import { Shell, Input, Btn, Err, Ok, C } from '../ui';
import { saveBranding } from '@/lib/branding/actions';

interface Props {
  companyName: string;
  brandColor:  string;
  userEmail:   string;
  onNext: (fromName: string) => void;
}

export default function StepSender({ companyName, brandColor, userEmail, onNext }: Props) {
  const [name, setName]   = useState(companyName || '');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  async function confirm() {
    if (!name.trim()) { setError('Enter a sender name.'); return; }
    setState('loading'); setError('');

    const r1 = await saveBranding({ fromName: name.trim() });

    if (!r1.success) { setState('error'); setError(r1.error ?? 'Failed to save.'); return; }

    setState('done');
    setTimeout(() => onNext(name.trim()), 600);
  }

  const initial = name[0]?.toUpperCase() ?? '?';

  return (
    <Shell
      step={3} total={7}
      eyebrow="Step 3 of 7"
      headline="Who are emails from?"
      sub="What your subscribers see in the From field."
    >
      <Input
        label="Your name or brand name"
        value={name}
        onChange={setName}
        placeholder={companyName || 'Your name'}
        autoFocus
        disabled={state === 'loading' || state === 'done'}
      />

      {/* Inbox preview */}
      {name.trim() && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '7px 14px', background: C.bg, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textHint }}>
              Inbox preview
            </span>
          </div>
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              background: brandColor + '22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: brandColor,
            }}>
              {initial}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{name}</p>
              <p style={{ fontSize: 12, color: C.textHint, margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Your subject line · Email preview text...
              </p>
            </div>
          </div>
        </div>
      )}

      {error && <Err msg={error} />}
      {state === 'done' && <Ok msg="Sender name saved!" />}

      <Btn
        label={state === 'loading' ? 'Saving…' : 'Use this name →'}
        onClick={confirm}
        loading={state === 'loading'}
        disabled={state === 'done'}
      />
    </Shell>
  );
}
