'use client';

/**
 * components/email-editor/ai-panel.tsx
 *
 * Inline AI assistant panel — 3 tabs embedded in the editor.
 * Appears as a collapsible drawer below the editor toolbar.
 *
 * Tabs:
 *   ✦ Subject    — optimize the subject line
 *   ✦ Copy       — improve email body
 *   ✦ Predict    — estimate engagement
 */

import { useState, useTransition } from 'react';
import {
  SparklesIcon, ChevronDownIcon, ChevronUpIcon,
  ZapIcon, BarChart2Icon, PenLineIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  optimizeSubjectLine,
  improveEmailCopy,
  predictEngagement,
  type SubjectSuggestion,
  type CopyIssue,
  type EngagementPrediction,
} from '@/lib/ai/actions';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  subject: string;
  htmlBody: string;
  audienceSize: number;
  onApplySubject: (subject: string) => void;
  productContext?: string;
}

type Tab = 'subject' | 'copy' | 'predict';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ANGLE_COLORS: Record<string, string> = {
  curiosity: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  benefit:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  urgency:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  proof:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  story:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 7 ? 'text-green-600' : score >= 5 ? 'text-yellow-600' : 'text-red-500';
  return <span className={cn('text-xl font-bold', color)}>{score}<span className="text-sm font-normal text-muted-foreground">/10</span></span>;
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const map: Record<string, string> = {
    strong:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    average:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    'needs-work':'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const labels: Record<string, string> = { strong: 'Looks strong', average: 'Average', 'needs-work': 'Needs work' };
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', map[verdict] ?? map.average)}>
      {labels[verdict] ?? verdict}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AiPanel({ subject, htmlBody, audienceSize, onApplySubject, productContext = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('subject');
  const [isPending, startTransition] = useTransition();

  // Subject state
  const [subjectResult, setSubjectResult] = useState<{ score: number; weakness: string; suggestions: SubjectSuggestion[] } | null>(null);
  const [subjectCtx, setSubjectCtx] = useState(productContext);

  // Copy state
  const [copyResult, setCopyResult] = useState<{ overallScore: number; summary: string; issues: CopyIssue[]; ctaStrength: string; ctaSuggestion?: string } | null>(null);

  // Predict state
  const [predictResult, setPredictResult] = useState<EngagementPrediction | null>(null);

  const [error, setError] = useState<string | null>(null);

  function run(fn: () => void) {
    setError(null);
    startTransition(fn);
  }

  // ---------------------------------------------------------------------------
  // Tab: Subject
  // ---------------------------------------------------------------------------
  const SubjectTab = () => (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-muted-foreground mb-2">
          Analyzing: <span className="font-medium text-foreground">"{subject || 'No subject yet'}"</span>
        </p>
        <div className="flex gap-2">
          <input
            value={subjectCtx}
            onChange={(e) => setSubjectCtx(e.target.value)}
            placeholder="Product context (e.g. real estate course, fitness app)"
            className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={() => run(async () => {
              const r = await optimizeSubjectLine(subject, subjectCtx);
              if (r.success) setSubjectResult(r.data);
              else setError(r.error);
            })}
            disabled={isPending || !subject.trim()}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isPending && tab === 'subject' ? 'Analyzing…' : 'Optimize'}
          </button>
        </div>
      </div>

      {subjectResult && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
            <ScoreBadge score={subjectResult.score} />
            <p className="text-xs text-muted-foreground flex-1">{subjectResult.weakness}</p>
          </div>

          <div className="space-y-2">
            {subjectResult.suggestions.map((s, i) => (
              <div key={i} className="group flex items-start gap-2.5 rounded-lg border border-border bg-card p-3 hover:border-primary/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">{s.subject}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{s.why}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', ANGLE_COLORS[s.angle] ?? 'bg-muted text-muted-foreground')}>
                    {s.angle}
                  </span>
                  <button
                    onClick={() => onApplySubject(s.subject)}
                    className="rounded px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 transition-colors"
                  >
                    Use
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Tab: Copy
  // ---------------------------------------------------------------------------
  const CopyTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          AI reviews your copy for clarity, benefits, and CTA strength.
        </p>
        <button
          onClick={() => run(async () => {
            const r = await improveEmailCopy(subject, htmlBody);
            if (r.success) setCopyResult(r.data);
            else setError(r.error);
          })}
          disabled={isPending || !htmlBody.trim()}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending && tab === 'copy' ? 'Reviewing…' : 'Review copy'}
        </button>
      </div>

      {copyResult && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
            <ScoreBadge score={copyResult.overallScore} />
            <p className="text-xs text-muted-foreground flex-1">{copyResult.summary}</p>
          </div>

          {/* CTA */}
          {copyResult.ctaStrength !== 'strong' && copyResult.ctaSuggestion && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-3 py-2.5">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">
                CTA is {copyResult.ctaStrength} — try this instead:
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">"{copyResult.ctaSuggestion}"</p>
            </div>
          )}

          {/* Issues */}
          <div className="space-y-2">
            {copyResult.issues.map((issue, i) => (
              <div key={i} className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Paragraph {issue.paragraph} · {issue.type}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{issue.issue}</p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded bg-red-50 dark:bg-red-900/20 px-2 py-1.5">
                    <p className="text-[10px] font-semibold text-red-500 mb-0.5">Before</p>
                    <p className="text-xs text-foreground leading-snug">"{issue.before}"</p>
                  </div>
                  <div className="rounded bg-green-50 dark:bg-green-900/20 px-2 py-1.5">
                    <p className="text-[10px] font-semibold text-green-600 mb-0.5">After</p>
                    <p className="text-xs text-foreground leading-snug">"{issue.after}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Tab: Predict
  // ---------------------------------------------------------------------------
  const PredictTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Estimates performance based on subject + copy quality vs. industry benchmarks.
        </p>
        <button
          onClick={() => run(async () => {
            const r = await predictEngagement(subject, htmlBody, audienceSize);
            if (r.success) setPredictResult(r.data);
            else setError(r.error);
          })}
          disabled={isPending || !subject.trim() || !htmlBody.trim()}
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending && tab === 'predict' ? 'Predicting…' : 'Predict'}
        </button>
      </div>

      {predictResult && (
        <div className="space-y-3">
          {/* Verdict */}
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5">
            <VerdictBadge verdict={predictResult.verdict} />
            <p className="text-xs text-muted-foreground flex-1">{predictResult.topStrength}</p>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Open rate', low: predictResult.openRate.low, high: predictResult.openRate.high, benchmark: predictResult.openRate.benchmark },
              { label: 'Click rate', low: predictResult.clickRate.low, high: predictResult.clickRate.high, benchmark: predictResult.clickRate.benchmark },
              { label: 'Conversion', low: predictResult.conversion.low, high: predictResult.conversion.high, benchmark: null },
            ].map(({ label, low, high, benchmark }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
                <p className="text-base font-bold text-foreground">{low}–{high}%</p>
                {benchmark && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">avg {benchmark}%</p>
                )}
              </div>
            ))}
          </div>

          {/* Risk + Quick win */}
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold text-red-500 shrink-0">Risk</span>
              <p className="text-xs text-muted-foreground">{predictResult.topRisk}</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-xs font-semibold text-green-600 shrink-0">Quick win</span>
              <p className="text-xs text-muted-foreground">{predictResult.quickWin}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'subject', label: 'Subject',  icon: <ZapIcon className="h-3 w-3" /> },
    { id: 'copy',    label: 'Copy',     icon: <PenLineIcon className="h-3 w-3" /> },
    { id: 'predict', label: 'Predict',  icon: <BarChart2Icon className="h-3 w-3" /> },
  ];

  return (
    <div className="border-t border-border/60">
      {/* Toggle bar */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left hover:bg-muted/40 transition-colors"
      >
        <SparklesIcon className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">AI Assistant</span>
        <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Beta</span>
        <span className="ml-auto text-muted-foreground">
          {open ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
        </span>
      </button>

      {/* Drawer */}
      {open && (
        <div className="border-t border-border/60 bg-muted/20">
          {/* Tabs */}
          <div className="flex border-b border-border/60">
            {TABS.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
                  tab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-4">
            {error && (
              <div className="mb-3 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            {tab === 'subject' && <SubjectTab />}
            {tab === 'copy'    && <CopyTab />}
            {tab === 'predict' && <PredictTab />}
          </div>
        </div>
      )}
    </div>
  );
}
