'use client';

/**
 * app/dashboard/templates/template-gallery.tsx
 *
 * Client component that owns category filter state.
 * Receives all templates as props, filters in-browser — zero extra fetches.
 */

import { useState } from 'react';
import type { SystemTemplate, SystemTemplateCategory } from '@/lib/templates/library';
import { CATEGORY_LABELS } from '@/lib/templates/library';
import { TemplateCard } from './template-card';
import { UserTemplateCard } from './user-template-card';
import type { EmailTemplate } from '@prisma/client';

interface Props {
  systemTemplates: SystemTemplate[];
  userTemplates:   EmailTemplate[];
  isAdmin:         boolean;
}

const ALL = '__all__';

export function TemplateGallery({ systemTemplates, userTemplates, isAdmin }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>(ALL);

  // Build unique sorted category list from system templates
  const categories = Array.from(
    new Set(systemTemplates.map((t) => t.category))
  ) as SystemTemplateCategory[];

  // Filter system templates
  const filtered = activeCategory === ALL
    ? systemTemplates
    : systemTemplates.filter((t) => t.category === activeCategory);

  // Filter user templates (if category selected, only show matching; 'custom' if unknown)
  const filteredUser = activeCategory === ALL
    ? userTemplates
    : userTemplates.filter((t) => (t.category ?? 'custom') === activeCategory);

  const showUserTemplates = userTemplates.length > 0 && (activeCategory === ALL || filteredUser.length > 0);

  return (
    <div className="space-y-6">

      {/* Category filter bar */}
      <div className="flex flex-wrap gap-2">
        {/* All tab */}
        <FilterPill
          label="All"
          count={systemTemplates.length}
          active={activeCategory === ALL}
          onClick={() => setActiveCategory(ALL)}
        />
        {categories.map((cat) => {
          const count = systemTemplates.filter((t) => t.category === cat).length;
          return (
            <FilterPill
              key={cat}
              label={CATEGORY_LABELS[cat]}
              count={count}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
            />
          );
        })}
      </div>

      {/* Your saved templates (only show on All or if they match category) */}
      {showUserTemplates && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Your saved templates
            </h2>
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: 'var(--surface-app)', color: 'var(--text-tertiary)' }}
            >
              {(activeCategory === ALL ? userTemplates : filteredUser).length}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(activeCategory === ALL ? userTemplates : filteredUser).map((t) => (
              <UserTemplateCard key={t.id} template={t} isAdmin={isAdmin} />
            ))}
          </div>
        </section>
      )}

      {/* System templates */}
      {filtered.length > 0 ? (
        <section>
          {activeCategory !== ALL && (
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                {CATEGORY_LABELS[activeCategory as SystemTemplateCategory]}
              </h2>
              <span
                className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ background: 'var(--surface-app)', color: 'var(--text-tertiary)' }}
              >
                {filtered.length}
              </span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <TemplateCard key={t.id} template={t} isAdmin={isAdmin} />
            ))}
          </div>
        </section>
      ) : (
        <div
          className="rounded-xl p-8 text-center"
          style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}
        >
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            No templates in this category yet.
          </p>
        </div>
      )}
    </div>
  );
}

// ── FilterPill ───────────────────────────────────────────────────────────────

function FilterPill({
  label, count, active, onClick,
}: {
  label:   string;
  count:   number;
  active:  boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all"
      style={{
        background:  active ? 'var(--brand)'          : 'var(--surface-card)',
        color:       active ? '#fff'                   : 'var(--text-secondary)',
        border:      active ? '1px solid transparent'  : '1px solid var(--sidebar-border)',
        boxShadow:   active ? '0 2px 8px rgba(34,197,94,0.22)' : 'none',
      }}
    >
      {label}
      <span
        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
        style={{
          background: active ? 'rgba(255,255,255,0.25)' : 'var(--surface-app)',
          color:       active ? '#fff'                   : 'var(--text-tertiary)',
        }}
      >
        {count}
      </span>
    </button>
  );
}
