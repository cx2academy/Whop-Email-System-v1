'use client';

/**
 * components/layout/dashboard-sidebar.tsx
 *
 * RevTray dark sidebar — matches the landing page mock dashboard aesthetic.
 * Dark navy background, emerald active states, Bricolage Grotesque logo.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboardIcon,
  MailIcon,
  UsersIcon,
  ZapIcon,
  LayoutTemplateIcon,
  BarChart2Icon,
  SettingsIcon,
  ChevronRightIcon,
  DollarSignIcon,
  ShieldCheckIcon,
  ListFilterIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard',              label: 'Dashboard',   icon: LayoutDashboardIcon, exact: true },
  { href: '/dashboard/campaigns',    label: 'Campaigns',   icon: MailIcon },
  {
    href: '/dashboard/contacts',
    label: 'Contacts',
    icon: UsersIcon,
    children: [
      { href: '/dashboard/contacts',  label: 'All Contacts', icon: UsersIcon },
      { href: '/dashboard/segments',  label: 'Segments',     icon: ListFilterIcon },
    ],
  },
  { href: '/dashboard/automation',   label: 'Automations', icon: ZapIcon },
  { href: '/dashboard/templates',    label: 'Templates',   icon: LayoutTemplateIcon },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    icon: BarChart2Icon,
    children: [
      { href: '/dashboard/analytics',     label: 'Overview',       icon: BarChart2Icon },
      { href: '/dashboard/revenue',        label: 'Revenue',        icon: DollarSignIcon },
      { href: '/dashboard/deliverability', label: 'Deliverability', icon: ShieldCheckIcon },
    ],
  },
  { href: '/dashboard/settings',     label: 'Settings',    icon: SettingsIcon, exact: true },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside
      className="flex h-screen w-52 flex-col"
      style={{ background: '#0D1625', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div
        className="flex h-14 items-center gap-2.5 px-4"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs font-bold"
          style={{ background: '#10B981', fontFamily: 'var(--font-display)' }}
        >
          R
        </div>
        <span
          className="text-base font-bold text-white tracking-tight"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}
        >
          RevTray
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href, 'exact' in item ? item.exact : false);
            const childActive = 'children' in item && item.children?.some((c) => isActive(c.href));
            const open = active || childActive;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all duration-100',
                  )}
                  style={
                    open
                      ? {
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#4ADE80',
                          borderRight: '2px solid #10B981',
                        }
                      : {
                          color: 'rgba(255,255,255,0.45)',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (!open) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                      (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.85)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!open) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)';
                    }
                  }}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {'children' in item && item.children && (
                    <ChevronRightIcon
                      className={cn(
                        'h-3 w-3 transition-transform duration-150',
                        open && 'rotate-90'
                      )}
                    />
                  )}
                </Link>

                {/* Sub-nav */}
                {'children' in item && item.children && open && (
                  <ul
                    className="mt-0.5 ml-3 space-y-0.5 pl-3"
                    style={{ borderLeft: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const childIsActive = isActive(child.href);
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className="flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-all"
                            style={
                              childIsActive
                                ? { color: '#4ADE80' }
                                : { color: 'rgba(255,255,255,0.38)' }
                            }
                            onMouseEnter={(e) => {
                              if (!childIsActive)
                                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)';
                            }}
                            onMouseLeave={(e) => {
                              if (!childIsActive)
                                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.38)';
                            }}
                          >
                            <ChildIcon className="h-3 w-3 flex-shrink-0" />
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>
          RevTray
        </p>
      </div>
    </aside>
  );
}
