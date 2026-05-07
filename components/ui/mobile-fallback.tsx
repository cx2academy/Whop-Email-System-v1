"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { useBetaPopup } from "@/components/ui/beta-popup-context";

export function MobileFallback() {
  // Slider state: $100 to $100k+
  const [sliderValue, setSliderValue] = useState(50); // 0 to 100
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasSettled, setHasSettled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const { showWaitlist } = useBetaPopup();

  // Convert slider 0-100 to actual MRR value $100 to $100,000+
  // Logarithmic formula: value = min * (max/min)^(slider/100)
  const minMrr = 100;
  const maxMrr = 100000;

  const mrr = Math.round(minMrr * Math.pow(maxMrr / minMrr, sliderValue / 100));

  // ~12% churn
  const monthlyLeak = Math.round(mrr * 0.12);
  // Recoverable (assume 50% of the churn can be recovered)
  const recoverable = Math.round(monthlyLeak * 0.5);

  const hasInteracted = sliderValue !== 50;

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (isCalculating && hasInteracted && !isDismissed) {
      setHasSettled(false);
      timeout = setTimeout(() => {
        setHasSettled(true);
      }, 1000);
    }
    return () => clearTimeout(timeout);
  }, [sliderValue, isCalculating, hasInteracted, isDismissed]);

  return (
    <div className="md:hidden flex flex-col items-center min-h-screen bg-[#FDFDFD] text-center px-6 pt-20 selection:bg-emerald-500/30 overflow-hidden relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150vw] h-[100vw] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative mb-10 z-10 flex flex-col items-center">
        <div className="absolute inset-0 bg-emerald-400/20 blur-[32px] rounded-full" />
        <div className="relative flex items-center justify-center w-16 h-16 bg-white border border-zinc-200 rounded-2xl shadow-sm mb-4">
          <Logo size={32} />
        </div>
        <div className="text-3xl font-bold tracking-tight text-zinc-900">RevTray</div>
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {!isCalculating && (
          <motion.div
            key="header-text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            <h1 className="text-3xl font-medium tracking-tight text-zinc-900 mb-4 z-10 text-center leading-tight">
              Your MRR is
              <br />
              leaking <span className="text-red-500 font-bold">right now.</span>
            </h1>
            <p className="text-base text-zinc-500 font-medium leading-relaxed max-w-[300px] mb-12 z-10">
              Rescuing it requires a bigger screen. Please view our beta on desktop to see the full
              RevTray engine.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Interactive Churn Calculator */}
      <AnimatePresence mode="wait">
        {!isCalculating ? (
          <motion.div
            key="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-sm z-10"
          >
            <button
              onClick={() => setIsCalculating(true)}
              className="w-full px-6 py-4 bg-zinc-900 text-white rounded-2xl font-semibold text-[15px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] active:scale-95 transition-all hover:bg-zinc-800 flex items-center justify-center gap-2"
            >
              Calculate your Revenue Leak
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="calculator"
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            transition={{ type: "spring", bounce: 0.3 }}
            className="w-full max-w-sm bg-white border border-zinc-100 rounded-[2rem] p-6 relative z-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden"
          >
            <h2 className="text-[11px] font-bold text-zinc-400 mb-6 tracking-widest uppercase">
              How much MRR does your Whop generate?
            </h2>

            {/* Big MRR Readout */}
            <div className="text-4xl font-black text-zinc-900 tracking-tighter mb-8">
              ${mrr.toLocaleString()}
              <span className="text-zinc-400 text-xl font-medium tracking-normal">/mo</span>
            </div>

            {/* Slider */}
            <div className="mb-10 relative px-2">
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={sliderValue}
                onChange={(e) => setSliderValue(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-emerald-500 relative z-10"
              />
              <style>{`
                input[type='range']::-webkit-slider-thumb {
                  appearance: none;
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  background: #10b981;
                  cursor: pointer;
                  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                  border: 4px solid #ffffff;
                  transition: transform 0.1s;
                }
                input[type='range']::-webkit-slider-thumb:active {
                  transform: scale(1.05);
                }
              `}</style>
            </div>

            {/* Stats */}
            <div className="space-y-3 text-left">
              <div className="flex justify-between items-center p-4 rounded-2xl bg-red-50/50 border border-red-100/50">
                <span className="text-xs font-semibold text-red-600">
                  Silent Cancellations
                  <br />
                  <span className="text-red-500/70 font-normal mt-0.5 inline-block">
                    Your monthly leak (~12%)
                  </span>
                </span>
                <span className="text-lg font-bold text-red-500">
                  -${monthlyLeak.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/50 shadow-[0_4px_12px_rgba(16,185,129,0.05)]">
                <span className="text-xs font-semibold text-emerald-700">
                  RevTray Average Winback
                  <br />
                  <span className="text-emerald-600/70 font-normal mt-0.5 inline-block">
                    Automated Winback
                  </span>
                </span>
                <span className="text-lg font-bold text-emerald-600 animate-pulse">
                  +$ {recoverable.toLocaleString()}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Bottom CTA - Swipeable */}
      <AnimatePresence>
        {hasSettled && !isDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 150 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, { offset, velocity }) => {
              if (offset.y > 50 || velocity.y > 500) {
                setIsDismissed(true);
              }
            }}
            className="fixed bottom-6 left-6 right-6 z-50 cursor-grab active:cursor-grabbing pb-safe"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 shadow-2xl pointer-events-auto touch-none">
              <div className="w-12 h-1.5 bg-zinc-700/50 rounded-full mx-auto mb-4" />
              <p className="text-[15px] text-zinc-300 mb-5 font-medium text-center leading-snug">
                You could be recovering{" "}
                <span className="text-emerald-400 font-bold">
                  ${recoverable.toLocaleString()}/mo
                </span>{" "}
                automatically.
              </p>
              <button
                onClick={showWaitlist}
                className="w-full py-3.5 bg-white hover:bg-zinc-100 text-zinc-900 font-semibold rounded-2xl text-[15px] transition-transform active:scale-95 shadow-sm"
              >
                Email me a reminder link
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
