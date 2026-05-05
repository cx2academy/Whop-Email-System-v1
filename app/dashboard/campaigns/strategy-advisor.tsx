/**
 * app/dashboard/campaigns/strategy-advisor.tsx
 *
 * Small AI strategy tip card. Server-rendered, shown above campaign list.
 * Silently skipped if AI call fails.
 */

import Link from 'next/link';
import { SparklesIcon, ArrowRightIcon } from 'lucide-react';
import { getStrategyAdvice } from '@/lib/ai/actions';

export async function StrategyAdvisor() {
  const result = await getStrategyAdvice().catch(() => null);
  if (!result?.success) return null;

  const tip = result.data;
  const priorityBg =
    tip.priority === 'high'   ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20' :
    tip.priority === 'medium' ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20' :
    'border-border bg-muted/30';

  return (
    <div className={`rounded-xl border p-4 ${priorityBg}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <SparklesIcon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-xs font-semibold text-foreground">{tip.headline}</p>
            <span className="text-[10px] text-muted-foreground">{tip.trigger}</span>
          </div>
          <p className="text-xs text-muted-foreground">{tip.advice}</p>
        </div>
        <Link href={tip.actionHref}
          className="shrink-0 flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity whitespace-nowrap">
          {tip.action} <ArrowRightIcon className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
