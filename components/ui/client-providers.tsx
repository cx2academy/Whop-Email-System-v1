'use client';

/**
 * components/ui/client-providers.tsx
 *
 * Wraps all client-side context providers for the dashboard.
 *
 * WHY THIS EXISTS:
 * dashboard/layout.tsx is a Server Component (async function).
 * Client components like UpgradeModalProvider use useState/useContext.
 * In Next.js App Router, when a Server Component renders a Client Component
 * and passes {children} into it, those children are RSC payloads — they are
 * NOT part of the client component's React subtree, so useContext() calls
 * inside them see the default context value (the no-op), not the provider state.
 *
 * The correct pattern: a dedicated 'use client' wrapper that takes children
 * as a prop. Because THIS file is the client boundary, everything rendered
 * inside it (including children passed from the server) is part of the same
 * React tree and can access context properly.
 */

import { UpgradeModalProvider } from '@/components/ui/plan-usage';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <UpgradeModalProvider>
      {children}
    </UpgradeModalProvider>
  );
}
