/**
 * components/layout/dashboard-sidebar.tsx
 *
 * Left-hand navigation sidebar for the dashboard.
 * Phase 3 adds contacts/sync links; Phase 4 adds campaigns links.
 */

import Link from "next/link";
import { MailIcon, UsersIcon, BarChartIcon, SettingsIcon, ZapIcon } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: BarChartIcon },
  { href: "/dashboard/contacts", label: "Contacts", icon: UsersIcon },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: MailIcon },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChartIcon },
  { href: "/dashboard/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function DashboardSidebar() {
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <ZapIcon className="h-5 w-5 text-primary" aria-hidden="true" />
        <span className="text-sm font-bold tracking-tight text-foreground">
          Email Engine
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3">
        <p className="px-3 text-xs text-muted-foreground">
          Whop Email Engine
        </p>
      </div>
    </aside>
  );
}
