/**
 * components/layout/page-shell.tsx
 *
 * Shared primitives used across every dashboard page:
 *   PageHeader    — title + subtitle + optional CTA
 *   EmptyState    — rich zero-state with icon, copy, and one action
 *   SectionCard   — white card wrapper with optional title
 *   StatCard      — KPI card (no emojis — icon SVG only)
 */

import Link from 'next/link';
import React from 'react';

// ── PageHeader ────────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  cta?: {
    label: string;
    href?: string;
    onClick?: string;
    secondary?: boolean;
  };
  secondaryCta?: {
    label: string;
    href: string;
  };
}

export function PageHeader({ title, subtitle, cta, secondaryCta }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {(cta || secondaryCta) && (
        <div className="flex items-center gap-3">
          {secondaryCta && (
            <Link
              href={secondaryCta.href}
              className="text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}
            >
              {secondaryCta.label}
            </Link>
          )}
          {cta?.href && (
            <Link
              href={cta.href}
              className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={
                cta.secondary
                  ? { background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)', color: 'var(--text-primary)' }
                  : { background: 'var(--brand)', color: '#fff', boxShadow: '0 2px 8px rgba(34,197,94,0.22)' }
              }
            >
              {cta.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: React.ReactNode;
  iconColor?: string;        // bg color for icon circle e.g. '#F0FDF4'
  iconTextColor?: string;    // icon stroke color
  title: string;
  description: string;
  cta?: { label: string; href: string; primary?: boolean };
  secondaryCta?: { label: string; href: string };
  hint?: string;             // small grey note below CTA
}

export function EmptyState({
  icon, iconColor = '#F0FDF4', iconTextColor = '#16A34A',
  title, description, cta, secondaryCta, hint,
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl py-16 px-8 text-center"
      style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}
    >
      <div
        className="flex h-14 w-14 items-center justify-center rounded-2xl mb-5"
        style={{ background: iconColor }}
      >
        <span style={{ color: iconTextColor }}>{icon}</span>
      </div>
      <p className="text-base font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
        {title}
      </p>
      <p className="text-sm max-w-sm mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-90"
          style={
            cta.primary !== false
              ? { background: 'var(--brand)', color: '#fff' }
              : { background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)', color: 'var(--text-primary)' }
          }
        >
          {cta.label}
        </Link>
      )}
      {secondaryCta && (
        <Link
          href={secondaryCta.href}
          className="mt-3 text-sm transition-opacity hover:opacity-70"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {secondaryCta.label}
        </Link>
      )}
      {hint && (
        <p className="mt-4 text-xs" style={{ color: 'var(--text-tertiary)' }}>{hint}</p>
      )}
    </div>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────────────

export function SectionCard({
  title, description, children, action,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  action?: { label: string; href: string };
}) {
  return (
    <div
      className="rounded-xl shadow-card overflow-hidden"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
    >
      {(title || action) && (
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--sidebar-border)' }}
        >
          <div>
            {title && <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>}
            {description && <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{description}</p>}
          </div>
          {action && (
            <Link href={action.href} className="text-xs font-medium transition-opacity hover:opacity-70" style={{ color: 'var(--brand)' }}>
              {action.label} →
            </Link>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

export function StatCard({
  label, value, sub, subGreen, accent, icon,
}: {
  label: string;
  value: string;
  sub?: string;
  subGreen?: boolean;
  accent?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5 shadow-card"
      style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          {label}
        </p>
        {icon && (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: accent ? 'var(--brand-tint)' : 'var(--surface-app)' }}
          >
            <span style={{ color: accent ? 'var(--brand)' : 'var(--text-tertiary)' }}>{icon}</span>
          </div>
        )}
      </div>
      <p
        className="text-[26px] font-bold leading-none"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1.5 text-xs font-medium" style={{ color: subGreen ? '#16A34A' : 'var(--text-tertiary)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── DataTable ─────────────────────────────────────────────────────────────────

export function DataTable({
  headers, children, emptyMessage = 'No data yet',
}: {
  headers: { label: string; align?: 'left' | 'right' }[];
  children: React.ReactNode;
  emptyMessage?: string;
}) {
  return (
    <div
      className="rounded-xl overflow-hidden shadow-card"
      style={{ border: '1px solid var(--sidebar-border)', background: 'var(--surface-card)' }}
    >
      <table className="w-full text-sm">
        <thead style={{ background: 'var(--surface-app)', borderBottom: '1px solid var(--sidebar-border)' }}>
          <tr>
            {headers.map((h) => (
              <th
                key={h.label}
                className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${h.align === 'right' ? 'text-right' : 'text-left'}`}
                style={{ color: 'var(--text-tertiary)' }}
              >
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
