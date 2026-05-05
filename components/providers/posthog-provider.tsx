'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
      const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
      
      if (key) {
        posthog.init(key, {
          api_host: host,
          person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
          capture_pageview: false, // Disable automatic pageview capture, as we use Next.js router events
          capture_pageleave: true,
        });
      }
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
