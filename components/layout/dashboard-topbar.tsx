/**
 * components/layout/dashboard-topbar.tsx
 * RevTray topbar — emerald Create Campaign CTA, C keyboard shortcut.
 */

import Link from 'next/link';
import { auth } from '@/auth';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { PlusIcon } from 'lucide-react';
import { KeyboardShortcut } from '@/components/ui/keyboard-shortcut';

export async function DashboardTopbar() {
  const session = await auth();
  const user = session?.user;
  const initials = (user?.name ?? user?.email ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6 sticky top-0 z-30">
      <div />

      <div className="flex items-center gap-3">
        {/* Primary CTA — RevTray emerald */}
        <Link
          href="/dashboard/campaigns/new"
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-95"
          style={{
            background: '#10B981',
            boxShadow: '0 2px 8px rgba(16,185,129,0.35)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#059669';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(16,185,129,0.45)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = '#10B981';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(16,185,129,0.35)';
          }}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Create Campaign
          <kbd className="ml-1 hidden rounded px-1 py-0.5 text-[10px] font-mono leading-none sm:inline"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            C
          </kbd>
        </Link>

        <div className="h-6 w-px bg-border" />

        {/* User info */}
        <div className="flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium text-foreground leading-none">{user?.name ?? 'User'}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground leading-none">{user?.email}</p>
          </div>
          {/* Avatar — emerald */}
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              fontFamily: 'var(--font-display)',
            }}
          >
            {initials}
          </div>
          <SignOutButton />
        </div>
      </div>

      <KeyboardShortcut />
    </header>
  );
}
