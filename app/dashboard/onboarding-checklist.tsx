'use client';

/**
 * app/dashboard/onboarding-checklist.tsx
 *
 * Adaptive onboarding checklist shown until all 4 steps are complete
 * or the user dismisses it.
 *
 * Each incomplete step shows an inline assisted action — no page navigation
 * required for steps 1-3. Step 4 (first send) reuses the QuickStart flow.
 */

import { useState, useTransition } from 'react';
import {
  saveSenderEmail,
  saveWhopApiKey,
  triggerOnboardingSync,
  dismissOnboarding,
} from '@/lib/onboarding/actions';
import { sendQuickStartEmail, type QuickStartTemplateKey } from '@/lib/quickstart/actions';
import type { OnboardingStep, OnboardingStepKey } from '@/lib/onboarding/steps';

const TEMPLATES: { key: QuickStartTemplateKey; label: string }[] = [
  { key: 'welcome', label: 'Welcome email' },
  { key: 'announcement', label: 'Announcement' },
  { key: 'newsletter', label: 'Newsletter' },
];

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  userEmail: string;
  prefillFromEmail: string; // pre-fill sender email with user account email
}

export function OnboardingChecklist({
  steps,
  completedCount,
  totalCount,
  userEmail,
  prefillFromEmail,
}: OnboardingChecklistProps) {
  const [activeStep, setActiveStep] = useState<OnboardingStepKey | null>(() => {
    // Auto-open the first incomplete step
    return steps.find((s) => !s.completed)?.key ?? null;
  });
  const [dismissed, setDismissed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [stepError, setStepError] = useState<string>('');
  const [stepSuccess, setStepSuccess] = useState<OnboardingStepKey | null>(null);

  // Step-specific state
  const [emailInput, setEmailInput] = useState(prefillFromEmail);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<QuickStartTemplateKey>('welcome');

  if (dismissed) return null;

  const progressPct = Math.round((completedCount / totalCount) * 100);

  function handleStepClick(key: OnboardingStepKey, completed: boolean) {
    if (completed) return;
    setActiveStep(activeStep === key ? null : key);
    setStepError('');
  }

  function runAction(fn: () => Promise<{ success: boolean; error?: string }>) {
    setStepError('');
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        setStepError(result.error ?? 'Something went wrong.');
      } else {
        setStepSuccess(activeStep);
        // Move to next incomplete step after short delay
        setTimeout(() => {
          setStepSuccess(null);
          const nextIncomplete = steps.find((s) => !s.completed && s.key !== activeStep);
          setActiveStep(nextIncomplete?.key ?? null);
        }, 1200);
      }
    });
  }

  function handleDismiss() {
    setDismissed(true);
    startTransition(async () => { await dismissOnboarding(); });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="font-semibold text-foreground">
            Get set up — {completedCount}/{totalCount} steps complete
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Complete these steps to send your first campaign.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="ml-4 text-xs text-muted-foreground underline hover:text-foreground"
        >
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: progressPct + '%' }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => {
          const isActive = activeStep === step.key;
          const isSuccess = stepSuccess === step.key;

          return (
            <div key={step.key} className="rounded-md border border-border overflow-hidden">
              {/* Step header row */}
              <button
                onClick={() => handleStepClick(step.key, step.completed)}
                disabled={step.completed}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40 disabled:cursor-default"
              >
                {/* Status indicator */}
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                  {step.completed ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-muted-foreground/40 text-xs text-muted-foreground">
                      {i + 1}
                    </span>
                  )}
                </span>

                <div className="flex-1 min-w-0">
                  <p className={"text-sm font-medium " + (step.completed ? 'text-muted-foreground line-through' : 'text-foreground')}>
                    {step.title}
                  </p>
                  {!isActive && !step.completed && (
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  )}
                </div>

                {!step.completed && (
                  <span className="text-xs text-muted-foreground">{isActive ? '▲' : '▼'}</span>
                )}
              </button>

              {/* Expanded inline action */}
              {isActive && !step.completed && (
                <div className="border-t border-border bg-muted/20 px-4 py-4">
                  {isSuccess ? (
                    <p className="text-sm font-medium text-green-700">✓ Done!</p>
                  ) : (
                    <>
                      <StepAction
                        stepKey={step.key}
                        userEmail={userEmail}
                        emailInput={emailInput}
                        setEmailInput={setEmailInput}
                        apiKeyInput={apiKeyInput}
                        setApiKeyInput={setApiKeyInput}
                        selectedTemplate={selectedTemplate}
                        setSelectedTemplate={setSelectedTemplate}
                        isPending={isPending}
                        onSaveSenderEmail={() => runAction(() => saveSenderEmail(emailInput))}
                        onSaveApiKey={() => runAction(() => saveWhopApiKey(apiKeyInput))}
                        onSync={() => runAction(triggerOnboardingSync)}
                        onSendTest={() =>
                          runAction(() => sendQuickStartEmail(selectedTemplate, userEmail))
                        }
                      />
                      {stepError && (
                        <p className="mt-2 text-xs text-destructive">{stepError}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-step inline action UI
// ---------------------------------------------------------------------------

interface StepActionProps {
  stepKey: OnboardingStepKey;
  userEmail: string;
  emailInput: string;
  setEmailInput: (v: string) => void;
  apiKeyInput: string;
  setApiKeyInput: (v: string) => void;
  selectedTemplate: QuickStartTemplateKey;
  setSelectedTemplate: (v: QuickStartTemplateKey) => void;
  isPending: boolean;
  onSaveSenderEmail: () => void;
  onSaveApiKey: () => void;
  onSync: () => void;
  onSendTest: () => void;
}

function StepAction({
  stepKey,
  userEmail,
  emailInput,
  setEmailInput,
  apiKeyInput,
  setApiKeyInput,
  selectedTemplate,
  setSelectedTemplate,
  isPending,
  onSaveSenderEmail,
  onSaveApiKey,
  onSync,
  onSendTest,
}: StepActionProps) {
  if (stepKey === 'sender_email') {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          We pre-filled your account email. Change it if you want to send from a different address.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            disabled={isPending}
            className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <button
            onClick={onSaveSenderEmail}
            disabled={isPending}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    );
  }

  if (stepKey === 'whop_api_key') {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Find your API key at{' '}
          <a href="https://whop.com/settings" target="_blank" rel="noopener noreferrer" className="underline">
            whop.com/settings
          </a>
          . It will be encrypted before being stored.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Paste your Whop API key"
            disabled={isPending}
            className="flex h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <button
            onClick={onSaveApiKey}
            disabled={isPending || !apiKeyInput}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    );
  }

  if (stepKey === 'contacts_synced') {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          This will import all active members from your Whop community as contacts.
          Existing contacts will not be duplicated.
        </p>
        <button
          onClick={onSync}
          disabled={isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Syncing...' : 'Sync members now'}
        </button>
      </div>
    );
  }

  if (stepKey === 'first_send') {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Pick a template and send a test email to <strong>{userEmail}</strong>.
        </p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelectedTemplate(t.key)}
              className={
                selectedTemplate === t.key
                  ? 'rounded border border-primary bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground'
                  : 'rounded border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted'
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={onSendTest}
          disabled={isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Sending...' : 'Send test email'}
        </button>
      </div>
    );
  }

  return null;
}
