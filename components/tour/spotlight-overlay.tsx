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
  const maskId = React.useId().replace(/:/g, '');

  const activeStep = isActive && steps.length > 0 ? steps[stepIndex] : null;

  useEffect(() => {
    if (!isActive || !activeStep) return;

    let retryCount = 0;
    let observer: MutationObserver | null = null;
    let fallbackTimeout: NodeJS.Timeout | null = null;

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
        return true;
      }
      return false;
    };

    if (!updateRect()) {
      // Element not found initially, we want to clear rect after a short delay so fallback triggers
      // but without breaking instant single-page gliding animations.
      setRect(null);
    }

    const poll = () => {
      retryCount++;
      if (!updateRect() && retryCount < 50) { 
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
        const targetElement = document.getElementById(activeStep.id);
        if (targetElement && e.target instanceof Node) {
          if (targetElement.contains(e.target)) {
            nextStep();
          }
        }
      };

      // USE CAPTURE = true so we intercept the click before Next.js Link handles it
      document.addEventListener('click', handleClick, true);
      return () => document.removeEventListener('click', handleClick, true);
    }
  }, [isActive, activeStep, rect, nextStep, showSkipConfirm]);

  if (!isActive || !activeStep) return null;

  const padding = 12;
  const sx = rect ? rect.left - padding : 0;
  const sy = rect ? rect.top - padding : 0;
  const sw = rect ? rect.width + padding * 2 : 0;
  const sh = rect ? rect.height + padding * 2 : 0;

  const position = activeStep.position || 'bottom';
  let modalTop = 0;
  let modalLeft = 0;

  if (!rect) {
    if (typeof window !== 'undefined') {
        modalTop = (window.innerHeight / 2) - 100;
        modalLeft = (window.innerWidth / 2) - 150;
    }
  } else {
    if (position === 'bottom') {
        modalTop = sy + sh + 24;
        modalLeft = sx + (sw / 2) - 160;
      } else if (position === 'top') {
        modalTop = sy - 220; 
        modalLeft = sx + (sw / 2) - 160;
      } else if (position === 'right') {
        modalTop = sy + (sh / 2) - 100; 
        modalLeft = sx + sw + 24;
      } else if (position === 'left') {
        modalTop = sy + (sh / 2) - 100; 
        modalLeft = sx - 320 - 24;
      }
    
      if (typeof window !== 'undefined') {
        modalLeft = Math.max(24, Math.min(modalLeft, window.innerWidth - 344));
        modalTop = Math.max(24, Math.min(modalTop, window.innerHeight - 250));
      }
  }

  // Calculate the path for pointer-events blocking
  // If it's a 'view' step, we block entire screen so they must click "Continue".
  // If it's a 'click' or 'navigate' step, we allow clicking through the hole.
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
      {/* Invisible overlay over the rest of screen to prevent clicks outside. Rendered first so modal and buttons stack above it. */}
      <div 
        className="absolute inset-0 pointer-events-auto"
        style={{ clipPath: pointerPolygon }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onMouseDownCapture={(e) => {
           e.stopPropagation();
        }}
      />

      <AnimatePresence>
        <motion.svg
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id={maskId}>
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {rect && (
                <motion.rect
                  fill="black"
                  rx="12"
                  initial={{ x: sx, y: sy, width: sw, height: sh }}
                  animate={{ x: sx, y: sy, width: sw, height: sh }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.7)"
            mask={`url(#${maskId})`}
            className="backdrop-blur-sm"
            style={{ backdropFilter: 'blur(3px)' }}
          />

          {/* Stroke surrounding the spotlight */}
          {rect && (
            <motion.rect
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
              strokeDasharray="4 4"
              rx="12"
              initial={{ x: sx, y: sy, width: sw, height: sh }}
              animate={{ x: sx, y: sy, width: sw, height: sh }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            />
          )}
        </motion.svg>
      </AnimatePresence>

      <div className="absolute top-6 right-6 pointer-events-auto">
        <button
          onClick={() => setShowSkipConfirm(true)}
          className="bg-black/60 hover:bg-black/80 text-white/90 text-sm font-medium px-5 py-2.5 border border-white/20 rounded-full transition-all backdrop-blur-md shadow-lg"
        >
          Skip Demo
        </button>
      </div>

      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute w-[320px] bg-[#0A0A0ACC] border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] backdrop-blur-xl p-6 pointer-events-auto flex flex-col"
        style={{ top: modalTop, left: modalLeft }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-bold tracking-widest uppercase text-brand flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
            Step {stepIndex + 1} of {steps.length}
          </div>
        </div>
        <h3 className="text-white font-bold text-[22px] leading-tight tracking-tight mb-2">{activeStep.title}</h3>
        <p className="text-zinc-300/90 text-[15px] mb-6 leading-relaxed flex-1">{activeStep.description}</p>
        
        {activeStep.actionType === 'view' && (
          <button
            onClick={nextStep}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 transition-colors shadow-sm"
          >
            Continue <ChevronRight size={18} />
          </button>
        )}
        
        {(activeStep.actionType === 'click' || activeStep.actionType === 'navigate') && (
          <div className="mt-auto flex text-[13px] items-center gap-2.5 text-brand bg-brand/10 border border-brand/20 px-4 py-3 rounded-xl font-medium">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM11 19.93C7.05 19.43 4.42 15.65 5.52 11.51L11 17V19.93ZM13 19.93V17L18.48 11.51C19.58 15.65 16.95 19.43 13 19.93ZM20 10H16.5C16.22 10 16 9.78 16 9.5V6C18.21 6 20 7.79 20 10ZM14.5 6V9.5C14.5 9.78 14.28 10 14 10H10C9.72 10 9.5 9.78 9.5 9.5V6C9.5 5.45 9.95 5 10.5 5H13.5C14.05 5 14.5 5.45 14.5 6ZM4 10C4 7.79 5.79 6 8 6V9.5C8 9.78 7.78 10 7.5 10H4Z" fill="currentColor"/>
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
              className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand to-transparent opacity-50" />
              <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Skip the Demo?</h2>
              <p className="text-zinc-400 text-[15px] leading-relaxed mb-8">
                Are you sure? This short walk-through showcases powerful growth tools designed to instantly boost your revenue. It\'s highly recommended!
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
                  Yes, Im a pro
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
