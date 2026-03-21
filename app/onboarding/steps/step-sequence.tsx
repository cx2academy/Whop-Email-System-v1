'use client';

import { useState } from 'react';
import { SparklesIcon } from 'lucide-react';
import { Shell, Input, Btn, GhostBtn, Err, Ok, C, Spinner } from '../ui';
import { buildCampaignSequence, type CampaignBrief } from '@/lib/ai/actions';
import { materializeSequence } from '@/lib/ai/sequence-materializer';

interface Props {
  onNext: (firstCampaignId: string | null) => void;
}

type Phase = 'form' | 'generating' | 'done' | 'error';

export default function StepSequence({ onNext }: Props) {
  const [product,  setProduct]  = useState('');
  const [audience, setAudience] = useState('');
  const [goal,     setGoal]     = useState('');
  const [phase,    setPhase]    = useState<Phase>('form');
  const [status,   setStatus]   = useState('');
  const [error,    setError]    = useState('');

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

      setStatus('Writing your 5 emails with AI…');

      const brief: CampaignBrief = { product, audience, tone: 'friendly', goal };
      const matRes = await materializeSequence({ sequence: seqRes.data as any, brief });
      if (!matRes.success) { setPhase('error'); setError(matRes.error ?? 'Failed to create campaigns.'); return; }

      const firstId = matRes.data?.campaigns[0]?.id ?? null;
      setPhase('done');
      setTimeout(() => onNext(firstId), 900);
    } catch {
      setPhase('error');
      setError('Something went wrong. Try again.');
    }
  }

  return (
    <Shell
      step={6} total={7}
      eyebrow="Step 6 of 7"
      headline="Build your first campaign"
      sub="Three sentences and we'll write 5 emails for you."
    >
      <Input
        label="What you sell"
        value={product}
        onChange={setProduct}
        placeholder="e.g. real estate wholesaling course"
        autoFocus
        disabled={phase !== 'form'}
      />
      <Input
        label="Who it's for"
        value={audience}
        onChange={setAudience}
        placeholder="e.g. beginners with no experience"
        disabled={phase !== 'form'}
      />
      <Input
        label="What you want them to do"
        value={goal}
        onChange={setGoal}
        placeholder="e.g. join my course"
        disabled={phase !== 'form'}
      />

      {phase === 'generating' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 16px', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`,
        }}>
          <Spinner size={16} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, color: C.text, margin: 0 }}>{status}</p>
            <p style={{ fontSize: 12, color: C.textHint, margin: '2px 0 0' }}>~30 seconds</p>
          </div>
        </div>
      )}

      {phase === 'done' && <Ok msg="5 campaigns created! Moving to final step…" />}
      {phase === 'error' && <Err msg={error} />}

      {(phase === 'form' || phase === 'error') && (
        <>
          <p style={{ fontSize: 12, color: C.textHint, margin: 0 }}>Uses 25 AI credits · Creates 5 draft campaigns</p>
          <Btn
            label="Build my sequence"
            onClick={build}
            icon={<SparklesIcon size={16} />}
          />
          <GhostBtn label="Skip — create a campaign manually" onClick={() => onNext(null)} />
        </>
      )}
    </Shell>
  );
}
