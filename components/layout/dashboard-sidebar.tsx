'use client';

/**
 * components/layout/dashboard-sidebar.tsx
 *
 * Redesigned sidebar — 7 top-level items, grouped sub-nav, active states.
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
  TagIcon,
  ListFilterIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Nav structure — 7 top-level items, some with children
// ---------------------------------------------------------------------------

const NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboardIcon,
    exact: true,
  },
  {
    href: '/dashboard/campaigns',
    label: 'Campaigns',
    icon: MailIcon,
  },
  {
    href: '/dashboard/contacts',
    label: 'Contacts',
    icon: UsersIcon,
    children: [
      { href: '/dashboard/contacts',  label: 'All Contacts', icon: UsersIcon },
      { href: '/dashboard/segments',  label: 'Segments',     icon: ListFilterIcon },
    ],
  },
  {
    href: '/dashboard/automation',
    label: 'Automations',
    icon: ZapIcon,
  },
  {
    href: '/dashboard/templates',
    label: 'Templates',
    icon: LayoutTemplateIcon,
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    icon: BarChart2Icon,
    children: [
      { href: '/dashboard/analytics',      label: 'Overview',      icon: BarChart2Icon },
      { href: '/dashboard/revenue',         label: 'Revenue',       icon: DollarSignIcon },
      { href: '/dashboard/deliverability',  label: 'Deliverability', icon: ShieldCheckIcon },
    ],
  },
  {
    href: '/dashboard/settings',
    label: 'Settings',
    icon: SettingsIcon,
    exact: true,
  },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DashboardSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside className="flex h-screen w-52 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <MailIcon className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Email Engine
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
                    open
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
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
                  <ul className="mt-0.5 ml-3 space-y-0.5 border-l border-border pl-3">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const childIsActive = isActive(child.href);
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-all',
                              childIsActive
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
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
      <div className="border-t border-border px-3 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
          Whop Email Engine
        </p>
      </div>
    </aside>
  );
}
