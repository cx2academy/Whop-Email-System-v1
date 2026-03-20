/**
 * app/dashboard/layout.tsx
 * RevTray light layout shell
 */

import { requireWorkspaceAccess } from '@/lib/auth/session';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { DashboardTopbar } from '@/components/layout/dashboard-topbar';
import { CommandPalette } from '@/components/ui/command-palette';
import { ClientProviders } from '@/components/ui/client-providers';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireWorkspaceAccess();

  return (
    <ClientProviders>
      <div className="flex min-h-screen" style={{ background: 'var(--surface-app)' }}>
        <DashboardSidebar />
        <div className="flex flex-1 flex-col min-w-0">
          <DashboardTopbar />
          <main className="flex-1 overflow-auto animate-fade-up">
            <div className="mx-auto max-w-5xl px-8 py-8">
              {children}
            </div>
          </main>
        </div>
        <CommandPalette />
      </div>
    </ClientProviders>
  );
}
