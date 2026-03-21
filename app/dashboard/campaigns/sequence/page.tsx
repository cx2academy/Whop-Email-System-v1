'use client';

/**
 * app/dashboard/campaigns/sequence/page.tsx
 *
 * AI Campaign Sequence Builder — with "Create all as drafts" action.
 *
 * Changes from original:
 *   - Added "Create all 5 as drafts" button that calls materializeSequence()
 *   - Converts entire sequence plan into real EmailCampaign rows in one click
 *   - Shows credit cost upfront (25 credits)
 *   - After creation, redirects to campaigns list where all 5 drafts appear
 *   - Light theme applied throughout
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeftIcon, SparklesIcon, CalendarIcon,
  PenLineIcon, LoaderIcon, CheckIcon, FolderPlusIcon,
} from 'lucide-react';
import {
  buildCampaignSequence,
  generateEmailDraft,
  type SequenceEmail,
  type CampaignBrief,
} from '@/lib/ai/actions';
import { materializeSequence } from '@/lib/ai/sequence-materializer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type CardState = 'idle' | 'generating' | 'done';

const TONES = ['casual', 'professional', 'inspirational', 'direct', 'friendly', 'urgent'];

function typeColor(t: string): string {
  const lower = t.toLowerCase();
  if (lower.includes('story'))   return 'bg-[#F5F3FF] text-[#7C3AED]';
  if (lower.includes('value'))   return 'bg-[#EFF6FF] text-[#2563EB]';
  if (lower.includes('proof'))   return 'bg-[#F0FDF4] text-[#16A34A]';
  if (lower.includes('offer'))   return 'bg-[#FFF7ED] text-[#EA580C]';
  if (lower.includes('urgency')) return 'bg-[#FEF2F2] text-[#DC2626]';
  return 'bg-[#F3F4F6] text-[#5A6472]';
}

function inputClass(): string {
  return 'w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-all border border-[#E6E8EC] bg-white text-[#0D0F12] placeholder:text-[#9AA3AF] focus:border-[#22C55E]';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SequencePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Brief
  const [product,   setProduct]   = useState('');
  const [audience,  setAudience]  = useState('');
  const [tone,      setTone]      = useState('casual');
  const [goal,      setGoal]      = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [error,     setError]     = useState('');

  // Sequence result
  const [brief, setBrief]       = useState<CampaignBrief | null>(null);
  const [sequence, setSequence] = useState<{
    sequenceName: string;
    framework: string;
    overallStrategy: string;
    emails: SequenceEmail[];
  } | null>(null);

  // Per-card state
  const [cardStates, setCardStates] = useState<Record<number, CardState>>({});
  const [cardError,  setCardError]  = useState<Record<number, string>>({});
  const [cardNotes,  setCardNotes]  = useState<Record<number, { layout: string; designNotes: string; ctaText: string }>>({});

  // Materialize state
  const [materializing, setMaterializing]   = useState(false);
  const [materializeErr, setMaterializeErr] = useState('');

  // ---------------------------------------------------------------------------
  // Generate sequence plan
  // ---------------------------------------------------------------------------

  function handleGenerate() {
    if (!product.trim() || !audience.trim() || !goal.trim()) {
      setError('Product, audience, and goal are required.');
      return;
    }
    setError('');
    const b: CampaignBrief = { product, audience, tone, goal, keyPoints: keyPoints || undefined };
    startTransition(async () => {
      const r = await buildCampaignSequence(product, audience, goal);
      if (r.success) {
        setBrief(b);
        setSequence(r.data);
        setCardStates({});
        setCardError({});
        setMaterializeErr('');
      } else {
        setError(r.error);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Write one email with AI → navigate to editor
  // ---------------------------------------------------------------------------

  async function handleWriteWithAI(email: SequenceEmail, idx: number) {
    if (!brief) return;
    setCardStates((s) => ({ ...s, [idx]: 'generating' }));
    setCardError((e) => { const n = { ...e }; delete n[idx]; return n; });

    const r = await generateEmailDraft(brief, email.type, email.purpose, email.subject, email.keyElements);

    if (!r.success) {
      setCardStates((s) => ({ ...s, [idx]: 'idle' }));
      setCardError((e) => ({ ...e, [idx]: r.error }));
      return;
    }

    setCardStates((s) => ({ ...s, [idx]: 'done' }));
    setCardNotes((n) => ({
      ...n,
      [idx]: { layout: r.data.layout, designNotes: r.data.designNotes, ctaText: r.data.ctaText },
    }));

    const params = new URLSearchParams({
      generatedSubject: r.data.subject,
      generatedHtml:    r.data.htmlBody,
    });
    router.push(`/dashboard/campaigns/new?${params.toString()}`);
  }

  // ---------------------------------------------------------------------------
  // Materialize full sequence → create all 5 as draft campaigns
  // ---------------------------------------------------------------------------

  async function handleMaterializeAll() {
    if (!sequence || !brief) return;
    setMaterializeErr('');
    setMaterializing(true);

    const result = await materializeSequence({
      sequence:       sequence as any,
      brief,
      audienceTagIds: [],
    });

    setMaterializing(false);

    if (!result.success) {
      setMaterializeErr(result.error ?? 'Failed to create campaigns.');
      return;
    }

    // All campaigns created — go to campaigns list
    router.push('/dashboard/campaigns');
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">

      {/* Back */}
      <Link
        href="/dashboard/campaigns"
        className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Campaigns
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <SparklesIcon className="h-5 w-5" style={{ color: 'var(--brand)' }} />
          <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            AI sequence builder
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Describe your campaign once. Get a full 5-email sequence plan with drafts.
        </p>
      </div>

      {/* Brief form */}
      <div
        className="rounded-xl p-6 space-y-5 shadow-card"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
      >
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Campaign brief</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
              Product / offer <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. real estate wholesaling course"
              className={inputClass()}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
              Audience <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. beginner real estate investors"
              className={inputClass()}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
              Goal <span style={{ color: '#DC2626' }}>*</span>
            </label>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. sell the course"
              className={inputClass()}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
              Tone
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className="rounded-full px-3 py-1 text-xs font-medium capitalize transition-all"
                  style={
                    tone === t
                      ? { background: 'var(--brand)', color: '#fff' }
                      : { background: 'var(--surface-app)', color: 'var(--text-secondary)', border: '1px solid var(--sidebar-border)' }
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
            Key points <span className="normal-case font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
          </label>
          <textarea
            value={keyPoints}
            onChange={(e) => setKeyPoints(e.target.value)}
            placeholder="e.g. 50 deals closed, step-by-step system, $0 down strategies"
            rows={2}
            className={inputClass() + ' resize-none'}
          />
        </div>

        {error && <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--brand)' }}
        >
          <SparklesIcon className="h-4 w-4" />
          {isPending ? 'Building sequence…' : sequence ? 'Regenerate' : 'Build my sequence'}
        </button>
      </div>

      {/* Sequence result */}
      {sequence && brief && (
        <div className="space-y-4">

          {/* Sequence header + materialize CTA */}
          <div
            className="rounded-xl p-5"
            style={{ background: 'var(--brand-tint)', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#16A34A' }}>
                  Sequence ready
                </p>
                <h2 className="font-bold text-base" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                  {sequence.sequenceName}
                </h2>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {sequence.overallStrategy}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={handleMaterializeAll}
                  disabled={materializing}
                  className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.25)' }}
                >
                  {materializing ? (
                    <><LoaderIcon className="h-3.5 w-3.5 animate-spin" /> Creating drafts…</>
                  ) : (
                    <><FolderPlusIcon className="h-3.5 w-3.5" /> Create all 5 as drafts</>
                  )}
                </button>
                <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  Uses 25 AI credits · Saves to Campaigns
                </p>
                {materializeErr && (
                  <p className="text-xs text-right max-w-xs" style={{ color: '#DC2626' }}>{materializeErr}</p>
                )}
              </div>
            </div>
          </div>

          {/* Email cards */}
          <div className="space-y-3">
            {sequence.emails.map((email, idx) => {
              const state = cardStates[idx] ?? 'idle';
              const err   = cardError[idx];

              return (
                <div
                  key={idx}
                  className="rounded-xl p-5 shadow-card"
                  style={{
                    background: 'var(--surface-card)',
                    border: `1px solid ${state === 'done' ? '#BBF7D0' : 'var(--sidebar-border)'}`,
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Number */}
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                      style={
                        state === 'done'
                          ? { background: '#F0FDF4', color: '#16A34A' }
                          : { background: 'var(--brand-tint)', color: '#16A34A' }
                      }
                    >
                      {state === 'done' ? <CheckIcon className="h-4 w-4" /> : email.emailNumber}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Type + timing */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${typeColor(email.type)}`}>
                          {email.type}
                        </span>
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          <CalendarIcon className="h-3 w-3" />
                          {email.sendTiming}
                        </span>
                      </div>

                      {/* Subject */}
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {email.subject}
                      </p>

                      {/* Purpose */}
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {email.purpose}
                      </p>

                      {/* Key elements */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {email.keyElements.map((el, i) => (
                          <span key={i} className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                            <span className="h-1 w-1 shrink-0 rounded-full" style={{ background: 'var(--brand)' }} />
                            {el}
                          </span>
                        ))}
                      </div>

                      {err && <p className="text-xs" style={{ color: '#DC2626' }}>{err}</p>}

                      {/* AI design notes */}
                      {cardNotes[idx] && (
                        <div
                          className="rounded-lg px-3 py-2 space-y-1"
                          style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                            AI design notes
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Layout:</span>{' '}
                            {cardNotes[idx].layout}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>CTA:</span>{' '}
                            "{cardNotes[idx].ctaText}" — {cardNotes[idx].designNotes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleWriteWithAI(email, idx)}
                        disabled={state === 'generating'}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
                        style={
                          state === 'generating'
                            ? { background: 'var(--brand-tint)', color: '#16A34A', opacity: 0.8 }
                            : state === 'done'
                            ? { background: '#F0FDF4', color: '#16A34A' }
                            : { background: 'var(--brand)', color: '#fff' }
                        }
                      >
                        {state === 'generating' ? (
                          <><LoaderIcon className="h-3 w-3 animate-spin" /> Writing…</>
                        ) : state === 'done' ? (
                          <><CheckIcon className="h-3 w-3" /> Done</>
                        ) : (
                          <><SparklesIcon className="h-3 w-3" /> Write with AI</>
                        )}
                      </button>

                      <Link
                        href={`/dashboard/campaigns/new?generatedSubject=${encodeURIComponent(email.subject)}`}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-secondary)' }}
                      >
                        <PenLineIcon className="h-3 w-3" />
                        Edit manually
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
            "Create all as drafts" writes every email with AI and saves them — edit and send from Campaigns.
          </p>
        </div>
      )}
    </div>
  );
}
