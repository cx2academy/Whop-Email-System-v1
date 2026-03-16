'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function KeyboardShortcut() {
  const router = useRouter();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable;
      // CMD+K is handled by CommandPalette — skip here
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable) return;
      if (e.key === 'c' || e.key === 'C') router.push('/dashboard/campaigns/new');
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [router]);

  return null;
}
