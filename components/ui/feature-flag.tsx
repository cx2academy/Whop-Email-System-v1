'use client';

import { useFeatureFlagEnabled } from 'posthog-js/react';

interface FeatureFlagProps {
  flag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * A simple wrapper to conditionally render content based on a PostHog feature flag.
 */
export function FeatureFlag({ flag, children, fallback = null }: FeatureFlagProps) {
  const isEnabled = useFeatureFlagEnabled(flag);

  if (isEnabled) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
