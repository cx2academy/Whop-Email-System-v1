'use client';

/**
 * app/dashboard/campaigns/sequence/page.tsx
 *
 * AI Campaign Sequence Builder.
 * Generates a 5-email launch sequence using proven frameworks.
 */

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, SparklesIcon, ArrowRightIcon, CalendarIcon } from 'lucide-react';
import { buildCampaignSequence, type SequenceEmail } from '@/lib/ai/actions';
import { cn } from '@/lib/utils';

const EMAIL_TYPE_COLORS: Record<string, string> = {
  'Story':  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'Value':  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Proof':  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  'Offer':  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  'Urgency':'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

function emailTypeColor(type: string): string {
  for (const key of Object.keys(EMAIL_TYPE_COLORS)) {
    if (type.toLowerCase().includes(key.toLowerCase())) return EMAIL_TYPE_COLORS[key];
  }
  return 'bg-muted text-muted-foreground';
}

export default function SequencePage() {
  const [isPending, startTransition] = useTransition();

  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [goal, setGoal] = useState('');
  const [error, setError] = useState('');

  const [sequence, setSequence] = useState<{
    sequenceName: string;
    framework: string;
    overallStrategy: string;
    emails: SequenceEmail[];
  } | null>(null);

  function generate() {
    if (!product.trim() || !audience.trim() || !goal.trim()) {
      setError('All fields are required'); return;
    }
    setError('');
    startTransition(async () => {
      const r = await buildCampaignSequence(product, audience, goal);
      if (r.success) setSequence(r.data);
      else setError(r.error);
    });
  }

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
          Generate a 5-email launch sequence using proven frameworks — Story → Value → Proof → Offer → Urgency.
        </p>
      </div>

      {/* Input form */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Product</label>
            <input value={product} onChange={(e) => setProduct(e.target.value)}
              placeholder="e.g. real estate course"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Audience</label>
            <input value={audience} onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. beginner investors"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Goal</label>
            <input value={goal} onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. sell the course"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button onClick={generate} disabled={isPending}
          className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
          <SparklesIcon className="h-4 w-4" />
          {isPending ? 'Building sequence…' : 'Build my sequence'}
        </button>
      </div>

      {/* Result */}
      {sequence && (
        <div className="space-y-4">
          {/* Header */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
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
            {sequence.emails.map((email, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start gap-4">
                  {/* Number */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {email.emailNumber}
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Header row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', emailTypeColor(email.type))}>
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
                    <ul className="space-y-1">
                      {email.keyElements.map((el, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                          {el}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Write this email CTA */}
                  <Link
                    href={`/dashboard/campaigns/new?generatedSubject=${encodeURIComponent(email.subject)}`}
                    className="shrink-0 flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent hover:border-primary/30 transition-colors"
                  >
                    Write <ArrowRightIcon className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Footer CTA */}
          <div className="rounded-xl border border-dashed border-border p-4 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Ready to write? Click "Write →" on any email above to open the campaign editor pre-filled with the subject line.
            </p>
            <Link href="/dashboard/campaigns/new"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              <SparklesIcon className="h-4 w-4" />
              Start with Email 1
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
