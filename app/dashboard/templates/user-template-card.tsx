'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUserTemplate } from '@/lib/templates/actions';
import type { EmailTemplate } from '@prisma/client';
import { Trash2Icon, PencilIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { parseVariables, PREVIEW_VARIABLES } from '@/lib/templates/variable-parser';

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

export function UserTemplateCard({ template, isAdmin }: { template: EmailTemplate; isAdmin: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleted, setDeleted] = useState(false);

  if (deleted) return null;

  function handleUse() {
    router.push(`/dashboard/campaigns/new?userTemplateId=${template.id}`);
  }

  function handleDelete() {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    startTransition(async () => {
      const r = await deleteUserTemplate(template.id);
      if (r.success) setDeleted(true);
    });
  }

  const thumbnailHtml = parseVariables(template.htmlBody || '', PREVIEW_VARIABLES, false);
  const subjectHtml = parseVariables(template.subject || '', PREVIEW_VARIABLES, false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group flex flex-col rounded-xl overflow-hidden relative bg-white border border-gray-200 shadow-sm cursor-pointer"
      onClick={handleUse}
    >
      {/* Accent bar — personal purple */}
      <div style={{ height: 4, background: 'linear-gradient(90deg,#7C3AED,#22C55E)', flexShrink: 0 }} />

      {/* Thumbnail */}
      <HtmlPreview html={thumbnailHtml} scale={0.3} />

      {/* Body */}
      <div className="flex flex-col gap-3 p-5 flex-1 relative">
        <div className="flex items-center justify-between gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
            style={{ background: 'rgba(124,58,237,0.1)', color: '#7C3AED' }}
          >
            Personal · {template.category || 'custom'}
          </span>
          {isAdmin && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/templates/user/${template.id}`); }}
                className="rounded p-1 transition-colors hover:bg-gray-100"
                style={{ color: 'var(--text-tertiary)' }}
                title="Edit"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={isPending}
                className="rounded p-1 transition-colors hover:bg-red-50 disabled:opacity-50"
                style={{ color: '#EF4444' }}
                title="Delete"
              >
                <Trash2Icon className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <h3 className="text-base font-bold text-gray-900 leading-tight">
          {template.name}
        </h3>

        <p className="text-xs text-gray-500 truncate font-mono bg-gray-50 px-2 py-1.5 rounded-md border border-gray-100">
          {subjectHtml}
        </p>

        {template.usageCount > 0 && (
          <p className="text-xs text-gray-400 font-medium">
            Used {template.usageCount} time{template.usageCount !== 1 ? 's' : ''}
            {template.avgOpenRate > 0 && ` · ${template.avgOpenRate.toFixed(1)}% avg open`}
          </p>
        )}

        {/* Spacer for hover buttons */}
        <div className="h-10" />

        {/* CTA row — animated on hover */}
        <div className="absolute bottom-5 left-5 right-5 flex gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out bg-white pt-2">
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleUse();
              }}
              className="w-full rounded-lg py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Use template →
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
