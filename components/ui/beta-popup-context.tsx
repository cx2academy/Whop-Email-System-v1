'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Send } from 'lucide-react';
import { Button } from './button';
import { Portal } from './portal';
import { WaitlistDialog } from '@/components/beta/waitlist-dialog';

interface BetaPopupContextType {
  show: () => void;
  hide: () => void;
  showWaitlist: () => void;
}

const BetaPopupContext = createContext<BetaPopupContextType | undefined>(undefined);

export function BetaPopupProvider({ children }: { children: React.ReactNode }) {
  const [isBetaOpen, setIsBetaOpen] = useState(false);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  const show = useCallback(() => setIsBetaOpen(true), []);
  const hide = useCallback(() => {
    setIsBetaOpen(false);
    setIsWaitlistOpen(false);
  }, []);
  const showWaitlist = useCallback(() => {
    setIsBetaOpen(false);
    setIsWaitlistOpen(true);
  }, []);

  return (
    <BetaPopupContext.Provider value={{ show, hide, showWaitlist }}>
      {children}
      
      <WaitlistDialog 
        isOpen={isWaitlistOpen} 
        onClose={() => setIsWaitlistOpen(false)} 
      />

      <AnimatePresence>
        {isBetaOpen && (
          <Portal>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={hide}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={hide}
                  className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Sparkles size={28} className="animate-pulse" />
                </div>

                <h3 className="mb-3 text-2xl font-black tracking-tight text-slate-900">
                  Coming Soon!
                </h3>
                <p className="mb-8 text-slate-500 font-medium leading-relaxed">
                  This feature is currently in private beta. Join the waitlist to be notified as soon as we open access to your workspace.
                </p>

                <div className="space-y-4">
                  <Button
                    onClick={showWaitlist}
                    className="w-full rounded-2xl py-6 font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-200"
                  >
                    <Send size={16} className="mr-2" />
                    Join the Waitlist
                  </Button>
                  <button
                    onClick={hide}
                    className="w-full py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Maybe later
                  </button>
                </div>
              </motion.div>
            </div>
          </Portal>
        )}
      </AnimatePresence>
    </BetaPopupContext.Provider>
  );
}

export function useBetaPopup() {
  const context = useContext(BetaPopupContext);
  if (context === undefined) {
    throw new Error('useBetaPopup must be used within a BetaPopupProvider');
  }
  return context;
}
