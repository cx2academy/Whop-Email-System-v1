'use client';

import { useState, useEffect } from 'react';
import { AlertTriangleIcon, CheckCircleIcon, ShieldAlertIcon, ShieldCheckIcon, ShieldIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpamScoreResult } from '@/lib/ai/spam-score';

interface Props {
  subject: string;
  htmlBody: string;
  onScoreChange?: (canSend: boolean) => void;
}

export function SpamScorePanel({ subject, htmlBody, onScoreChange }: Props) {
  const [result, setResult] = useState<SpamScoreResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset result if content changes
  useEffect(() => {
    if (result) {
      setResult(null);
      onScoreChange?.(true);
    }
  }, [subject, htmlBody]);

  const handleCheck = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/spam-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, htmlBody }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data.data);
        onScoreChange?.(data.data.canSend);
      } else {
        setError(data.error || 'Failed to check spam score');
      }
    } catch (e) {
      setError('An error occurred while checking spam score');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <ShieldIcon className="h-5 w-5 text-primary" />
            AI Spam Analysis
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Check if your email is likely to hit the spam folder before you send.
          </p>
        </div>
        <button
          onClick={handleCheck}
          disabled={isLoading || !subject || !htmlBody}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? 'Analyzing...' : 'Check Spam Score (2 credits)'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          {/* Score Gauge */}
          <div className="flex items-center gap-6 p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 shrink-0"
                 style={{
                   borderColor: result.score < 30 ? '#22c55e' : result.score < 60 ? '#eab308' : '#ef4444',
                   backgroundColor: 'var(--background)'
                 }}>
              <span className="text-3xl font-bold" style={{ color: result.score < 30 ? '#22c55e' : result.score < 60 ? '#eab308' : '#ef4444' }}>
                {result.score}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</span>
            </div>
            
            <div className="flex-1">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                {result.verdict === 'safe' && <ShieldCheckIcon className="h-5 w-5 text-green-500" />}
                {result.verdict === 'caution' && <AlertTriangleIcon className="h-5 w-5 text-yellow-500" />}
                {result.verdict === 'danger' && <ShieldAlertIcon className="h-5 w-5 text-red-500" />}
                <span className="capitalize">{result.verdict}</span>
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {result.score < 30 && "Your email looks clean and is highly likely to reach the inbox."}
                {result.score >= 30 && result.score < 60 && "Your email has some minor issues that might cause it to land in the Promotions tab."}
                {result.score >= 60 && "Your email has major spam triggers and is very likely to be filtered to the Spam folder."}
              </p>
            </div>
          </div>

          {/* Warning Banner */}
          {!result.canSend && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800 flex items-start gap-3">
              <ShieldAlertIcon className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-sm font-semibold text-red-800 dark:text-red-300">High Risk of Spam Filtering</h5>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  This email may be filtered. We strongly recommend fixing the high-severity issues below before sending.
                </p>
              </div>
            </div>
          )}

          {/* Flags List */}
          {result.flags.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Detected Issues</h4>
              {result.flags.map((flag, i) => (
                <div key={i} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                      flag.severity === 'high' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                      flag.severity === 'medium' ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    )}>
                      {flag.severity}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {flag.type}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mb-2">{flag.description}</p>
                  <div className="rounded bg-muted/50 p-2.5 flex items-start gap-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Fix:</span> {flag.fix}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-6 text-center">
              <ShieldCheckIcon className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">No spam triggers detected!</p>
              <p className="text-xs text-muted-foreground mt-1">Your email follows best practices for deliverability.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
