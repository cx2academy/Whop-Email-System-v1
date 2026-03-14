'use client';

/**
 * components/ui/keyboard-shortcut.tsx
 *
 * Global keyboard shortcuts for the dashboard.
 * C → Create Campaign
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function KeyboardShortcut() {
  const router = useRouter();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Ignore if focus is in an input, textarea, or contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'c' || e.key === 'C') {
        router.push('/dashboard/campaigns/new');
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [router]);

  return null;
}
