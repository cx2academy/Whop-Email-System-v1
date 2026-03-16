'use client';

/**
 * components/ui/command-palette.tsx
 * CMD+K command palette — premium power-user feature.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlusIcon, MailIcon, UsersIcon, BarChart2Icon, SettingsIcon,
  ZapIcon, LayoutTemplateIcon, DollarSignIcon, SparklesIcon,
  SearchIcon, ArrowRightIcon,
} from 'lucide-react';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  href?: string;
  action?: () => void;
  group: string;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState(0);

  const COMMANDS: Command[] = [
    { id: 'new-campaign',  label: 'Create Campaign',           description: 'Build and send a new email campaign', icon: <PlusIcon className="h-4 w-4" />,            href: '/dashboard/campaigns/new',      group: 'Actions' },
    { id: 'ai-sequence',   label: 'Generate AI Sequence',      description: 'Build a 5-email launch sequence with AI', icon: <SparklesIcon className="h-4 w-4" />,        href: '/dashboard/campaigns/sequence', group: 'Actions' },
    { id: 'campaigns',     label: 'View Campaigns',            description: 'See all your email campaigns',         icon: <MailIcon className="h-4 w-4" />,             href: '/dashboard/campaigns',          group: 'Navigate' },
    { id: 'dashboard',     label: 'Go to Dashboard',           description: 'Return to the main overview',          icon: <BarChart2Icon className="h-4 w-4" />,        href: '/dashboard',                    group: 'Navigate' },
    { id: 'contacts',      label: 'View Contacts',             description: 'Manage your subscriber list',          icon: <UsersIcon className="h-4 w-4" />,            href: '/dashboard/contacts',           group: 'Navigate' },
    { id: 'analytics',     label: 'Open Analytics',            description: 'View campaign performance data',       icon: <BarChart2Icon className="h-4 w-4" />,        href: '/dashboard/analytics',          group: 'Navigate' },
    { id: 'revenue',       label: 'Revenue Dashboard',         description: 'See revenue attributed to emails',     icon: <DollarSignIcon className="h-4 w-4" />,       href: '/dashboard/revenue',            group: 'Navigate' },
    { id: 'automations',   label: 'Automations',               description: 'Manage email workflows',               icon: <ZapIcon className="h-4 w-4" />,              href: '/dashboard/automation',         group: 'Navigate' },
    { id: 'templates',     label: 'Templates',                 description: 'Browse and create email templates',    icon: <LayoutTemplateIcon className="h-4 w-4" />,   href: '/dashboard/templates',          group: 'Navigate' },
    { id: 'settings',      label: 'Settings',                  description: 'Workspace and account settings',       icon: <SettingsIcon className="h-4 w-4" />,         href: '/dashboard/settings',           group: 'Navigate' },
  ];

  const filtered = query.trim()
    ? COMMANDS.filter((c) =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS;

  // Group results
  const groups = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  const flatFiltered = Object.values(groups).flat();

  const execute = useCallback((cmd: Command) => {
    setOpen(false);
    setQuery('');
    if (cmd.href) router.push(cmd.href);
    else if (cmd.action) cmd.action();
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => { setSelected(0); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, flatFiltered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && flatFiltered[selected]) execute(flatFiltered[selected]);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: '#111827', border: '1px solid #1F2937', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid #1F2937' }}>
          <SearchIcon className="h-4 w-4 flex-shrink-0 text-zinc-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands…"
            className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
          />
          <kbd className="hidden rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-600 sm:inline" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #374151' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {flatFiltered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-600">No commands found</div>
          ) : (
            Object.entries(groups).map(([group, cmds]) => (
              <div key={group}>
                <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{group}</div>
                {cmds.map((cmd) => {
                  const globalIdx = flatFiltered.indexOf(cmd);
                  const isSelected = globalIdx === selected;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelected(globalIdx)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{ background: isSelected ? 'rgba(34,197,94,0.08)' : 'transparent' }}
                    >
                      <div
                        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
                        style={{ background: isSelected ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)', color: isSelected ? '#22C55E' : '#6B7280' }}
                      >
                        {cmd.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: isSelected ? '#E2E8F0' : '#9CA3AF' }}>{cmd.label}</p>
                        {cmd.description && <p className="text-xs text-zinc-600 truncate">{cmd.description}</p>}
                      </div>
                      {isSelected && <ArrowRightIcon className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2.5" style={{ borderTop: '1px solid #1F2937', background: 'rgba(255,255,255,0.02)' }}>
          {[['↑↓','Navigate'],['↵','Open'],['⌘K','Toggle']].map(([key, label]) => (
            <div key={label} className="flex items-center gap-1.5">
              <kbd className="rounded px-1.5 py-0.5 text-[10px] font-mono text-zinc-500" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #374151' }}>{key}</kbd>
              <span className="text-[11px] text-zinc-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
