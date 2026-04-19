'use client';

import DOMPurify from 'isomorphic-dompurify';
import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Monitor, Smartphone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SystemTemplate } from '@/lib/templates/library';
import { CATEGORY_LABELS } from '@/lib/templates/library';
import { cloneSystemTemplate } from '@/lib/templates/actions';
import { parseVariables, PREVIEW_VARIABLES } from '@/lib/templates/variable-parser';

// ── Category colours ────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { color: string; bg: string }> = {
  course_launch: { color: '#6D28D9', bg: '#F5F3FF' }, // Purple-700
  announcement:  { color: '#1D4ED8', bg: '#EFF6FF' }, // Blue-700
  promotion:     { color: '#B45309', bg: '#FFFBEB' }, // Amber-700
  scarcity:      { color: '#B91C1C', bg: '#FEF2F2' }, // Red-700
  webinar:       { color: '#047857', bg: '#F0FDF4' }, // Emerald-700
  community:     { color: '#6D28D9', bg: '#F5F3FF' }, // Purple-700
  reengagement:  { color: '#0369A1', bg: '#F0F9FF' }, // Sky-700
  upsell:        { color: '#0E7490', bg: '#ECFEFF' }, // Cyan-700
};

// ── Inline HTML preview ─────────────────────────────────────────────────────

function HtmlPreview({ html, scale = 0.28 }: { html: string; scale?: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-t-xl bg-white border-b border-gray-100"
      style={{ height: 180 }}
    >
      {/* Scrim to block interaction */}
      <div className="absolute inset-0 z-10" style={{ cursor: 'pointer' }} />
      <iframe
        srcDoc={html}
        className="absolute top-0 left-0 border-none pointer-events-none bg-white"
        style={{
          width: `${100 / scale}%`,
          height: `${100 / scale}%`,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
        }}
        sandbox="allow-same-origin"
        tabIndex={-1}
        loading="lazy"
      />
    </div>
  );
}

// ── Preview Side Panel ──────────────────────────────────────────────────────

function PreviewSidePanel({
  template,
  previewHtml,
  previewSubject,
  isAdmin,
  onClose,
}: {
  template: SystemTemplate;
  previewHtml: string;
  previewSubject: string;
  isAdmin: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const meta = CATEGORY_META[template.category] ?? { color: '#15803D', bg: '#F0FDF4' }; // Green-700

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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: meta.bg, color: meta.color }}
                >
                  {CATEGORY_LABELS[template.category]}
                </span>
                {template.isPro && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider bg-amber-100 text-amber-900">
                    PRO
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900">{template.name}</h2>
              <p className="text-sm text-gray-500 mt-1 font-mono" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewSubject) }} />
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex bg-gray-200/50 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('desktop')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'desktop' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Monitor size={16} /> Desktop
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'mobile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Smartphone size={16} /> Mobile
              </button>
            </div>
            
            <div className="flex gap-3">
              {isAdmin && (
                <button
                  onClick={handleSave}
                  disabled={isPending || saved}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    saved 
                      ? 'border-green-200 bg-green-50 text-green-700' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50 bg-white'
                  }`}
                >
                  {saved ? '✓ Saved to your templates' : isPending ? 'Saving…' : 'Save Copy'}
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={handleUse}
                  className="px-6 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Use Template
                </button>
              )}
            </div>
          </div>

          {/* Iframe Container */}
          <div className="flex-1 overflow-auto bg-gray-100 flex justify-center py-8 px-4">
            <div 
              className="bg-white shadow-sm border border-gray-200 transition-all duration-300 ease-in-out overflow-hidden"
              style={{ 
                width: viewMode === 'desktop' ? '100%' : '375px',
                maxWidth: viewMode === 'desktop' ? '800px' : '375px',
                height: '100%',
                minHeight: '600px',
                borderRadius: viewMode === 'mobile' ? '36px' : '8px',
                borderWidth: viewMode === 'mobile' ? '12px' : '1px',
                borderColor: viewMode === 'mobile' ? '#1f2937' : '#e5e7eb'
              }}
            >
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-none"
                sandbox="allow-same-origin"
                loading="lazy"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ── Main card ───────────────────────────────────────────────────────────────

export function TemplateCard({ template, isAdmin, isProUser = false }: { template: SystemTemplate; isAdmin: boolean; isProUser?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const meta = CATEGORY_META[template.category] ?? { color: '#15803D', bg: '#F0FDF4' }; // Green-700
  
  const thumbnailHtml = parseVariables(template.htmlBody, PREVIEW_VARIABLES, false);
  const previewHtml = parseVariables(template.htmlBody, PREVIEW_VARIABLES, true);
  const previewSubj = parseVariables(template.subject, PREVIEW_VARIABLES, true);

  const isLocked = template.isPro && !isProUser;

  function handleCardClick() {
    if (isLocked) return;
    setOpen(true);
  }

  return (
    <>
      {open && (
        <PreviewSidePanel
          template={template}
          previewHtml={previewHtml}
          previewSubject={previewSubj}
          isAdmin={isAdmin}
          onClose={() => setOpen(false)}
        />
      )}

      <motion.div
        id={template.id === 'course-launch-main' ? 'tour-template-course-launch' : undefined}
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={!isLocked ? { scale: 1.02, y: -4 } : {}}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="group flex flex-col rounded-xl overflow-hidden relative bg-white border border-gray-200 shadow-sm"
        style={{
          cursor: isLocked ? 'not-allowed' : 'pointer',
        }}
        onClick={handleCardClick}
      >
        {/* Colour accent bar */}
        <div style={{ height: 4, background: meta.color, flexShrink: 0 }} />

        {/* HTML thumbnail */}
        <HtmlPreview html={thumbnailHtml} scale={0.3} />

        {/* Card body */}
        <div className="flex flex-col gap-3 p-5 flex-1 relative">
          <div className="flex items-center justify-between gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
              style={{ background: meta.bg, color: meta.color }}
            >
              {CATEGORY_LABELS[template.category]}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">
                ~{Math.ceil(template.estimatedReadingSeconds / 60)} min
              </span>
            </div>
          </div>

          <h3 className="text-base font-bold text-gray-900 leading-tight">
            {template.name}
          </h3>

          <p className="text-xs text-gray-500 truncate font-mono bg-gray-50 px-2 py-1.5 rounded-md border border-gray-100" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewSubj) }} />

          {isLocked && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] z-10">
              <div className="bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-bold text-gray-800 border border-gray-100">
                <Lock size={16} className="text-amber-600" />
                PRO
              </div>
            </div>
          )}

          {/* Spacer for hover buttons */}
          {!isLocked && <div className="h-10" />}
          
          {/* CTA row — animated on hover */}
          {!isLocked && (
            <div className="absolute bottom-5 left-5 right-5 flex gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out bg-white pt-2">
              <button
                onClick={(e) => { e.stopPropagation(); setOpen(true); }}
                className="flex-1 rounded-lg py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Preview
              </button>
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/dashboard/campaigns/new?templateId=${template.id}`);
                  }}
                  className="flex-1 rounded-lg py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Use →
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

