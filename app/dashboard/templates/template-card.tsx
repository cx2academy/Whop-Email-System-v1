'use client';

/**
 * app/dashboard/templates/template-card.tsx
 *
 * Redesigned template card with:
 *  - Inline scaled HTML preview (live render)
 *  - Category colour accent
 *  - Preview modal on click
 *  - One-click "Use template" straight to campaign builder
 */

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { SystemTemplate } from '@/lib/templates/library';
import { CATEGORY_LABELS } from '@/lib/templates/library';
import { cloneSystemTemplate } from '@/lib/templates/actions';
import { parseVariables, PREVIEW_VARIABLES } from '@/lib/templates/variable-parser';

// ── Category colours ────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { color: string; bg: string }> = {
  course_launch: { color: '#7C3AED', bg: '#F5F3FF' },
  announcement:  { color: '#2563EB', bg: '#EFF6FF' },
  promotion:     { color: '#D97706', bg: '#FFFBEB' },
  scarcity:      { color: '#DC2626', bg: '#FEF2F2' },
  webinar:       { color: '#059669', bg: '#F0FDF4' },
  community:     { color: '#7C3AED', bg: '#F5F3FF' },
  reengagement:  { color: '#0284C7', bg: '#F0F9FF' },
  upsell:        { color: '#0891B2', bg: '#ECFEFF' },
};

// ── Inline HTML preview ─────────────────────────────────────────────────────

function HtmlPreview({ html, scale = 0.28 }: { html: string; scale?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-t-lg"
      style={{ height: 160, background: '#fff' }}
    >
      {/* Scrim to block interaction */}
      <div className="absolute inset-0 z-10" style={{ cursor: 'default' }} />
      <div
        style={{
          position:        'absolute',
          top:             0,
          left:            0,
          width:           `${100 / scale}%`,
          transformOrigin: 'top left',
          transform:       `scale(${scale})`,
          pointerEvents:   'none',
          userSelect:      'none',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

// ── Preview Modal ───────────────────────────────────────────────────────────

function PreviewModal({
  template,
  previewHtml,
  previewSubject,
  isAdmin,
  onClose,
}: {
  template:      SystemTemplate;
  previewHtml:   string;
  previewSubject: string;
  isAdmin:        boolean;
  onClose:        () => void;
}) {
  const router        = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved]            = useState(false);
  const meta          = CATEGORY_META[template.category] ?? { color: '#22C55E', bg: '#F0FDF4' };

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function handleUse() {
    onClose();
    router.push(`/dashboard/campaigns/new?templateId=${template.id}`);
  }

  function handleSave() {
    startTransition(async () => {
      const r = await cloneSystemTemplate(template.id);
      if (r.success) setSaved(true);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: HTML preview */}
        <div
          className="flex-1 overflow-auto"
          style={{ background: '#f8f8f8', minWidth: 0 }}
        >
          <div
            style={{ padding: '24px', fontSize: 14 }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>

        {/* Right: Info panel */}
        <div
          className="flex w-72 shrink-0 flex-col"
          style={{ borderLeft: '1px solid var(--sidebar-border)' }}
        >
          {/* Header */}
          <div className="p-5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <span
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ background: meta.bg, color: meta.color }}
              >
                {CATEGORY_LABELS[template.category]}
              </span>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-lg leading-none transition-colors"
                style={{ color: 'var(--text-tertiary)' }}
              >
                ×
              </button>
            </div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              {template.name}
            </h2>
          </div>

          {/* Subject */}
          <div className="p-5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
              Subject line
            </p>
            <p className="text-sm" style={{ color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {previewSubject}
            </p>
          </div>

          {/* Tags */}
          <div className="p-5 flex flex-wrap gap-1.5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
            {template.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2 py-0.5 text-xs"
                style={{ background: 'var(--surface-app)', color: 'var(--text-secondary)', border: '1px solid var(--sidebar-border)' }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="p-5 mt-auto space-y-2">
            {isAdmin && (
              <button
                onClick={handleUse}
                className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.22)' }}
              >
                Use template
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleSave}
                disabled={isPending || saved}
                className="w-full rounded-lg py-2 text-xs font-medium transition-colors disabled:opacity-50"
                style={{
                  border:      '1px solid var(--sidebar-border)',
                  color:       saved ? '#16A34A' : 'var(--text-secondary)',
                  background:  saved ? 'rgba(34,197,94,0.07)' : 'none',
                }}
              >
                {saved ? '✓ Saved to your templates' : isPending ? 'Saving…' : 'Save as personal copy'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main card ───────────────────────────────────────────────────────────────

export function TemplateCard({ template, isAdmin }: { template: SystemTemplate; isAdmin: boolean }) {
  const router      = useRouter();
  const [open, setOpen] = useState(false);
  const meta        = CATEGORY_META[template.category] ?? { color: '#22C55E', bg: '#F0FDF4' };
  const previewHtml = parseVariables(template.htmlBody, PREVIEW_VARIABLES);
  const previewSubj = parseVariables(template.subject,  PREVIEW_VARIABLES);

  return (
    <>
      {open && (
        <PreviewModal
          template={template}
          previewHtml={previewHtml}
          previewSubject={previewSubj}
          isAdmin={isAdmin}
          onClose={() => setOpen(false)}
        />
      )}

      <div
        className="group flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg"
        style={{
          background:  'var(--surface-card)',
          border:      '1px solid var(--sidebar-border)',
          transition:  'box-shadow 0.15s, border-color 0.15s',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = meta.color + '66')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--sidebar-border)')}
        onClick={() => setOpen(true)}
      >
        {/* Colour accent bar */}
        <div style={{ height: 3, background: meta.color, flexShrink: 0 }} />

        {/* HTML thumbnail */}
        <HtmlPreview html={previewHtml} scale={0.3} />

        {/* Card body */}
        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: meta.bg, color: meta.color }}
            >
              {CATEGORY_LABELS[template.category]}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              ~{Math.ceil(template.estimatedReadingSeconds / 60)} min
            </span>
          </div>

          <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {template.name}
          </p>

          <p
            className="text-xs truncate rounded px-2 py-1"
            style={{ color: 'var(--text-tertiary)', background: 'var(--surface-app)', fontFamily: 'monospace' }}
          >
            {previewSubj}
          </p>

          {/* CTA row — only visible on hover */}
          <div
            className="flex gap-2 pt-1"
            style={{ opacity: 0, transition: 'opacity 0.15s' }}
            ref={(el) => {
              if (!el) return;
              const parent = el.closest('.group') as HTMLElement | null;
              if (!parent) return;
              parent.addEventListener('mouseenter', () => { el.style.opacity = '1'; });
              parent.addEventListener('mouseleave', () => { el.style.opacity = '0'; });
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(true); }}
              className="flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors"
              style={{ border: '1px solid var(--sidebar-border)', color: 'var(--text-secondary)', background: 'none' }}
            >
              Preview
            </button>
            {isAdmin && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/campaigns/new?templateId=${template.id}`);
                }}
                className="flex-1 rounded-lg py-1.5 text-xs font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'var(--brand)' }}
              >
                Use →
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
