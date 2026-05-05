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
    { id: 'new-automation', label: 'New Automation',           description: 'Create a new automated workflow',      icon: <ZapIcon className="h-4 w-4" />,             href: '/dashboard/automations/new',    group: 'Actions' },
    { id: 'ai-sequence',   label: 'Generate AI Sequence',      description: 'Build a 5-email launch sequence with AI', icon: <SparklesIcon className="h-4 w-4" />,        href: '/dashboard/campaigns/sequence', group: 'Actions' },
    { id: 'dashboard',     label: 'Go to Dashboard',           description: 'Return to the main overview',          icon: <BarChart2Icon className="h-4 w-4" />,        href: '/dashboard',                    group: 'Navigate' },
    { id: 'campaigns',     label: 'View Campaigns',            description: 'See all your email campaigns',         icon: <MailIcon className="h-4 w-4" />,             href: '/dashboard/campaigns',          group: 'Navigate' },
    { id: 'contacts',      label: 'View Contacts',             description: 'Manage your subscriber list',          icon: <UsersIcon className="h-4 w-4" />,            href: '/dashboard/contacts',           group: 'Navigate' },
    { id: 'automations',   label: 'Automations',               description: 'Manage email workflows',               icon: <ZapIcon className="h-4 w-4" />,              href: '/dashboard/automations',        group: 'Navigate' },
    { id: 'analytics',     label: 'Open Analytics',            description: 'View campaign performance data',       icon: <BarChart2Icon className="h-4 w-4" />,        href: '/dashboard/analytics',          group: 'Navigate' },
    { id: 'revenue',       label: 'Revenue Dashboard',         description: 'See revenue attributed to emails',     icon: <DollarSignIcon className="h-4 w-4" />,       href: '/dashboard/revenue',            group: 'Navigate' },
    { id: 'settings',      label: 'Settings',                  description: 'Workspace and account settings',       icon: <SettingsIcon className="h-4 w-4" />,         href: '/dashboard/settings',           group: 'Navigate' },
    { id: 'domains',       label: 'Sending Domains',           description: 'Manage and verify your domains',       icon: <LayoutTemplateIcon className="h-4 w-4" />,   href: '/dashboard/settings/domains',   group: 'Navigate' },
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
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200"
        style={{ 
          background: 'var(--surface-card)', 
          border: '1px solid var(--border-subtle)', 
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)' 
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/50">
          <SearchIcon className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands or navigate..."
            className="flex-1 bg-transparent text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <kbd className="hidden rounded bg-muted/50 px-2 py-1 text-[10px] font-mono text-muted-foreground sm:inline border border-border/50">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-3 scrollbar-none">
          {flatFiltered.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm text-muted-foreground">No commands found for "{query}"</p>
            </div>
          ) : (
            Object.entries(groups).map(([group, cmds]) => (
              <div key={group} className="mb-2 last:mb-0">
                <div className="px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">{group}</div>
                {cmds.map((cmd) => {
                  const globalIdx = flatFiltered.indexOf(cmd);
                  const isSelected = globalIdx === selected;
                  return (
                    <button
                      key={cmd.id}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelected(globalIdx)}
                      className="flex w-full items-center gap-4 px-5 py-3 text-left transition-all relative group"
                      style={{ 
                        background: isSelected ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent' 
                      }}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                      )}
                      <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all"
                        style={{ 
                          background: isSelected ? 'rgba(var(--primary-rgb), 0.15)' : 'var(--surface-app)', 
                          color: isSelected ? 'var(--primary)' : 'var(--text-muted)' 
                        }}
                      >
                        {cmd.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{cmd.label}</p>
                        {cmd.description && <p className="text-xs text-muted-foreground truncate">{cmd.description}</p>}
                      </div>
                      {isSelected && (
                        <div className="flex items-center gap-2 text-primary animate-in slide-in-from-right-2">
                          <span className="text-[10px] font-bold uppercase tracking-tighter">Execute</span>
                          <ArrowRightIcon className="h-4 w-4" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border/50 bg-muted/20">
          <div className="flex items-center gap-4">
            {[
              ['↑↓', 'Navigate'],
              ['↵', 'Open'],
            ].map(([key, label]) => (
              <div key={label} className="flex items-center gap-2">
                <kbd className="rounded bg-muted/50 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/50">{key}</kbd>
                <span className="text-[11px] text-muted-foreground/80">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground/60">RevTray Command Center</span>
          </div>
        </div>
      </div>
    </div>
  );
}
