'use client';

import { useState } from 'react';
import { ExternalLinkIcon } from 'lucide-react';
import { Shell, Input, Btn, Err, Ok, C } from '../ui';
import { saveWhopApiKey } from '@/lib/onboarding/actions';

interface Props {
  onNext: (companyName: string | null) => void;
}

export default function StepWhop({ onNext }: Props) {
  const [key, setKey]       = useState('');
  const [state, setState]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError]   = useState('');

  async function connect() {
    if (!key.trim()) { setError('Paste your Whop API key to continue.'); return; }
    setState('loading'); setError('');

    const res = await saveWhopApiKey(key.trim());
    if (!res.success) {
      setState('error');
      setError(res.error ?? 'Connection failed.');
      return;
    }

    setState('done');
    const name = (res.data?.whopCompanyName as string | null) ?? null;
    setTimeout(() => onNext(name), 700);
  }

  return (
    <Shell
      step={1} total={7}
      eyebrow="Step 1 of 7"
      headline="Connect Whop"
      sub="We'll import your community automatically. Your key is encrypted and never shared."
    >
      <Input
        label="Whop API key"
        type="password"
        value={key}
        onChange={setKey}
        placeholder="Paste your key here"
        autoFocus
        disabled={state === 'loading' || state === 'done'}
      />

      <a
        href="https://whop.com/settings"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: C.brand, textDecoration: 'none' }}
      >
        Get your key at whop.com/settings
        <ExternalLinkIcon size={12} />
      </a>

      {error && <Err msg={error} />}
      {state === 'done' && <Ok msg="Connected! Loading your brand…" />}

      <Btn
        label={state === 'loading' ? 'Connecting…' : 'Connect Whop'}
        onClick={connect}
        loading={state === 'loading'}
        disabled={state === 'done'}
      />
    </Shell>
  );
}
