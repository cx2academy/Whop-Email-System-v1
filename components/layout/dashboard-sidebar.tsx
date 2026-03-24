'use client';

/**
 * components/layout/dashboard-sidebar.tsx
 * RevTray light sidebar — updated with Forms nav item (Phase 4)
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon, MailIcon, UsersIcon, ZapIcon,
  BarChart2Icon, SettingsIcon, ShieldCheckIcon, FormInputIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard',                label: 'Home',         icon: HomeIcon,        exact: true },
  { href: '/dashboard/campaigns',      label: 'Campaigns',    icon: MailIcon },
  { href: '/dashboard/contacts',       label: 'Contacts',     icon: UsersIcon },
  { href: '/dashboard/forms',          label: 'Forms',        icon: FormInputIcon },
  { href: '/dashboard/automation',     label: 'Auto-send',    icon: ZapIcon },
  { href: '/dashboard/analytics',      label: 'Analytics',    icon: BarChart2Icon },
  { href: '/dashboard/deliverability', label: 'Inbox health', icon: ShieldCheckIcon },
  { href: '/dashboard/settings',       label: 'Settings',     icon: SettingsIcon,    exact: true },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside
      className="flex h-screen w-[220px] flex-col flex-shrink-0 sticky top-0"
      style={{
        background:  'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex h-14 items-center gap-2.5 px-5"
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
          style={{ background: 'var(--brand)' }}
        >
          <svg width="14" height="14" viewBox="0 0 100 100" fill="none">
            <path d="M72 18 A38 38 0 1 0 88 58 Q94 72 82 82 Q68 92 50 88" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round"/>
            <path d="M85 15 L32 46 L44 58 L52 80 L63 62 Z" fill="white"/>
          </svg>
        </div>
        <span
          className="text-[15px] font-bold"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em', color: 'var(--text-primary)' }}
        >
          RevTray
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const Icon   = item.icon;
            const active = isActive(item.href, 'exact' in item ? item.exact : false);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-100',
                    active ? 'text-[#16A34A]' : 'hover:bg-[#F3F4F6]'
                  )}
                  style={
                    active
                      ? { background: 'var(--brand-tint)', color: '#16A34A' }
                      : { color: 'var(--text-secondary)' }
                  }
                >
                  <Icon
                    className="h-4 w-4 flex-shrink-0"
                    style={{ color: active ? '#16A34A' : 'var(--text-tertiary)' }}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Plan badge */}
      <div
        className="px-4 py-4"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}
      >
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2.5"
          style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
        >
          <div>
            <p className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>Free plan</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>10,000 emails / mo</p>
          </div>
          <Link
            href="/dashboard/settings?tab=billing"
            className="rounded-md px-2 py-1 text-[11px] font-semibold transition-colors"
            style={{ background: 'var(--brand-tint)', color: '#16A34A' }}
          >
            Upgrade
          </Link>
        </div>
      </div>
    </aside>
  );
}
