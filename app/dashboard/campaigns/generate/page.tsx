'use client';

/**
 * app/dashboard/campaigns/generate/page.tsx
 *
 * Write with AI — describe your email in plain English, get a complete draft.
 *
 * Flow:
 *   1. Fill in brief (product, goal, tone, style)
 *   2. generateEmailDraft() — 5 credits — returns subject + full HTML
 *   3. Preview in iframe with meta panel
 *   4. "Use this email" → /dashboard/campaigns/new pre-filled
 */

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeftIcon, SparklesIcon } from 'lucide-react';
import { generateEmailDraft, type CampaignBrief } from '@/lib/ai/actions';

const TONES = [
  { value: 'casual',        label: 'Casual',        desc: 'Friendly, like a message from a friend' },
  { value: 'direct',        label: 'Direct',        desc: 'No fluff, gets straight to the point' },
  { value: 'professional',  label: 'Professional',  desc: 'Polished and credibility-first' },
  { value: 'inspirational', label: 'Inspirational', desc: 'Motivating and emotionally resonant' },
  { value: 'urgent',        label: 'Urgent',        desc: 'Creates FOMO, time-sensitive' },
];

const EMAIL_TYPES = [
  { value: 'Story / Hook',       label: 'Story hook',    desc: 'Opens with a relatable story' },
  { value: 'Direct Offer',       label: 'Direct offer',  desc: 'Lead with the value, then sell' },
  { value: 'Problem / Solution', label: 'Problem solver', desc: 'Identify pain, present solution' },
  { value: 'Social Proof',       label: 'Social proof',  desc: 'Testimonials and results first' },
  { value: 'Announcement',       label: 'Announcement',  desc: 'Clean news-style reveal' },
];

const GOAL_CHIPS = [
  'Launch a new course',
  'Drive webinar sign-ups',
  'Promote a discount',
  'Re-engage inactive subscribers',
  'Announce a new feature',
  'Upsell existing customers',
  'Build community engagement',
];

