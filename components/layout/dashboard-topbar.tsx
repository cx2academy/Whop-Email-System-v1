/**
 * components/layout/dashboard-topbar.tsx
 * RevTray light topbar — search + avatar only. No duplicate CTAs.
 */

import { auth } from '@/auth';
import { CommandPaletteTrigger } from '@/components/ui/command-palette-trigger';
import { UserMenu } from './user-menu';
import { Breadcrumbs } from './breadcrumbs';
import { HelpCircleIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { NotificationBell } from './notification-bell';
import { requireWorkspaceAccess } from '@/lib/auth/session';

export async function DashboardTopbar() {
  const session = await auth();
  const { workspaceId, userId } = await requireWorkspaceAccess();
  
  const user = { 
    name: session?.user?.name || "User", 
    email: session?.user?.email || "" 
  };
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header
      className="flex h-14 items-center justify-between px-6 sticky top-0 z-30 flex-shrink-0"
      style={{
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.05)',
      }}
    >
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-4">
        <Breadcrumbs />
      </div>

      {/* Center: Search */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <CommandPaletteTrigger />
      </div>

      {/* Right: Actions & User Menu */}
      <div className="flex items-center gap-2">
        {/* Quick Action */}
        <Link 
          href="/dashboard/campaigns/new"
          className="hidden items-center gap-1.5 rounded-full bg-[#22C55E] px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-all hover:bg-[#16A34A] hover:shadow-md md:flex"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          New campaign
        </Link>

        <div className="h-4 w-px bg-zinc-100 mx-2" />

        {/* Notifications */}
        <NotificationBell workspaceId={workspaceId} userId={userId} />

        {/* Help */}
        <button className="rounded-full p-2 text-zinc-400 transition-all hover:bg-zinc-100 hover:text-zinc-900">
          <HelpCircleIcon className="h-4 w-4" />
        </button>

        <div className="h-4 w-px bg-zinc-100 mx-2" />

        <div className="pl-1">
          <UserMenu
            name={user?.name ?? 'User'}
            email={user?.email ?? ''}
            initials={initials}
          />
        </div>
      </div>
    </header>
  );
}
