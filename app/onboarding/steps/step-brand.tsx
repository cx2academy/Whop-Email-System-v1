'use client';

import { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { Shell, Input, Btn, Err, Ok, C } from '../ui';
import { saveBranding } from '@/lib/branding/actions';

interface Props {
  companyName: string;
  onNext: (companyName: string, brandColor: string, niche: string, physicalAddress: string) => void;
}

export default function StepBrand({ companyName: initial, onNext }: Props) {
  const [name, setName]           = useState(initial || '');
  const [color, setColor]         = useState('#22C55E');
  const [niche, setNiche]         = useState('');
  const [address, setAddress]     = useState('');
  const [editing, setEditing]     = useState(false);
  const [state, setState]         = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError]         = useState('');

  async function confirm() {
    if (!niche.trim()) {
      setError('Please enter your community niche.');
      return;
    }
    if (!address.trim()) {
      setError('A physical address is required for email compliance.');
      return;
    }
    setState('loading'); setError('');
    const res = await saveBranding({ 
      whopCompanyName: name, 
      brandColor: color, 
      niche,
      physicalAddress: address 
    });
    if (!res.success) { setState('error'); setError(res.error ?? 'Failed to save.'); return; }
    setState('done');
    setTimeout(() => onNext(name, color, niche, address), 600);
  }

  const initial_ = (name || '?')[0].toUpperCase();

  return (
    <Shell
      step={2} total={7}
      eyebrow="Step 2 of 7"
      headline="Is this your brand?"
      sub="We pulled this from your Whop account."
    >
      {/* Brand preview */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 10,
        padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 10, flexShrink: 0,
          background: color + '20', border: `2px solid ${color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 700, color,
          fontFamily: "'Bricolage Grotesque',system-ui,sans-serif",
        }}>
          {initial_}
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 600, color: C.text, margin: 0 }}>{name || 'Your Brand'}</p>
          <p style={{ fontSize: 12, color: C.textHint, margin: '2px 0 0' }}>From Whop</p>
        </div>
      </div>

      {/* Niche input */}
      <div style={{ marginTop: 12 }}>
        <Input 
          label="What is your community's niche?" 
          value={niche} 
          onChange={setNiche} 
          placeholder="e.g. Crypto, Sports Betting, Fitness, SaaS" 
        />
        <p style={{ fontSize: 12, color: C.textHint, margin: '4px 0 0' }}>We use this to train your AI copywriter.</p>
      </div>

      {/* Address input */}
      <div style={{ marginTop: 12 }}>
        <Input 
          label="Physical Mailing Address" 
          value={address} 
          onChange={setAddress} 
          placeholder="e.g. 123 Main St, Suite 100, Austin, TX 78701" 
        />
        <p style={{ fontSize: 12, color: C.textHint, margin: '4px 0 0' }}>Required by CAN-SPAM law for the email footer.</p>
      </div>

      {/* Edit toggle */}
      <button
        onClick={() => setEditing(!editing)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: C.textHint, fontFamily: 'inherit' }}
      >
        <ChevronDownIcon size={14} style={{ transform: editing ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
        Edit name or color
      </button>

      {editing && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Brand name" value={name} onChange={setName} placeholder="Your brand" />
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: C.textSub, display: 'block', marginBottom: 6 }}>Brand color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="color" value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ width: 40, height: 36, borderRadius: 6, border: `1px solid ${C.border}`, cursor: 'pointer', padding: 2 }}
              />
              <span style={{ fontSize: 12, color: C.textSub, fontFamily: 'monospace' }}>{color}</span>
            </div>
          </div>
        </div>
      )}

      {error && <Err msg={error} />}
      {state === 'done' && <Ok msg="Brand saved!" />}

      <Btn
        label={state === 'loading' ? 'Saving…' : "That's right →"}
        onClick={confirm}
        loading={state === 'loading'}
        disabled={state === 'done'}
      />
    </Shell>
  );
}
