'use client';

/**
 * app/dashboard/campaigns/sequence/page.tsx
 *
 * AI Campaign Sequence Builder.
 *
 * Flow:
 *  1. User fills campaign brief once (product, audience, tone, goal, key points)
 *  2. AI generates 5-email sequence plan
 *  3. Each card has two buttons:
 *     - "Write with AI" → generates full draft → navigates to editor pre-filled
 *     - "Edit manually" → navigates to editor with subject only
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeftIcon, SparklesIcon, CalendarIcon,
  PenLineIcon, LoaderIcon, CheckIcon,
} from 'lucide-react';
import {
  buildCampaignSequence,
  generateEmailDraft,
  type SequenceEmail,
  type CampaignBrief,
} from '@/lib/ai/actions';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, string> = {
  story:   'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  value:   'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300',
  proof:   'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300',
  offer:   'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  urgency: 'bg-red-100    text-red-700    dark:bg-red-900/30    dark:text-red-300',
};

function typeColor(t: string) {
  for (const [k, v] of Object.entries(TYPE_COLORS)) {
    if (t.toLowerCase().includes(k)) return v;
  }
  return 'bg-muted text-muted-foreground';
}

const TONES = ['casual', 'professional', 'inspirational', 'direct', 'friendly', 'urgent'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type CardState = 'idle' | 'generating' | 'done';

export default function SequencePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Brief fields
  const [product,   setProduct]   = useState('');
  const [audience,  setAudience]  = useState('');
  const [tone,      setTone]      = useState('casual');
  const [goal,      setGoal]      = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [error,     setError]     = useState('');

  // Sequence result
  const [brief, setBrief] = useState<CampaignBrief | null>(null);
  const [sequence, setSequence] = useState<{
    sequenceName: string;
    framework: string;
    overallStrategy: string;
    emails: SequenceEmail[];
  } | null>(null);

  // Per-card generation state
  const [cardStates, setCardStates] = useState<Record<number, CardState>>({});
  const [cardError,  setCardError]  = useState<Record<number, string>>({});
  const [cardNotes,  setCardNotes]  = useState<Record<number, { layout: string; designNotes: string; ctaText: string }>>({});

  // ---------------------------------------------------------------------------
  // Generate sequence
  // ---------------------------------------------------------------------------

  function handleGenerate() {
    if (!product.trim() || !audience.trim() || !goal.trim()) {
      setError('Product, audience, and goal are required');
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
      } else {
        setError(r.error);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Write with AI — generate full draft then navigate
  // ---------------------------------------------------------------------------

  async function handleWriteWithAI(email: SequenceEmail, idx: number) {
    if (!brief) return;
    setCardStates((s) => ({ ...s, [idx]: 'generating' }));
    setCardError((e) => { const n = { ...e }; delete n[idx]; return n; });

    const r = await generateEmailDraft(
      brief,
      email.type,
      email.purpose,
      email.subject,
      email.keyElements,
    );

    if (!r.success) {
      setCardStates((s) => ({ ...s, [idx]: 'idle' }));
      setCardError((e) => ({ ...e, [idx]: r.error }));
      return;
    }

    setCardStates((s) => ({ ...s, [idx]: 'done' }));
    setCardNotes((n) => ({ ...n, [idx]: { layout: r.data.layout, designNotes: r.data.designNotes, ctaText: r.data.ctaText } }));

    // Navigate to editor with full draft
    const params = new URLSearchParams({
      generatedSubject: r.data.subject,
      generatedHtml:    r.data.htmlBody,
    });
    router.push(`/dashboard/campaigns/new?${params.toString()}`);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/campaigns" className="flex items-center gap-1 hover:text-foreground">
          <ChevronLeftIcon className="h-4 w-4" /> Campaigns
        </Link>
        <span>/</span>
        <span className="text-foreground">AI Sequence Builder</span>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">AI Campaign Sequence Builder</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell the AI about your campaign once. It builds the plan and writes each email on demand.
        </p>
      </div>

      {/* ── Brief form ── */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Campaign brief</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Product / Offer <span className="text-destructive">*</span>
            </label>
            <input value={product} onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. real estate wholesaling course"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Audience <span className="text-destructive">*</span>
            </label>
            <input value={audience} onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. beginner real estate investors"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Goal <span className="text-destructive">*</span>
            </label>
            <input value={goal} onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. sell the course"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Tone</label>
            <div className="flex flex-wrap gap-1.5">
              {TONES.map((t) => (
                <button key={t} type="button" onClick={() => setTone(t)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                    tone === t
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  )}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Key points <span className="text-muted-foreground/60">(optional — helps AI write better emails)</span>
          </label>
          <textarea value={keyPoints} onChange={(e) => setKeyPoints(e.target.value)}
            placeholder="e.g. closed 50 deals, step-by-step system, beginner-friendly, $0 down strategies"
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button onClick={handleGenerate} disabled={isPending}
          className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
          <SparklesIcon className="h-4 w-4" />
          {isPending ? 'Building sequence…' : sequence ? 'Regenerate sequence' : 'Build my sequence'}
        </button>
      </div>

      {/* ── Sequence result ── */}
      {sequence && brief && (
        <div className="space-y-4">
          {/* Header */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <p className="text-xs font-medium text-primary uppercase tracking-wide mb-0.5">Sequence plan</p>
                <h2 className="font-semibold text-foreground">{sequence.sequenceName}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{sequence.overallStrategy}</p>
              </div>
              <div className="shrink-0 rounded-full border border-primary/20 bg-background px-3 py-1 text-xs font-mono text-primary">
                {sequence.framework}
              </div>
            </div>
          </div>

          {/* Email cards */}
          <div className="space-y-3">
            {sequence.emails.map((email, idx) => {
              const state = cardStates[idx] ?? 'idle';
              const err   = cardError[idx];

              return (
                <div key={idx} className={cn(
                  'rounded-xl border bg-card p-5 transition-colors',
                  state === 'done' ? 'border-green-300 dark:border-green-700' : 'border-border'
                )}>
                  <div className="flex items-start gap-4">
                    {/* Number */}
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
                      state === 'done'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-primary/10 text-primary'
                    )}>
                      {state === 'done' ? <CheckIcon className="h-4 w-4" /> : email.emailNumber}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Type + timing */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', typeColor(email.type))}>
                          {email.type}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarIcon className="h-3 w-3" />{email.sendTiming}
                        </span>
                      </div>

                      {/* Subject */}
                      <p className="text-sm font-semibold text-foreground">{email.subject}</p>

                      {/* Purpose */}
                      <p className="text-xs text-muted-foreground">{email.purpose}</p>

                      {/* Key elements */}
                      <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
                        {email.keyElements.map((el, i) => (
                          <li key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className="h-1 w-1 shrink-0 rounded-full bg-primary/50" />{el}
                          </li>
                        ))}
                      </ul>

                      {err && <p className="text-xs text-destructive">{err}</p>}

                      {/* Design notes — shown after AI generation */}
                      {cardNotes[idx] && (
                        <div className="rounded-lg bg-muted/50 px-3 py-2 space-y-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">AI design notes</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Layout:</span> {cardNotes[idx].layout}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">CTA:</span> "{cardNotes[idx].ctaText}" — {cardNotes[idx].designNotes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-2 shrink-0">
                      {/* Write with AI */}
                      <button
                        onClick={() => handleWriteWithAI(email, idx)}
                        disabled={state === 'generating'}
                        className={cn(
                          'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                          state === 'generating'
                            ? 'bg-primary/20 text-primary cursor-wait'
                            : state === 'done'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-primary text-primary-foreground hover:opacity-90'
                        )}
                      >
                        {state === 'generating' ? (
                          <><LoaderIcon className="h-3 w-3 animate-spin" /> Writing…</>
                        ) : state === 'done' ? (
                          <><CheckIcon className="h-3 w-3" /> Done</>
                        ) : (
                          <><SparklesIcon className="h-3 w-3" /> Write with AI</>
                        )}
                      </button>

                      {/* Edit manually */}
                      <Link
                        href={`/dashboard/campaigns/new?generatedSubject=${encodeURIComponent(email.subject)}`}
                        className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <PenLineIcon className="h-3 w-3" /> Edit manually
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground pt-2">
            "Write with AI" generates a full draft using your campaign brief. "Edit manually" opens the editor with the subject filled.
          </p>
        </div>
      )}
    </div>
  );
}
