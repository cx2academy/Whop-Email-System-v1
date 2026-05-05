'use client';

/**
 * app/onboarding/steps/step-sequence.tsx
 *
 * Two paths depending on AI credit balance (passed as prop from server):
 *
 * UNLOCKED (aiCredits ≥ 25):
 *   Builds plan + writes all 5 emails + creates 5 real EmailCampaign rows → step 7
 *
 * LOCKED (aiCredits < 25 — FREE plan with no credits):
 *   Builds plan only (costs 5 credits) → shows 5 cards with subjects visible,
 *   email body blurred + locked → subtle Starter upsell → skip to step 7
 */

import { useState } from 'react';
import { SparklesIcon, LockIcon, ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import { Shell, Input, Btn, GhostBtn, Err, Ok, C, Spinner } from '../ui';
import { buildCampaignSequence, type CampaignBrief, type SequenceEmail } from '@/lib/ai/actions';
import { materializeSequence } from '@/lib/ai/sequence-materializer';

interface Props {
  aiCredits: number;
  onNext: (firstCampaignId: string | null) => void;
}

type Phase = 'form' | 'generating' | 'locked' | 'done' | 'error';

const TYPE_COLOR: Record<string, string> = {
  story: '#7C3AED', value: '#2563EB', proof: '#16A34A',
  offer: '#EA580C', urgency: '#DC2626',
};
function dotColor(type: string) {
  const key = Object.keys(TYPE_COLOR).find((k) => type.toLowerCase().includes(k));
  return key ? TYPE_COLOR[key] : C.textHint;
}

export default function StepSequence({ onNext, aiCredits }: Props) {
  const [product,  setProduct]  = useState('');
  const [audience, setAudience] = useState('');
  const [goal,     setGoal]     = useState('');
  const [phase,    setPhase]    = useState<Phase>('form');
  const [status,   setStatus]   = useState('');
  const [error,    setError]    = useState('');
  const [lockedEmails, setLockedEmails] = useState<SequenceEmail[]>([]);
  const [seqName,  setSeqName]  = useState('');

  const canAffordFull = aiCredits >= 25;

  async function build() {
    if (!product.trim() || !audience.trim() || !goal.trim()) {
      setError('Fill in all three fields.');
      return;
    }
    setError('');
    setPhase('generating');
    setStatus('Building your sequence plan…');

    try {
      const seqRes = await buildCampaignSequence(product.trim(), audience.trim(), goal.trim());
      if (!seqRes.success) { setPhase('error'); setError(seqRes.error); return; }

      if (!canAffordFull) {
        // Locked path — show titles only
        setLockedEmails(seqRes.data.emails);
        setSeqName(seqRes.data.sequenceName);
        setPhase('locked');
        return;
      }

      // Full path — write all 5 emails and create campaigns
      setStatus('Writing your 5 emails with AI…');
      const brief: CampaignBrief = { product, audience, tone: 'friendly', goal };
      const matRes = await materializeSequence({ sequence: seqRes.data as any, brief, audienceTagIds: [] });
      if (!matRes.success) { setPhase('error'); setError(matRes.error ?? 'Failed to create campaigns.'); return; }

      const firstId = matRes.data?.campaigns[0]?.id ?? null;
      setPhase('done');
      setTimeout(() => onNext(firstId), 900);
    } catch {
      setPhase('error');
      setError('Something went wrong. Try again.');
    }
  }

  // ── Locked preview ────────────────────────────────────────────────────────
  if (phase === 'locked') {
    return (
      <Shell step={6} total={7} eyebrow="Step 6 of 7" headline="Your sequence is ready." sub="Upgrade to unlock AI-written emails for each step.">

        {/* Sequence name */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', fontSize: 12, fontWeight: 600, color: C.brand }}>
          <SparklesIcon size={11} />
          {seqName}
        </div>

        {/* Locked cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {lockedEmails.map((email, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Number */}
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: C.textHint }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Type + timing */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor(email.type), flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.textHint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {email.type} · {email.sendTiming}
                  </span>
                </div>
                {/* Subject — fully visible */}
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: '0 0 3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {email.subject}
                </p>
                {/* Body — blurred */}
                <p style={{ fontSize: 12, color: C.textHint, margin: 0, filter: 'blur(3px)', userSelect: 'none', pointerEvents: 'none', lineHeight: 1.4 }}>
                  {email.purpose.slice(0, 55)}...
                </p>
              </div>
              {/* Lock */}
              <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LockIcon size={13} color={C.textHint} />
              </div>
            </div>
          ))}
        </div>

        {/* Subtle upsell */}
        <div style={{ background: '#FAFAFA', border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: '0 0 2px' }}>
              Unlock AI email writing
            </p>
            <p style={{ fontSize: 12, color: C.textHint, margin: 0 }}>
              Starter plan includes 50 AI credits/mo.
            </p>
          </div>
          <Link
            href="/dashboard/settings?tab=billing"
            style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, background: C.brand, color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            $29/mo <ArrowRightIcon size={13} />
          </Link>
        </div>

        <GhostBtn label="Continue without AI writing →" onClick={() => onNext(null)} />
      </Shell>
    );
  }

  // ── Form / generating / done ──────────────────────────────────────────────
  return (
    <Shell step={6} total={7} eyebrow="Step 6 of 7" headline="Build your first campaign" sub="Three sentences and we'll write 5 emails for you.">
      <Input label="What you sell" value={product} onChange={setProduct} placeholder="e.g. real estate wholesaling course" autoFocus disabled={phase !== 'form' && phase !== 'error'} />
      <Input label="Who it's for" value={audience} onChange={setAudience} placeholder="e.g. beginners with no experience" disabled={phase !== 'form' && phase !== 'error'} />
      <Input label="What you want them to do" value={goal} onChange={setGoal} placeholder="e.g. join my course" disabled={phase !== 'form' && phase !== 'error'} />

      {phase === 'generating' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
          <Spinner size={16} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: C.text, margin: 0 }}>{status}</p>
            <p style={{ fontSize: 12, color: C.textHint, margin: '2px 0 0' }}>~30 seconds</p>
          </div>
        </div>
      )}

      {phase === 'done'  && <Ok msg="5 campaigns created! Moving to final step…" />}
      {phase === 'error' && <Err msg={error} />}

      {(phase === 'form' || phase === 'error') && (
        <>
          <p style={{ fontSize: 12, color: C.textHint, margin: 0 }}>
            {canAffordFull
              ? 'Uses 25 AI credits · Creates 5 draft campaigns'
              : `You have ${aiCredits} credits — upgrade to unlock full AI writing`}
          </p>
          <Btn label="Build my sequence" onClick={build} icon={<SparklesIcon size={16} />} />
          <GhostBtn label="Skip — create a campaign manually" onClick={() => onNext(null)} />
        </>
      )}
    </Shell>
  );
}
