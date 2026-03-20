/**
 * components/layout/dashboard-topbar.tsx
 * RevTray light topbar — search + avatar only. No duplicate CTAs.
 */

import { auth } from '@/auth';
import { CommandPaletteTrigger } from '@/components/ui/command-palette-trigger';
import { UserMenu } from './user-menu';

export async function DashboardTopbar() {
  const session = await auth();
  const user = session?.user;
  const initials = (user?.name ?? user?.email ?? 'U')
    .split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header
      className="flex h-14 items-center justify-between px-6 sticky top-0 z-30 flex-shrink-0"
      style={{
        background: 'rgba(247,248,250,0.92)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Left: search */}
      <div className="flex items-center gap-3">
        <CommandPaletteTrigger />
      </div>

      {/* Right: avatar dropdown only */}
      <UserMenu
        name={user?.name ?? 'User'}
        email={user?.email ?? ''}
        initials={initials}
      />
    </header>
  );
}
