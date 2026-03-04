"use client";

/**
 * app/dashboard/quick-start.tsx
 *
 * Quick Start banner shown only when hasAchievedFirstSend = false.
 * Dismissed permanently after first successful send.
 */

import { useState, useTransition } from 'react';
import {
  sendQuickStartEmail,
  QUICK_START_TEMPLATES,
  type QuickStartTemplateKey,
} from '@/lib/quickstart/actions';

interface QuickStartProps {
  fromEmail: string | null;
  userEmail: string;
}

type Step = 'idle' | 'sending' | 'done' | 'error';

export function QuickStart({ fromEmail, userEmail }: QuickStartProps) {
  const [selected, setSelected] = useState<QuickStartTemplateKey>('welcome');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  const templates = Object.entries(QUICK_START_TEMPLATES) as [
    QuickStartTemplateKey,
    { label: string; subject: string }
  ][];

  function handleSend() {
    startTransition(async () => {
      setStep('sending');
      const result = await sendQuickStartEmail(selected, userEmail);
      if (result.success) {
        setStep('done');
      } else {
        setErrorMsg(result.error ?? 'Something went wrong.');
        setStep('error');
      }
    });
  }

  if (step === 'done') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="font-semibold text-green-800">Your first email is on its way!</p>
            <p className="mt-1 text-sm text-green-700">
              Check <strong>{userEmail}</strong> — it should arrive shortly.
            </p>
            <a
              href="/dashboard/campaigns/new"
              className="mt-3 inline-block rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Create a real campaign
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-800">Could not send the test email</p>
            <p className="mt-1 text-sm text-red-700">{errorMsg}</p>
            <button
              onClick={() => setStep('idle')}
              className="mt-2 text-sm font-medium text-red-700 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xl">🚀</span>
        <div>
          <p className="font-semibold text-indigo-900">Quick Start — send your first email</p>
          <p className="text-xs text-indigo-700">Pick a template and send a test to yourself in one click.</p>
        </div>
      </div>

      {!fromEmail ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No sender email configured.{' '}
          <a href="/dashboard/settings" className="font-medium underline">Go to Settings</a>{' '}
          to add one first.
        </div>
      ) : (
        <p className="mb-4 text-sm text-indigo-700">
          Sending from <strong>{fromEmail}</strong> to <strong>{userEmail}</strong>
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {templates.map(([key, t]) => (
          <button
            key={key}
            onClick={() => setSelected(key)}
            className={
              selected === key
                ? 'rounded-md border border-indigo-500 bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white'
                : 'rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-sm font-medium text-indigo-700 hover:border-indigo-400'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-xs text-indigo-600">
        Subject: <em>{QUICK_START_TEMPLATES[selected].subject}</em>
      </p>

      <button
        onClick={handleSend}
        disabled={isPending || !fromEmail || step === 'sending'}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {step === 'sending' ? 'Sending...' : 'Send test email'}
      </button>
    </div>
  );
}
