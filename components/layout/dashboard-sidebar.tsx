'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboardIcon, MailIcon, UsersIcon, ZapIcon,
  LayoutTemplateIcon, BarChart2Icon, SettingsIcon,
  ChevronRightIcon, DollarSignIcon, ShieldCheckIcon, ListFilterIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard',           label: 'Dashboard',   icon: LayoutDashboardIcon, exact: true },
  { href: '/dashboard/campaigns', label: 'Campaigns',   icon: MailIcon },
  {
    href: '/dashboard/contacts',  label: 'Contacts',    icon: UsersIcon,
    children: [
      { href: '/dashboard/contacts', label: 'All Contacts', icon: UsersIcon },
      { href: '/dashboard/segments', label: 'Segments',     icon: ListFilterIcon },
    ],
  },
  { href: '/dashboard/automation', label: 'Automations', icon: ZapIcon },
  { href: '/dashboard/templates',  label: 'Templates',   icon: LayoutTemplateIcon },
  {
    href: '/dashboard/analytics',  label: 'Analytics',   icon: BarChart2Icon,
    children: [
      { href: '/dashboard/analytics',     label: 'Overview',       icon: BarChart2Icon },
      { href: '/dashboard/revenue',        label: 'Revenue',        icon: DollarSignIcon },
      { href: '/dashboard/deliverability', label: 'Deliverability', icon: ShieldCheckIcon },
    ],
  },
  { href: '/dashboard/settings',  label: 'Settings',    icon: SettingsIcon, exact: true },
] as const;

export function DashboardSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside
      className="flex h-screen w-56 flex-col flex-shrink-0 sticky top-0"
      style={{
        background: 'hsl(222 47% 7%)',
        borderRight: '1px solid hsl(222 35% 11%)',
      }}
    >
      {/* Logo */}
      <div
        className="flex h-14 items-center gap-3 px-5"
        style={{ borderBottom: '1px solid hsl(222 35% 11%)' }}
      >
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs font-bold flex-shrink-0"
          style={{ background: '#22C55E', fontFamily: 'var(--font-display)' }}
        >
          R
        </div>
        <span
          className="text-[15px] font-bold text-white"
          style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}
        >
          RevTray
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
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
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-100 group',
                    open
                      ? 'text-white'
                      : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
                  )}
                  style={open ? {
                    background: 'rgba(34,197,94,0.1)',
                    borderLeft: '2px solid #22C55E',
                    paddingLeft: '10px',
                  } : {}}
                >
                  <Icon className={cn('h-4 w-4 flex-shrink-0 transition-colors', open ? 'text-emerald-400' : 'text-zinc-600 group-hover:text-zinc-400')} />
                  <span className="flex-1">{item.label}</span>
                  {'children' in item && item.children && (
                    <ChevronRightIcon className={cn('h-3 w-3 transition-transform duration-150 text-zinc-600', open && 'rotate-90')} />
                  )}
                </Link>

                {'children' in item && item.children && open && (
                  <ul className="mt-0.5 ml-4 space-y-0.5" style={{ borderLeft: '1px solid hsl(222 25% 16%)', paddingLeft: '12px' }}>
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      const childIsActive = isActive(child.href);
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={cn(
                              'flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] font-medium transition-all',
                              childIsActive
                                ? 'text-emerald-400'
                                : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'
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
      <div className="px-5 py-3" style={{ borderTop: '1px solid hsl(222 35% 11%)' }}>
        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-700">
          RevTray v1
        </p>
      </div>
    </aside>
  );
}
