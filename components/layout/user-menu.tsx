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
        className="flex items-center gap-2 rounded-full p-0.5 transition-all hover:bg-zinc-100"
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white flex-shrink-0 shadow-sm"
          style={{ background: 'var(--brand)' }}
        >
          {initials}
        </div>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-2xl py-1.5 z-50 overflow-hidden"
          style={{
            background: 'white',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
          }}
        >
          <div className="px-4 py-3 border-b border-zinc-50">
            <p className="text-[13px] font-semibold text-zinc-900 truncate">{name}</p>
            <p className="text-[11px] text-zinc-500 truncate mt-0.5">{email}</p>
          </div>
          <div className="py-1.5">
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-[13px] text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
            >
              <SettingsIcon className="h-4 w-4 text-zinc-400" />
              Settings
            </Link>
            <div className="h-px bg-zinc-50 my-1" />
            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="flex w-full items-center gap-3 px-4 py-2 text-[13px] text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOutIcon className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
