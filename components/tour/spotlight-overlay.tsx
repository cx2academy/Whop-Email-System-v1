'use client';

import React, { useEffect, useState } from 'react';
import { useTour } from './tour-context';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';

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

    const updateRect = () => {
      const element = document.getElementById(activeStep.id);
      if (element) {
        const bounds = element.getBoundingClientRect();
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
      // Element not found - repeatedly poll until it appears (for page navigations)
      const poll = () => {
        retryCount++;
        if (!updateRect() && retryCount < 20) { // 20 * 100ms = 2 seconds
          fallbackTimeout = setTimeout(poll, 100);
        }
      };
      fallbackTimeout = setTimeout(poll, 100);

      // Also attach a mutation observer if DOM is shifting
      observer = new MutationObserver(() => {
        if (updateRect()) {
            observer?.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

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

  // Handle global click to advance if clicking inside spotlight
  useEffect(() => {
    if (!isActive || !activeStep || !rect) return;

    if (activeStep.actionType === 'click' || activeStep.actionType === 'navigate') {
      const handleClick = (e: MouseEvent) => {
        const padding = 8;
        const spotlightX = rect.left - padding;
        const spotlightY = rect.top - padding;
        const spotlightWidth = rect.width + padding * 2;
        const spotlightHeight = rect.height + padding * 2;

        if (
          e.clientX >= spotlightX &&
          e.clientX <= spotlightX + spotlightWidth &&
          e.clientY >= spotlightY &&
          e.clientY <= spotlightY + spotlightHeight
        ) {
          nextStep();
        }
      };

      // Use capture to catch the click before it navigates/triggers
      document.addEventListener('click', handleClick, { capture: true });
      return () => document.removeEventListener('click', handleClick, { capture: true });
    }
  }, [isActive, activeStep, rect, nextStep]);

  if (!isActive || !activeStep || !rect) return null;

  // Add some padding to the spotlight area
  const padding = 8;
  const spotlightX = rect.left - padding;
  const spotlightY = rect.top - padding;
  const spotlightWidth = rect.width + padding * 2;
  const spotlightHeight = rect.height + padding * 2;

  // Determine modal position
  const position = activeStep.position || 'bottom';
  let modalTop = 0;
  let modalLeft = 0;

  if (position === 'bottom') {
    modalTop = spotlightY + spotlightHeight + 16;
    modalLeft = spotlightX + (spotlightWidth / 2) - 150;
  } else if (position === 'top') {
    modalTop = spotlightY - 150 - 16; // approx height
    modalLeft = spotlightX + (spotlightWidth / 2) - 150;
  } else if (position === 'right') {
    modalTop = spotlightY + (spotlightHeight / 2) - 75; // approx height
    modalLeft = spotlightX + spotlightWidth + 16;
  } else if (position === 'left') {
    modalTop = spotlightY + (spotlightHeight / 2) - 75; // approx height
    modalLeft = spotlightX - 300 - 16;
  }

  // Bound to screen
  if (typeof window !== 'undefined') {
    modalLeft = Math.max(16, Math.min(modalLeft, window.innerWidth - 316));
    modalTop = Math.max(16, Math.min(modalTop, window.innerHeight - 150));
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={spotlightX}
              y={spotlightY}
              width={spotlightWidth}
              height={spotlightHeight}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.7)"
          mask="url(#spotlight-mask)"
          className="backdrop-blur-sm"
          style={{ backdropFilter: 'blur(4px)' }}
        />
      </svg>

      {/* Invisible overlay over the rest of screen to prevent clicks outside, 
          but we leave the spotlight area clickable */}
      <div 
        className="absolute inset-0 pointer-events-auto"
        style={{
          clipPath: `polygon(
            0% 0%, 100% 0%, 100% 100%, 0% 100%, 
            0% ${spotlightY}px, 
            ${spotlightX}px ${spotlightY}px, 
            ${spotlightX}px ${spotlightY + spotlightHeight}px, 
            ${spotlightX + spotlightWidth}px ${spotlightY + spotlightHeight}px, 
            ${spotlightX + spotlightWidth}px ${spotlightY}px, 
            0% ${spotlightY}px
          )`
        }}
      />

      <div className="absolute top-6 right-6 pointer-events-auto">
        <button
          onClick={() => setShowSkipConfirm(true)}
          className="bg-black/50 hover:bg-black/80 text-white text-xs px-4 py-2 border border-white/10 rounded-full transition-colors backdrop-blur-md"
        >
          Skip Full Demo
        </button>
      </div>

      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute w-[300px] bg-[#0A0A0A] border border-white/20 rounded-2xl shadow-2xl p-5 pointer-events-auto"
        style={{ top: modalTop, left: modalLeft }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-bold tracking-widest uppercase text-green-500">
            Step {stepIndex + 1} of {steps.length}
          </div>
        </div>
        <h3 className="text-white font-bold text-lg mb-2">{activeStep.title}</h3>
        <p className="text-zinc-400 text-sm mb-5 leading-relaxed">{activeStep.description}</p>
        
        {activeStep.actionType === 'view' && (
          <button
            onClick={nextStep}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-2.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Got it <ChevronRight size={16} />
          </button>
        )}
        
        {(activeStep.actionType === 'click' || activeStep.actionType === 'navigate') && (
          <div className="flex text-xs items-center gap-2 text-green-400 bg-green-500/10 px-3 py-2 rounded-lg font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Click the highlighted button to continue
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showSkipConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-zinc-400">
                <X size={24} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Skip the Demo?</h2>
              <p className="text-zinc-400 text-sm mb-6">
                Are you sure? This short demo showcases all the powerful tools you have to increase your revenue. It's highly recommended!
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowSkipConfirm(false)}
                  className="px-4 py-2 bg-white text-black rounded-lg font-bold hover:bg-gray-200 transition-colors"
                >
                  Keep Going
                </button>
                <button
                  onClick={() => {
                    setShowSkipConfirm(false);
                    skipTour();
                  }}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-white rounded-lg font-medium tracking-wide hover:bg-white/10 transition-colors"
                >
                  Yes, Skip It
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
