/**
 * components/layout/dashboard-topbar.tsx — RevTray premium topbar
 */
import Link from 'next/link';
import { auth } from '@/auth';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { PlusIcon } from 'lucide-react';
import { KeyboardShortcut } from '@/components/ui/keyboard-shortcut';
import { CommandPaletteTrigger } from '@/components/ui/command-palette-trigger';

export async function DashboardTopbar() {
  const session = await auth();
  const user = session?.user;
  const initials = (user?.name ?? user?.email ?? 'U')
    .split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header
      className="flex h-14 items-center justify-between px-6 sticky top-0 z-30 flex-shrink-0"
      style={{
        background: 'hsl(222 47% 6% / 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid hsl(222 35% 11%)',
      }}
    >
      <div />

      <div className="flex items-center gap-3">
        <CommandPaletteTrigger />
        {/* Emerald CTA */}
        <Link
          href="/dashboard/campaigns/new"
          className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-semibold text-white transition-all active:scale-95 hover:opacity-90"
          style={{
            background: '#22C55E',
            boxShadow: '0 2px 12px rgba(34,197,94,0.3)',
          }}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Create Campaign
          <kbd className="ml-1 hidden rounded px-1 py-0.5 text-[10px] font-mono leading-none sm:inline" style={{ background: 'rgba(255,255,255,0.2)' }}>C</kbd>
        </Link>

        <div className="h-5 w-px" style={{ background: 'hsl(222 25% 18%)' }} />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <p className="text-[13px] font-medium text-zinc-200 leading-none">{user?.name ?? 'User'}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500 leading-none">{user?.email}</p>
          </div>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', fontFamily: 'var(--font-display)' }}
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
