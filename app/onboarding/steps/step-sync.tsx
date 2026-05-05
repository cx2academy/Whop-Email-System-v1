'use client';

import { useEffect, useState } from 'react';
import { Shell, Btn, GhostBtn, Err, Ok, C, Spinner } from '../ui';
import { triggerOnboardingSync } from '@/lib/onboarding/actions';

interface Props {
  onNext: (count: number) => void;
}

export default function StepSync({ onNext }: Props) {
  const [count, setCount]   = useState(0);
  const [state, setState]   = useState<'loading' | 'done' | 'error'>('loading');
  const [error, setError]   = useState('');

  // Auto-fire on mount — no user button press
  useEffect(() => {
    let tick = 0;
    let counter: ReturnType<typeof setInterval>;

    triggerOnboardingSync().then((res) => {
      if (!res.success) {
        setState('error');
        setError(res.error ?? 'Sync failed. Check your Whop API key.');
        clearInterval(counter);
        return;
      }

      const total = (res.data?.totalUpserted as number) ?? 0;

      // Animate counter up
      if (total > 0) {
        const step = Math.max(1, Math.floor(total / 30));
        counter = setInterval(() => {
          tick = Math.min(tick + step, total);
          setCount(tick);
          if (tick >= total) {
            clearInterval(counter);
            setState('done');
            setTimeout(() => onNext(total), 1400);
          }
        }, 50);
      } else {
        setState('done');
        setTimeout(() => onNext(0), 1400);
      }
    });

    return () => { if (counter) clearInterval(counter); };
  }, []); // eslint-disable-line

  return (
    <Shell
      step={5} total={7}
      eyebrow="Step 5 of 7"
      headline="Importing your community"
      sub="Pulling in all your Whop members. This takes about 30 seconds."
    >
      {state === 'loading' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ margin: '0 auto 18px', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner size={40} />
          </div>
          <p style={{
            fontSize: count > 0 ? 34 : 20, fontWeight: 700, color: C.text, margin: '0 0 6px',
            fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", letterSpacing: '-0.03em',
            transition: 'font-size 0.2s',
          }}>
            {count > 0 ? count.toLocaleString() : '…'}
          </p>
          <p style={{ fontSize: 14, color: C.textHint, margin: 0 }}>
            {count > 0 ? 'contacts imported' : 'Connecting to Whop…'}
          </p>
        </div>
      )}

      {state === 'done' && (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: '#F0FDF4', border: '2px solid #BBF7D0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M5 12l5 5L19 7" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <p style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: '0 0 4px', fontFamily: "'Bricolage Grotesque',system-ui,sans-serif" }}>
            {count > 0 ? `${count.toLocaleString()} members ready` : 'Sync complete'}
          </p>
          <p style={{ fontSize: 14, color: C.textHint, margin: 0 }}>Moving to next step…</p>
        </div>
      )}

      {state === 'error' && (
        <>
          <Err msg={error} />
          <Btn label="Retry" onClick={() => { setState('loading'); setError(''); setCount(0); }} />
          <GhostBtn label="Skip — sync later from Contacts" onClick={() => onNext(0)} />
        </>
      )}
    </Shell>
  );
}
