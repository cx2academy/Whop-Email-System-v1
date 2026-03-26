'use client';

/**
 * app/dashboard/settings/settings-tabs.tsx
 * Tab switcher for settings — uses URL params, no state loss
 */

import Link from 'next/link';

const TABS = [
  { id: 'general',      label: 'General' },
  { id: 'branding',     label: 'Branding' },
  { id: 'sending',      label: 'Sending' },
  { id: 'billing',      label: 'Billing' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'api',          label: 'API' },
];

export function SettingsTabs({ activeTab }: { activeTab: string }) {
  return (
    <div
      className="flex gap-1 rounded-xl p-1"
      style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
    >
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={`/dashboard/settings?tab=${tab.id}`}
            className="flex-1 rounded-lg py-2 text-center text-sm font-medium transition-all"
            style={
              active
                ? { background: 'var(--surface-card)', color: 'var(--text-primary)', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
                : { color: 'var(--text-secondary)' }
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
