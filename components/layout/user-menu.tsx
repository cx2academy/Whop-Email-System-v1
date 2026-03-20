'use client';

/**
 * components/layout/user-menu.tsx
 * Avatar dropdown — settings + sign out. Sign out hidden by default.
 */

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { SettingsIcon, LogOutIcon } from 'lucide-react';

interface UserMenuProps {
  name: string;
  email: string;
  initials: string;
}

export function UserMenu({ name, email, initials }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#F3F4F6]"
      >
        <div className="hidden text-right sm:block">
          <p className="text-[13px] font-medium leading-none" style={{ color: 'var(--text-primary)' }}>{name}</p>
          <p className="mt-0.5 text-[11px] leading-none" style={{ color: 'var(--text-tertiary)' }}>{email}</p>
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white flex-shrink-0"
          style={{ background: 'var(--brand)' }}
        >
          {initials}
        </div>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1.5 w-52 rounded-xl py-1 z-50"
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--sidebar-border)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          }}
        >
          <div className="px-3 py-2.5 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
            <p className="text-[12px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{name}</p>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{email}</p>
          </div>
          <div className="py-1">
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-[#F3F4F6]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <SettingsIcon className="h-3.5 w-3.5" />
              Settings
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition-colors hover:bg-[#FEF2F2]"
              style={{ color: '#DC2626' }}
            >
              <LogOutIcon className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
