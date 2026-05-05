'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Activity, Sparkles } from 'lucide-react';

export function TimelineGraph() {
  const [phase, setPhase] = useState<'reset' | 'drawing' | 'dipping' | 'intervening' | 'recovering' | 'recovered' | 'fading'>('reset');
  const [mrrSaved, setMrrSaved] = useState(0);

  useEffect(() => {
    let active = true;
    const runSequence = async () => {
      while (active) {
        setPhase('reset');
        await new Promise(r => setTimeout(r, 100));
        if (!active) break;
        
        setPhase('drawing');
        await new Promise(r => setTimeout(r, 2000));
        if (!active) break;
        
        setPhase('dipping');
        await new Promise(r => setTimeout(r, 800));
        if (!active) break;
        
        setPhase('intervening');
        await new Promise(r => setTimeout(r, 600));
        if (!active) break;
        
        setPhase('recovering');
        await new Promise(r => setTimeout(r, 1500));
        if (!active) break;
        
        setPhase('recovered');
        await new Promise(r => setTimeout(r, 3500));
        if (!active) break;

        setPhase('fading');
        await new Promise(r => setTimeout(r, 800));
        if (!active) break;
      }
    };
    runSequence();
    return () => { active = false; };
  }, []);

  // Tick up MRR
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (phase === 'recovering' || phase === 'recovered') {
      let current = mrrSaved;
      const target = 2450;
      const step = target / 20; 
      interval = setInterval(() => {
        current += step;
        if (current >= target) {
          setMrrSaved(target);
          clearInterval(interval);
        } else {
          setMrrSaved(Math.floor(current));
        }
      }, 50);
    } else if (phase === 'reset' || phase === 'drawing') {
      setMrrSaved(0);
    }
    return () => clearInterval(interval);
  }, [phase]);

  // ViewBox: 0 0 800 300
  const path1 = "M -50 180 C 50 180, 150 150, 220 160 C 290 170, 350 140, 400 180";
  const path2 = "M 400 180 C 420 200, 435 230, 450 250";
  const path3 = "M 450 250 C 460 260, 480 180, 550 110 C 620 40, 700 50, 850 30";

  // Coordinates for the node: X=450, Y=250.
  // 450 / 800 = 56.25%
  // 250 / 300 = 83.33%

  return (
    <div className="w-full relative">
      <div className="relative w-full aspect-[4/3] md:aspect-[2.5/1] bg-[#0a0a0a] rounded-3xl border border-zinc-800 p-6 md:p-10 shadow-2xl overflow-hidden flex flex-col">
        
        {/* Background glow when recovering */}
        <div 
          className="absolute inset-0 bg-emerald-500/10 blur-3xl transition-opacity duration-1000 pointer-events-none"
          style={{ opacity: (phase === 'recovering' || phase === 'recovered') ? 1 : 0 }}
        />

        {/* Global SVG Filters */}
        <svg className="absolute w-0 h-0">
          <defs>
            <filter id="glowNormal">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="glowDanger">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="glowSuccess">
              <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            
            <linearGradient id="areaSuccess" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(16, 185, 129, 0.4)" />
              <stop offset="100%" stopColor="rgba(16, 185, 129, 0.0)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Header Badge & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-40 relative">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">MRR Intervention</h3>
            </div>
            <p className="text-sm font-medium text-zinc-500 max-w-sm">
              Watch RevTray catch revenue slips before they happen.
            </p>
          </div>

          {/* Central Prominent Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ 
              opacity: (phase === 'recovering' || phase === 'recovered') ? 1 : 0,
              y: (phase === 'recovering' || phase === 'recovered') ? 0 : -10
            }}
            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md shadow-[0_0_30px_rgba(16,185,129,0.2)]"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-emerald-300 font-bold">Total MRR Saved</span>
              <span className="text-xl md:text-2xl font-bold text-white tracking-tight">${mrrSaved.toLocaleString()}</span>
            </div>
          </motion.div>
        </div>

        {/* Graph Area */}
        <motion.div 
          className="flex-1 relative mt-8 mb-2 w-full min-h-[150px] md:min-h-[200px]"
          animate={{ opacity: phase === 'fading' ? 0 : 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px] md:bg-[size:60px_60px] pointer-events-none rounded-xl" />

          {/* SVG Canvas */}
          <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 800 300" preserveAspectRatio="none">
            
            {/* Area Fill for Recovery (Fades in) */}
            <motion.path 
              d={`${path3} L 850 350 L 450 350 Z`}
              fill="url(#areaSuccess)"
              initial={{ opacity: 0 }}
              animate={{ opacity: phase === 'recovered' ? 1 : (phase === 'recovering' ? 0.5 : 0) }}
              transition={{ duration: 1 }}
            />

            {/* Path 1: Normal */}
            <motion.path 
              d={path1}
              fill="none"
              stroke="#a1a1aa"
              strokeWidth="4"
              strokeLinecap="round"
              filter="url(#glowNormal)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: (phase !== 'reset') ? 1 : 0 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />

            {/* Path 2: Dipping (Red) */}
            <motion.path 
              d={path2}
              fill="none"
              stroke="#ef4444"
              strokeWidth="4"
              strokeLinecap="round"
              filter="url(#glowDanger)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: (phase === 'dipping' || phase === 'intervening' || phase === 'recovering' || phase === 'recovered' || phase === 'fading') ? 1 : 0 }}
              transition={{ duration: 0.8, ease: "easeIn" }}
            />

            {/* Path 3: Recovering (Green) */}
            <motion.path 
              d={path3}
              fill="none"
              stroke="#10b981"
              strokeWidth="5"
              strokeLinecap="round"
              filter="url(#glowSuccess)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: (phase === 'recovering' || phase === 'recovered' || phase === 'fading') ? 1 : 0 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />

          </svg>

          {/* RevTray AI Intervention Node */}
          <AnimatePresence>
            {(phase === 'intervening' || phase === 'recovering' || phase === 'recovered' || phase === 'fading') && (
              <motion.div 
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="absolute z-30 pointer-events-none"
                style={{ left: "56.25%", top: "83.33%", x: "-50%", y: "-50%" }}
              >
                {/* Ping rings */}
                <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
                <div className="absolute inset-[-10px] rounded-full border border-emerald-500/50 animate-ping opacity-50" style={{ animationDelay: '0.2s' }} />
                
                {/* Main Node */}
                <div className="relative w-4 md:w-5 h-4 md:h-5 bg-white rounded-full shadow-[0_0_20px_rgba(16,185,129,1)] border-4 border-emerald-500 flex items-center justify-center z-10" />

                {/* Tooltip */}
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="absolute top-8 md:top-10 left-1/2 -translate-x-1/2 bg-zinc-900 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center justify-center gap-1.5 min-w-max shadow-2xl"
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span className="text-[11px] font-bold text-white tracking-wide">RevTray AI</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Threat Indicator Toast */}
          <AnimatePresence>
            {(phase === 'dipping' || phase === 'intervening') && (
              <motion.div 
                initial={{ opacity: 0, x: -20, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute z-20 bg-red-500/10 border border-red-500/30 backdrop-blur-sm px-2 md:px-3 py-1 md:py-1.5 rounded-full flex items-center gap-1.5 md:gap-2 shadow-[0_0_20px_rgba(239,68,68,0.2)] pointer-events-none"
                style={{ left: "45%", top: "70%" }}
              >
                <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[8px] md:text-[10px] font-bold text-red-400 uppercase tracking-widest">Churn Risk Detected</span>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>

      </div>
    </div>
  );
}