export default function GeneratePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [product,   setProduct]   = useState('');
  const [audience,  setAudience]  = useState('');
  const [goal,      setGoal]      = useState('');
  const [tone,      setTone]      = useState('casual');
  const [emailType, setEmailType] = useState('Story / Hook');
  const [keyPoints, setKeyPoints] = useState('');

  const [draft, setDraft] = useState<{
    subject: string; htmlBody: string; ctaText: string;
    layout: string; designNotes: string;
  } | null>(null);
  const [error,  setError]  = useState('');
  const [phase,  setPhase]  = useState<'brief' | 'preview'>('brief');

  function handleGenerate() {
    if (!product.trim()) { setError('Product or community name is required'); return; }
    if (!goal.trim())    { setError('Tell us the goal of this email'); return; }
    setError('');

    const brief: CampaignBrief = {
      product:   product.trim(),
      audience:  audience.trim() || 'all subscribers',
      tone,
      goal:      goal.trim(),
      keyPoints: keyPoints.trim() || undefined,
    };

    startTransition(async () => {
      const r = await generateEmailDraft(
        brief,
        emailType,
        `Write a ${emailType.toLowerCase()} email to ${goal.toLowerCase()}`,
        `${goal} — ${product}`,
        keyPoints.trim()
          ? keyPoints.split(',').map((s) => s.trim()).filter(Boolean)
          : ['clear value proposition', 'compelling CTA', 'personal closing']
      );

      if (r.success) {
        setDraft(r.data);
        setPhase('preview');
        setTimeout(() => {
          if (iframeRef.current?.contentDocument) {
            iframeRef.current.contentDocument.open();
            iframeRef.current.contentDocument.write(r.data.htmlBody);
            iframeRef.current.contentDocument.close();
          }
        }, 80);
      } else {
        setError(r.error ?? 'Generation failed. Try again.');
      }
    });
  }

  function handleUse() {
    if (!draft) return;
    router.push(
      `/dashboard/campaigns/new?generatedSubject=${encodeURIComponent(draft.subject)}&generatedHtml=${encodeURIComponent(draft.htmlBody)}`
    );
  }

  const inp = {
    border: '1.5px solid var(--sidebar-border)',
    background: 'var(--surface-card)', color: 'var(--text-primary)',
    borderRadius: 8, padding: '10px 14px', fontSize: 14,
    width: '100%', outline: 'none',
  } as const;

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    (e.target.style.borderColor = 'var(--brand)');
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    (e.target.style.borderColor = 'var(--sidebar-border)');

  /* ── Preview ─────────────────────────────────────────────────────────── */
  if (phase === 'preview' && draft) {
    return (
      <div style={{ maxWidth: 920, margin: '0 auto' }} className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setDraft(null); setPhase('brief'); }}
              className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <ChevronLeftIcon className="h-4 w-4" /> Edit brief
            </button>
            <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ background: 'rgba(34,197,94,0.12)', color: 'var(--brand)' }}>
              <SparklesIcon className="h-3 w-3" /> AI generated
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setDraft(null); setPhase('brief'); }}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-secondary)', background: 'none' }}>
              Regenerate
            </button>
            <button onClick={handleUse}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
              style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.25)' }}>
              <SparklesIcon className="h-4 w-4" /> Use this email →
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 268px', gap: '1.5rem', alignItems: 'start' }}>
          {/* Email preview */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--sidebar-border)' }}>
            <div className="flex items-center gap-2 px-4 py-2.5"
              style={{ background: 'var(--surface-app)', borderBottom: '1px solid var(--sidebar-border)' }}>
              <div className="flex gap-1.5">
                {['#FC5753','#FDBC40','#33C748'].map(c => (
                  <div key={c} className="h-3 w-3 rounded-full" style={{ background: c }} />
                ))}
              </div>
              <div className="flex-1 rounded px-3 py-1 text-xs text-center truncate"
                style={{ background: 'var(--surface-card)', color: 'var(--text-tertiary)', border: '1px solid var(--sidebar-border)' }}>
                {draft.subject}
              </div>
            </div>
            <iframe ref={iframeRef} title="Email preview" sandbox="allow-same-origin"
              style={{ width: '100%', height: 580, border: 'none', background: '#fff' }} />
          </div>

          {/* Meta panel */}
          <div className="sticky top-8 space-y-3">
            {[
              { title: 'Subject line', content: draft.subject },
              { title: 'Email structure', content: draft.layout },
            ].map(({ title, content }) => (
              <div key={title} className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{content}</p>
              </div>
            ))}

            <div className="rounded-xl p-4" style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-tertiary)' }}>CTA button</p>
              <div className="rounded-lg py-2 text-center text-sm font-bold text-white" style={{ background: 'var(--brand)' }}>
                {draft.ctaText}
              </div>
            </div>

            {draft.designNotes && (
              <div className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: '#16A34A' }}>Design note</p>
                <p className="text-xs leading-relaxed" style={{ color: '#16A34A' }}>{draft.designNotes}</p>
              </div>
            )}

            <button onClick={handleUse}
              className="w-full rounded-xl py-3 text-sm font-bold text-white hover:opacity-90"
              style={{ background: 'var(--brand)', boxShadow: '0 2px 12px rgba(34,197,94,0.28)' }}>
              Use this email →
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Brief form ───────────────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }} className="space-y-6">
      <div>
        <Link href="/dashboard/campaigns" className="flex items-center gap-1.5 text-sm mb-5"
          style={{ color: 'var(--text-secondary)' }}>
          <ChevronLeftIcon className="h-4 w-4" /> Campaigns
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'rgba(34,197,94,0.12)' }}>
            <SparklesIcon className="h-4 w-4" style={{ color: 'var(--brand)' }} />
          </div>
          <h1 className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Write with AI
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Describe your email in plain English — get a complete, conversion-focused draft in seconds. Costs 5 AI credits.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Left */}
        <div className="space-y-5">
          <div>
            <label className="block mb-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              What are you promoting? <span className="text-red-500">*</span>
            </label>
            <input style={inp} value={product} onChange={e => setProduct(e.target.value)}
              placeholder="e.g. 'Day Trading Masterclass', 'Monthly coaching'"
              onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              What should this email achieve? <span className="text-red-500">*</span>
            </label>
            <input style={inp} value={goal} onChange={e => setGoal(e.target.value)}
              placeholder="e.g. 'Get subscribers to buy before cart closes Friday'"
              onFocus={onFocus} onBlur={onBlur} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {GOAL_CHIPS.map(g => (
                <button key={g} onClick={() => setGoal(g)}
                  className="rounded-full px-2.5 py-0.5 text-xs transition-all"
                  style={{
                    background: goal === g ? 'rgba(34,197,94,0.12)' : 'var(--surface-app)',
                    color:      goal === g ? 'var(--brand)'          : 'var(--text-tertiary)',
                    border:     goal === g ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--sidebar-border)',
                  }}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Who are you writing to?{' '}
              <span className="font-normal text-xs" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
            </label>
            <input style={inp} value={audience} onChange={e => setAudience(e.target.value)}
              placeholder="e.g. 'beginner traders who haven't bought yet'"
              onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Anything specific to include?{' '}
              <span className="font-normal text-xs" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
            </label>
            <textarea style={{ ...inp, resize: 'none' } as React.CSSProperties} rows={3}
              value={keyPoints} onChange={e => setKeyPoints(e.target.value)}
              placeholder="e.g. '$197 price, cart closes Friday, 3 spots left, mention the 1:1 bonus call'"
              onFocus={onFocus} onBlur={onBlur} />
          </div>
        </div>

        {/* Right */}
        <div className="space-y-5">
          <div>
            <label className="block mb-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Tone of voice
            </label>
            <div className="space-y-2">
              {TONES.map(t => (
                <button key={t.value} onClick={() => setTone(t.value)}
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all"
                  style={{
                    border:     `1.5px solid ${tone === t.value ? 'var(--brand)' : 'var(--sidebar-border)'}`,
                    background: tone === t.value ? 'rgba(34,197,94,0.05)' : 'var(--surface-card)',
                  }}>
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
                    style={{ borderColor: tone === t.value ? 'var(--brand)' : 'var(--sidebar-border)' }}>
                    {tone === t.value && <div className="h-2 w-2 rounded-full" style={{ background: 'var(--brand)' }} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block mb-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Email style
            </label>
            <div className="space-y-1.5">
              {EMAIL_TYPES.map(t => (
                <button key={t.value} onClick={() => setEmailType(t.value)}
                  className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition-all"
                  style={{
                    border:     `1.5px solid ${emailType === t.value ? 'var(--brand)' : 'var(--sidebar-border)'}`,
                    background: emailType === t.value ? 'rgba(34,197,94,0.05)' : 'var(--surface-card)',
                  }}>
                  <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
                    style={{ borderColor: emailType === t.value ? 'var(--brand)' : 'var(--sidebar-border)' }}>
                    {emailType === t.value && <div className="h-2 w-2 rounded-full" style={{ background: 'var(--brand)' }} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-3 text-sm"
          style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <div className="flex items-center gap-4 pt-1">
        <button onClick={handleGenerate}
          disabled={isPending || !product.trim() || !goal.trim()}
          className="flex items-center gap-2.5 rounded-xl px-7 py-3.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
          style={{ background: 'var(--brand)', boxShadow: '0 2px 12px rgba(34,197,94,0.28)' }}>
          {isPending ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Writing your email…
            </>
          ) : (
            <><SparklesIcon className="h-4 w-4" /> Generate email — 5 credits</>
          )}
        </button>
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Takes about 10 seconds</p>
      </div>
    </div>
  );
}
