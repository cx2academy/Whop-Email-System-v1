'use client';

import { useState } from 'react';
import { Lock, Layers, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type { TemplateSequence } from '@/lib/templates/sequences';
import { instantiateTemplateSequence } from '@/lib/templates/actions';

export function SequenceCard({ sequence, isAdmin, isProUser = false }: { sequence: TemplateSequence; isAdmin: boolean; isProUser?: boolean }) {
  const isLocked = sequence.isPro && !isProUser;
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleUseSequence = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isCreating) return;
    
    setIsCreating(true);
    try {
      const res = await instantiateTemplateSequence(sequence.id);
      if (res.success) {
        toast.success('Sequence drafts created!');
        router.push('/dashboard/campaigns');
      } else {
        toast.error(res.error || 'Failed to create sequence');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <motion.div
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
    >
      {/* Colour accent bar */}
      <div style={{ height: 4, background: '#8B5CF6', flexShrink: 0 }} />

      {/* Card body */}
      <div className="flex flex-col gap-3 p-5 h-full relative">
        <div className="flex items-center justify-between gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold flex items-center gap-1"
            style={{ background: '#F5F3FF', color: '#7C3AED' }}
          >
            <Layers size={12} />
            Sequence ({sequence.steps.length} steps)
          </span>
        </div>

        <h3 className="text-base font-bold text-gray-900 leading-tight mt-1">
          {sequence.name}
        </h3>

        <p className="text-sm text-gray-500 flex-1">
          {sequence.description}
        </p>

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
            {isAdmin && (
              <button
                onClick={handleUseSequence}
                disabled={isCreating}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 transition-colors shadow-sm"
              >
                {isCreating ? (
                  <><Loader2 size={14} className="animate-spin" /> Creating...</>
                ) : (
                  <>Use Sequence →</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
