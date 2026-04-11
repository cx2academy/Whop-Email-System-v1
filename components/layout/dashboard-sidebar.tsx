'use client';

/**
 * components/layout/dashboard-sidebar.tsx
 * Phase 5 fix: added Templates nav item between Campaigns and Contacts.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon, MailIcon, UsersIcon, Workflow,
  BarChart2Icon, SettingsIcon, ShieldCheckIcon,
  FormInputIcon, LayoutTemplateIcon,
  ChevronLeft, ChevronRight, ZapIcon, XIcon,
  FilterIcon, CircleDollarSignIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar-context';

const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { href: '/dashboard',                label: 'Home',         icon: HomeIcon,            exact: true },
      { href: '/dashboard/campaigns',      label: 'Campaigns',    icon: MailIcon },
      { href: '/dashboard/contacts',       label: 'Contacts',     icon: UsersIcon },
      { href: '/dashboard/segments',       label: 'Segments',     icon: FilterIcon },
    ]
  },
  {
    label: 'Growth',
    items: [
      { href: '/dashboard/templates',      label: 'Templates',    icon: LayoutTemplateIcon },
      { href: '/dashboard/forms',          label: 'Forms',        icon: FormInputIcon },
      { href: '/dashboard/automation',     label: 'Auto-send',    icon: Workflow },
    ]
  },
  {
    label: 'Insights',
    items: [
      { href: '/dashboard/analytics',      label: 'Analytics',    icon: BarChart2Icon },
      { href: '/dashboard/revenue',        label: 'Revenue',      icon: CircleDollarSignIcon },
      { href: '/dashboard/deliverability', label: 'Inbox health', icon: ShieldCheckIcon },
    ]
  }
];

const BOTTOM_NAV = [
  { href: '/dashboard/settings',       label: 'Settings',     icon: SettingsIcon,        exact: true },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { isCollapsed, toggleSidebar } = useSidebar();
  const [isPlanDismissed, setIsPlanDismissed] = useState(true); // Default true to prevent hydration mismatch, then set false

  useEffect(() => {
    const dismissed = sessionStorage.getItem('planDismissed') === 'true';
    setIsPlanDismissed(dismissed);
  }, []);

  function dismissPlan() {
    sessionStorage.setItem('planDismissed', 'true');
    setIsPlanDismissed(true);
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  }

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col flex-shrink-0 sticky top-0 pb-6 transition-all duration-300 ease-in-out",
        isCollapsed ? "w-[72px]" : "w-[240px]"
      )}
      style={{
        background:  'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Logo Section */}
      <div
        className={cn(
          "relative flex h-14 items-center gap-2.5 transition-all duration-300 ease-in-out",
          isCollapsed ? "px-4 justify-center" : "px-6"
        )}
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0 overflow-hidden">
          <div className="flex h-8 w-8 items-center justify-center flex-shrink-0">
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="sidebar-top-flap-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4ADE80"></stop>
                  <stop offset="100%" stopColor="#15803D"></stop>
                </linearGradient>
                <linearGradient id="sidebar-bot-flap-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4ADE80"></stop>
                  <stop offset="100%" stopColor="#22C55E"></stop>
                </linearGradient>
              </defs>
              <g transform="rotate(-12 50 50)">
                <path d="M 5 36 L 50 6 L 95 36 Z" fill="url(#sidebar-top-flap-grad)" stroke="url(#sidebar-top-flap-grad)" strokeWidth="2" strokeLinejoin="round"></path>
                <path d="M 5 40 L 95 40 L 95 86 L 5 86 Z" fill="#064E3B" stroke="#064E3B" strokeWidth="2" strokeLinejoin="round"></path>
                <path d="M 5 40 L 50 66 L 5 86 Z" fill="#16A34A" stroke="#16A34A" strokeWidth="2" strokeLinejoin="round"></path>
                <path d="M 95 40 L 50 66 L 95 86 Z" fill="#15803D" stroke="#15803D" strokeWidth="2" strokeLinejoin="round"></path>
                <path d="M 5 86 L 50 56 L 95 86 Z" fill="url(#sidebar-bot-flap-grad)" stroke="url(#sidebar-bot-flap-grad)" strokeWidth="2" strokeLinejoin="round"></path>
                <path d="M 5 86 L 50 56 L 95 86" fill="none" stroke="#09090B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"></path>
              </g>
            </svg>
          </div>
          {!isCollapsed && (
            <span
              className="text-[16px] font-bold tracking-tight truncate"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              RevTray
            </span>
          )}
        </div>
        
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "absolute -right-1 top-5 flex h-5 w-5 items-center justify-center transition-all hover:scale-125 z-50",
            "bg-transparent"
          )}
          style={{ color: 'var(--text-tertiary)' }}
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className={cn(
        "flex-1 overflow-y-auto py-6 space-y-8",
        isCollapsed ? "px-2" : "px-4"
      )}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!isCollapsed && (
              <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70" style={{ color: 'var(--text-tertiary)' }}>
                {group.label}
              </h3>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon   = item.icon;
                const active = isActive(item.href, 'exact' in item ? item.exact : false);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        'flex items-center gap-3 rounded-md transition-all duration-150',
                        isCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
                        active ? 'text-[#16A34A]' : 'hover:bg-muted/50'
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
                      {!isCollapsed && <span className="text-[14px] font-medium">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Section: Settings & Plan */}
      <div className={cn(
        "mt-auto space-y-4",
        isCollapsed ? "px-2" : "px-4"
      )}>
        <ul className="space-y-1">
          {BOTTOM_NAV.map((item) => {
            const Icon   = item.icon;
            const active = isActive(item.href, 'exact' in item ? item.exact : false);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md transition-all duration-150',
                    isCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
                    active ? 'text-[#16A34A]' : 'hover:bg-muted/50'
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
                  {!isCollapsed && <span className="text-[14px] font-medium">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Plan badge */}
        {!isPlanDismissed && (
          !isCollapsed ? (
            <div
              className="flex flex-col gap-3 rounded-xl p-4 relative"
              style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
            >
              <button 
                onClick={dismissPlan}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
                title="Dismiss"
              >
                <XIcon className="h-4 w-4" />
              </button>
              <div>
                <p className="text-[13px] font-semibold text-foreground" style={{ color: 'var(--text-primary)' }}>Free plan</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>0 / 10,000 emails</p>
              </div>
              <Link
                href="/upgrade"
                className="flex w-full items-center justify-center rounded-lg px-3 py-2 text-[13px] font-semibold text-white transition-all hover:opacity-90"
                style={{ background: '#16A34A', boxShadow: '0 2px 8px rgba(22, 163, 74, 0.2)' }}
              >
                Upgrade plan
              </Link>
            </div>
          ) : (
            <div className="flex justify-center">
               <Link
                href="/upgrade"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-all hover:opacity-90"
                style={{ background: '#16A34A' }}
                title="Upgrade plan"
              >
                <ZapIcon className="h-4 w-4" />
              </Link>
            </div>
          )
        )}
      </div>
    </aside>
  );
}
