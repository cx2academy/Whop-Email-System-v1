'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shell, Btn, GhostBtn, Err, C } from '../ui';
import { sendCampaignNow } from '@/lib/campaigns/actions';
import { sendQuickStartEmail } from '@/lib/quickstart/actions';

interface Props {
  campaignId:  string | null;
  fromName:    string;
  brandColor:  string;
  contactCount: number;
  userEmail:   string;
}

export default function StepLive({ campaignId, fromName, brandColor, contactCount, userEmail }: Props) {
  const router = useRouter();
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const initial = fromName[0]?.toUpperCase() ?? '?';

  async function send() {
    setState('loading'); setError('');

    try {
      let ok = false;
      if (campaignId) {
        const r = await sendCampaignNow(campaignId);
        ok = r.success;
        if (!r.success) setError((r as any).error ?? 'Send failed.');
      } else {
        const r = await sendQuickStartEmail('welcome', userEmail);
        ok = r.success;
        if (!r.success) setError(r.error ?? 'Send failed.');
      }

      if (ok) {
        setState('done');
        setTimeout(() => router.push('/dashboard'), 1400);
      } else {
        setState('error');
      }
    } catch {
      setState('error');
      setError('Something went wrong. Try from the campaigns page.');
    }
  }

  if (state === 'done') {
    return (
      <Shell step={7} total={7} eyebrow="You're live" headline="Campaign sent!" sub="Redirecting to your dashboard…">
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto',
            background: '#F0FDF4', border: '2px solid #BBF7D0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
              <path d="M5 12l5 5L19 7" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      step={7} total={7}
      eyebrow="You're ready"
      headline="Your first campaign is ready."
      sub={contactCount > 0
        ? `Email 1 is written and addressed to all ${contactCount.toLocaleString()} subscribers.`
        : 'Email 1 is written and ready to send.'}
    >
      {/* Campaign preview */}
      <div style={{ background: C.card, border: `1px solid #BBF7D0`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', background: '#F0FDF4', borderBottom: '1px solid #BBF7D0' }}>
          <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#16A34A' }}>
            {campaignId ? 'Email 1 of 5 — ready to send' : 'Welcome email — ready to send'}
          </span>
        </div>
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
            background: brandColor + '22',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: brandColor,
          }}>
            {initial}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{fromName}</p>
            <p style={{ fontSize: 12, color: C.textHint, margin: '1px 0 0' }}>
              {campaignId ? 'Story / Hook — opening email' : 'Welcome to the community'}
            </p>
          </div>
        </div>
      </div>

      {error && <Err msg={error} />}

      <Btn
        label={state === 'loading' ? 'Sending…' : 'Send now'}
        onClick={send}
        loading={state === 'loading'}
      />

      <GhostBtn
        label="Review all campaigns first"
        onClick={() => router.push('/dashboard/campaigns')}
      />
    </Shell>
  );
}
