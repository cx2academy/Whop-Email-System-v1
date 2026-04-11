'use client';

/**
 * app/dashboard/templates/template-gallery.tsx
 *
 * Client component that owns category filter state.
 * Receives all templates as props, filters in-browser — zero extra fetches.
 */

import { useState } from 'react';
import { Search } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SystemTemplate, SystemTemplateCategory } from '@/lib/templates/library';
import { CATEGORY_LABELS } from '@/lib/templates/library';
import { SYSTEM_SEQUENCES } from '@/lib/templates/sequences';
import { TemplateCard } from './template-card';
import { UserTemplateCard } from './user-template-card';
import { SequenceCard } from './sequence-card';
import type { EmailTemplate } from '@prisma/client';

interface Props {
  systemTemplates: SystemTemplate[];
  userTemplates:   EmailTemplate[];
  isAdmin:         boolean;
}

const ALL = '__all__';
const SEQUENCES = '__sequences__';

export function TemplateGallery({ systemTemplates, userTemplates, isAdmin }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>(ALL);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock isProUser for now
  const isProUser = false;

  // Build unique sorted category list from system templates
  const categories = Array.from(
    new Set(systemTemplates.map((t) => t.category))
  ) as SystemTemplateCategory[];

  const searchLower = searchQuery.toLowerCase();

  // Filter system templates
  const filtered = systemTemplates.filter((t) => {
    const matchesCategory = activeCategory === ALL || activeCategory === SEQUENCES
      ? true
      : t.category === activeCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchLower) || t.tags.some(tag => tag.toLowerCase().includes(searchLower));
    return matchesCategory && matchesSearch;
  });

  // Filter user templates
  const filteredUser = userTemplates.filter((t) => {
    const matchesCategory = activeCategory === ALL || activeCategory === SEQUENCES
      ? true
      : (t.category ?? 'custom') === activeCategory;
    const matchesSearch = t.name.toLowerCase().includes(searchLower) || (t.subject && t.subject.toLowerCase().includes(searchLower));
    return matchesCategory && matchesSearch;
  });

  // Filter sequences
  const filteredSequences = SYSTEM_SEQUENCES.filter((seq) => {
    const matchesCategory = activeCategory === ALL || activeCategory === SEQUENCES;
    const matchesSearch = seq.name.toLowerCase().includes(searchLower) || seq.description.toLowerCase().includes(searchLower);
    return matchesCategory && matchesSearch;
  });

  const showUserTemplates = userTemplates.length > 0 && (activeCategory === ALL || filteredUser.length > 0) && activeCategory !== SEQUENCES;

  return (
    <div className="space-y-6">

      {/* Search Bar */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search templates by name or tag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
        />
      </div>

      {/* Category filter bar */}
      <div className="flex flex-wrap gap-2">
        {/* All tab */}
        <FilterPill
          label="All"
          count={systemTemplates.length + SYSTEM_SEQUENCES.length}
          active={activeCategory === ALL}
          onClick={() => setActiveCategory(ALL)}
        />
        {/* Sequences tab */}
        <FilterPill
          label="Sequences"
          count={SYSTEM_SEQUENCES.length}
          active={activeCategory === SEQUENCES}
          onClick={() => setActiveCategory(SEQUENCES)}
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
        <motion.section layout>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Your saved templates
            </h2>
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: 'var(--surface-app)', color: 'var(--text-tertiary)' }}
            >
              {filteredUser.length}
            </span>
          </div>
          <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            <AnimatePresence mode="popLayout">
              {filteredUser.map((t) => (
                <UserTemplateCard key={t.id} template={t} isAdmin={isAdmin} />
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.section>
      )}

      {/* Sequences */}
      {(activeCategory === ALL || activeCategory === SEQUENCES) && filteredSequences.length > 0 && (
        <motion.section layout>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Drip Sequences
            </h2>
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ background: 'var(--surface-app)', color: 'var(--text-tertiary)' }}
            >
              {filteredSequences.length}
            </span>
          </div>
          <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            <AnimatePresence mode="popLayout">
              {filteredSequences.map((seq) => (
                <SequenceCard key={seq.id} sequence={seq} isAdmin={isAdmin} isProUser={isProUser} />
              ))}
            </AnimatePresence>
          </motion.div>
        </motion.section>
      )}

      {/* System templates */}
      {activeCategory !== SEQUENCES && (
        filtered.length > 0 ? (
          <motion.section layout>
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
            {activeCategory === ALL && (
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                  Single Templates
                </h2>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: 'var(--surface-app)', color: 'var(--text-tertiary)' }}
                >
                  {filtered.length}
                </span>
              </div>
            )}
            <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              <AnimatePresence mode="popLayout">
                {filtered.map((t) => (
                  <TemplateCard key={t.id} template={t} isAdmin={isAdmin} isProUser={isProUser} />
                ))}
              </AnimatePresence>
            </motion.div>
          </motion.section>
        ) : (
          <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl p-8 text-center"
            style={{ border: '1.5px dashed var(--sidebar-border)', background: 'var(--surface-card)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              No templates match your search.
            </p>
          </motion.div>
        )
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
        background:  active ? '#0D0F12'          : 'var(--surface-card)',
        color:       active ? '#fff'                   : 'var(--text-secondary)',
        border:      active ? '1px solid transparent'  : '1px solid var(--sidebar-border)',
        boxShadow:   active ? '0 2px 8px rgba(13,15,18,0.22)' : 'none',
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

