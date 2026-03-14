/**
 * components/layout/dashboard-topbar.tsx
 *
 * Topbar — always shows "+ Create Campaign" CTA on the right.
 * Keyboard shortcut: C anywhere in the dashboard.
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
      {/* Left — breadcrumb slot (filled by page via portal in future) */}
      <div />

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Primary CTA */}
        <Link
          href="/dashboard/campaigns/new"
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Create Campaign
          <kbd className="ml-1 hidden rounded bg-primary-foreground/20 px-1 py-0.5 text-[10px] font-mono leading-none sm:inline">
            C
          </kbd>
        </Link>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-medium text-foreground leading-none">{user?.name ?? 'User'}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground leading-none">{user?.email}</p>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            {initials}
          </div>
          <SignOutButton />
        </div>
      </div>

      {/* Keyboard shortcut handler */}
      <KeyboardShortcut />
    </header>
  );
}
