'use client';

import React, { useEffect, useState } from 'react';
import { useTour } from './tour-context';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function SpotlightOverlay() {
  const { isActive, stepIndex, steps, nextStep, skipTour } = useTour();
  const [rect, setRect] = useState<ElementRect | null>(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  const activeStep = isActive && steps.length > 0 ? steps[stepIndex] : null;

  useEffect(() => {
    if (!isActive || !activeStep) return;

    let retryCount = 0;
    let observer: MutationObserver | null = null;
    let fallbackTimeout: NodeJS.Timeout | null = null;

    let hasScrolled = false;
    const updateRect = () => {
      const element = document.getElementById(activeStep.id);
      if (element) {
        const bounds = element.getBoundingClientRect();
        if (bounds.width === 0 && bounds.height === 0) return false;

        setRect({
          top: bounds.top,
          left: bounds.left,
          width: bounds.width,
          height: bounds.height,
        });

        if (!hasScrolled) {
            // Scroll element into view smoothly in the center of the viewport
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            hasScrolled = true;
        }

        return true;
      }
      return false;
    };

    if (!updateRect()) {
      setRect(null);
    }

    const poll = () => {
      retryCount++;
      // Wait up to 10 seconds (100 retries * 100ms) for elements that take a while to appear
      if (!updateRect() && retryCount < 100) { 
        fallbackTimeout = setTimeout(poll, 100);
      }
    };
    fallbackTimeout = setTimeout(poll, 100);

    observer = new MutationObserver(() => {
      updateRect();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onScrollOrResize = () => updateRect();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
      if (fallbackTimeout) clearTimeout(fallbackTimeout);
      if (observer) observer.disconnect();
    };
  }, [isActive, activeStep]);

  useEffect(() => {
    if (!isActive || !activeStep || !rect || showSkipConfirm) return;

    if (activeStep.actionType === 'click' || activeStep.actionType === 'navigate') {
      const handleClick = (e: MouseEvent) => {
        const padding = 4; 
        const sx = rect.left - padding;
        const sy = rect.top - padding;
        const sw = rect.width + padding * 2;
        const sh = rect.height + padding * 2;

        if (e.clientX >= sx && e.clientX <= sx + sw && e.clientY >= sy && e.clientY <= sy + sh) {
          const targetElement = document.getElementById(activeStep.id);
          if (targetElement) {
              if (targetElement.contains(e.target as Node)) {
                  nextStep();
              } else {
                  // User clicked the padding gap instead of the actual element.
                  // Programatically trigger the underlying element's click so it doesn't just advance the tour pointlessly.
                  e.preventDefault();
                  e.stopPropagation();
                  targetElement.click();
                  nextStep();
              }
          }
        }
      };

      document.addEventListener('click', handleClick, true);
      return () => document.removeEventListener('click', handleClick, true);
    }
  }, [isActive, activeStep, rect, nextStep, showSkipConfirm]);

  if (!isActive || !activeStep) return null;

  const padding = 4;
  const sx = rect ? rect.left - padding : 0;
  const sy = rect ? rect.top - padding : 0;
  const sw = rect ? rect.width + padding * 2 : 0;
  const sh = rect ? rect.height + padding * 2 : 0;

  const position = activeStep.position || 'bottom';
  const modalWidth = 320;
  const modalHeight = 220;
  let modalTop = 0;
  let modalLeft = 0;

  if (!rect) {
    if (typeof window !== 'undefined') {
        modalTop = (window.innerHeight / 2) - 100;
        modalLeft = (window.innerWidth / 2) - 160;
    }
  } else {
    if (position === 'bottom') {
        modalTop = sy + sh + 20;
        modalLeft = sx + (sw / 2) - (modalWidth / 2);
      } else if (position === 'top') {
        modalTop = sy - 240; 
        modalLeft = sx + (sw / 2) - (modalWidth / 2);
      } else if (position === 'right') {
        modalTop = sy + (sh / 2) - (modalHeight / 2); 
        modalLeft = sx + sw + 20;
      } else if (position === 'left') {
        modalTop = sy + (sh / 2) - (modalHeight / 2); 
        modalLeft = sx - modalWidth - 20;
      } else if (position === 'center') {
        modalTop = sy + (sh / 2) - (modalHeight / 2); 
        modalLeft = sx + (sw / 2) - (modalWidth / 2);
      }
    
      if (typeof window !== 'undefined') {
        // Prevent sticking to very bottom
        if (modalTop + modalHeight > window.innerHeight) {
            modalTop = window.innerHeight - modalHeight - 24;
        }
        modalLeft = Math.max(24, Math.min(modalLeft, window.innerWidth - modalWidth - 24));
        modalTop = Math.max(24, modalTop);
      }
  }

  const isInteractiveHole = activeStep.actionType === 'click' || activeStep.actionType === 'navigate';
  const pointerPolygon = (rect && isInteractiveHole) ? `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
    ${sx}px ${sy}px,
    ${sx}px ${sy + sh}px,
    ${sx + sw}px ${sy + sh}px,
    ${sx + sw}px ${sy}px,
    ${sx}px ${sy}px
  )` : 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';

  return (
    <div className="fixed inset-0 z-[999999] pointer-events-none">
      <div 
        className="absolute inset-0 pointer-events-auto"
        style={{ clipPath: pointerPolygon, zIndex: -1 }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onMouseDownCapture={(e) => {
           e.stopPropagation();
        }}
      />

      <AnimatePresence>
          {rect && (
            <motion.div
              className="absolute pointer-events-none"
              style={{
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}
              initial={{ x: sx, y: sy, width: sw, height: sh, opacity: 0 }}
              animate={{ x: sx, y: sy, width: sw, height: sh, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            />
          )}

          {!rect && (
             <motion.div
               className="absolute inset-0 pointer-events-none"
               style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
             />
          )}
      </AnimatePresence>

      <div className="absolute top-6 right-6 pointer-events-auto">
        <button
          onClick={() => setShowSkipConfirm(true)}
          className="bg-[#0f0f11]/80 hover:bg-[#0f0f11] text-white/90 text-sm font-medium px-5 py-2.5 border border-white/10 rounded-full transition-all backdrop-blur-xl shadow-lg"
        >
          Skip Demo
        </button>
      </div>

      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute w-[320px] bg-[#0f0f11] border border-white/10 rounded-2xl shadow-[0_16px_48px_rgba(0,0,0,0.6)] backdrop-blur-xl p-6 pointer-events-auto flex flex-col z-[100]"
        style={{ top: modalTop, left: modalLeft }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-bold tracking-widest uppercase text-green-500 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Step {stepIndex + 1} of {steps.length}
          </div>
        </div>
        <h3 className="text-white font-bold text-xl leading-tight tracking-tight mb-2">{activeStep.title}</h3>
        <p className="text-zinc-400 text-[14px] mb-6 leading-relaxed flex-1">{activeStep.description}</p>
        
        {activeStep.actionType === 'view' && (
          <button
            onClick={nextStep}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 transition-colors shadow-sm"
          >
            Continue <ChevronRight size={18} />
          </button>
        )}
        
        {(activeStep.actionType === 'click' || activeStep.actionType === 'navigate') && (
          <div className="mt-auto flex text-[13px] items-center gap-2.5 text-green-500 bg-green-500/10 border border-green-500/20 px-4 py-3 rounded-xl font-medium shadow-inner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="2"/>
            </svg>
            Click the highlighted area
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showSkipConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000000] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0f0f11] border border-white/10 rounded-[28px] p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50" />
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Skip the Demo?</h2>
              <p className="text-zinc-400 text-[15px] leading-relaxed mb-8">
                Are you sure? This short walk-through showcases powerful growth tools designed to instantly boost your revenue. It's highly recommended!
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setShowSkipConfirm(false)}
                  className="w-full py-3.5 bg-white text-black rounded-xl font-bold hover:bg-zinc-200 transition-colors shadow-lg"
                >
                  Keep Going
                </button>
                <button
                  onClick={() => {
                    setShowSkipConfirm(false);
                    skipTour();
                  }}
                  className="w-full py-3.5 bg-transparent border border-white/10 text-white rounded-xl font-medium tracking-wide hover:bg-white/5 transition-colors"
                >
                  Yes, I'm a pro
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
