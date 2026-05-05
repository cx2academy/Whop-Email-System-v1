/**
 * lib/onboarding/steps.ts
 *
 * Pure, rule-based onboarding step derivation.
 * No external calls — derives completion entirely from existing DB state.
 *
 * Steps:
 *   1. sender_email    — workspace.fromEmail is configured
 *   2. whop_api_key    — workspace.whopApiKey is configured
 *   3. contacts_synced — at least one SUBSCRIBED contact exists
 *   4. first_send      — user.hasAchievedFirstSend = true
 */

export type OnboardingStepKey =
  | 'sender_email'
  | 'whop_api_key'
  | 'contacts_synced'
  | 'first_send';

export interface OnboardingStep {
  key: OnboardingStepKey;
  title: string;
  description: string;
  cta: string;          // button / action label
  completed: boolean;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  isComplete: boolean;   // all 4 steps done
  shouldShow: boolean;   // show checklist to this user
}

interface DeriveInput {
  fromEmail: string | null | undefined;
  hasWhopApiKey: boolean;
  contactCount: number;
  hasAchievedFirstSend: boolean;
  onboardingDismissedAt: Date | null | undefined;
}

export function deriveOnboardingState(input: DeriveInput): OnboardingState {
  const steps: OnboardingStep[] = [
    {
      key: 'sender_email',
      title: 'Set your sender email',
      description: 'The email address your subscribers will see in the From field.',
      cta: 'Add sender email',
      completed: !!input.fromEmail,
    },
    {
      key: 'whop_api_key',
      title: 'Connect your Whop account',
      description: 'Add your Whop API key so we can sync your community members.',
      cta: 'Add API key',
      completed: input.hasWhopApiKey,
    },
    {
      key: 'contacts_synced',
      title: 'Sync your members',
      description: 'Import your Whop community members as contacts.',
      cta: 'Sync members',
      completed: input.contactCount > 0,
    },
    {
      key: 'first_send',
      title: 'Send your first email',
      description: 'Send a test email to yourself to confirm everything is working.',
      cta: 'Send test email',
      completed: input.hasAchievedFirstSend,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const isComplete = completedCount === steps.length;

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    isComplete,
    // Show if: not all complete AND user hasn't explicitly dismissed
    shouldShow: !isComplete && !input.onboardingDismissedAt,
  };
}
