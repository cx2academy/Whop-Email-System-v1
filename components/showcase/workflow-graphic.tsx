'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Mail, Clock, ChevronRight, CheckCircle2, Sparkles, UserPlus, ArrowUp, Loader2 } from 'lucide-react';

export function WorkflowGraphic() {
  const [phase, setPhase] = useState<'hidden' | 'idle' | 'typing' | 'sending' | 'building' | 'done'>('hidden');
  const [text, setText] = useState('');
  
  const targetText = "Launch a winback campaign for churned users... +20% discount code";
  
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "-20%" });

  // Handle visibility state
  useEffect(() => {
    if (!isInView) {
      setPhase('hidden');
      setText('');
    } else if (phase === 'hidden' && isInView) {
      setPhase('idle');
    }
  }, [isInView, phase]);

  // Auto sequence
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (phase === 'idle') {
      setText('');
      timeout = setTimeout(() => setPhase('typing'), 800);
    } 
    else if (phase === 'typing') {
      let i = 0;
      const typeInterval = setInterval(() => {
        setText(targetText.slice(0, i));
        i++;
        if (i > targetText.length) {
          clearInterval(typeInterval);
          timeout = setTimeout(() => setPhase('sending'), 400); // Small pause before send pulse
        }
      }, 30); // Faster typing
      return () => clearInterval(typeInterval);
    }
    else if (phase === 'sending') {
      timeout = setTimeout(() => setPhase('building'), 400); // Reduced delay
    }
    else if (phase === 'building') {
      timeout = setTimeout(() => setPhase('done'), 2250); // 2x faster (half of 4500)
    }
    // Doesn't auto reset from 'done'. Restarts on scroll out/in.
    
    return () => clearTimeout(timeout);
  }, [phase]);

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-center relative min-h-[400px]">
        
      {/* Background Grid */}
      <div className="absolute inset-[-100px] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none rounded-[40px] mask-image-[radial-gradient(ellipse_at_center,black_40%,transparent_70%)]"></div>

      <div className="absolute top-12 w-full z-30 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] px-4 origin-top" 
           style={{ transform: phase === 'hidden' || phase === 'idle' || phase === 'typing' || phase === 'sending' ? 'translateY(120px) scale(1.1)' : 'translateY(-10px) scale(0.55)' }}>
        
        {/* The Prompt Input Box */}
        <div className={`w-full max-w-[680px] mx-auto bg-white rounded-2xl border transition-all duration-700 overflow-hidden relative ${
           (phase === 'building' || phase === 'sending' || phase === 'done') ? 'border-emerald-500/50' : 'border-zinc-200'
        } ${phase === 'sending' ? 'scale-[0.98]' : 'scale-100'} ${
           (phase === 'hidden' || phase === 'idle' || phase === 'typing') ? 'shadow-2xl' :
           (phase === 'sending' || phase === 'building' || phase === 'done') ? 'shadow-[0_0_40px_rgba(16,185,129,0.3)]' :
           'shadow-md'
        }`}>
           
           {/* Top Progress / Pulse Bar */}
           <div className="absolute top-0 left-0 right-0 h-1.5 bg-transparent overflow-hidden">
               <div className={`absolute top-0 left-0 h-full transition-all duration-[1500ms] ease-out ${
                    (phase === 'building') ? 'bg-emerald-400 animate-pulse' : 
                    (phase === 'done') ? 'bg-emerald-400' : 'bg-emerald-300'
               }`} 
                    style={{ width: (phase === 'idle' || phase === 'hidden') ? '0%' : '100%', opacity: phase === 'done' ? 0.3 : 1 }} 
               />
               {/* Send Pulse effect */}
               <motion.div 
                   initial={false}
                   animate={{ 
                     opacity: phase === 'sending' ? [0, 1, 0] : 0, 
                     scaleX: phase === 'sending' ? [1, 1.05, 1] : 1 
                   }}
                   transition={{ duration: 0.6, times: [0, 0.5, 1] }}
                   className="absolute top-0 left-0 h-full w-full bg-white shadow-[0_0_15px_6px_rgba(52,211,153,0.8)] blur-[2px]"
               />
           </div>
           
           <div className="p-5 sm:p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${(phase === 'building' || phase === 'sending' || phase === 'done') ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-500'}`}>
                   <Sparkles className={`w-5 h-5 ${(phase === 'building' || phase === 'sending') ? 'animate-pulse' : ''}`} />
                </div>
                
                <div className="flex-1 flex items-center">
                   {(phase === 'idle' || phase === 'hidden') && <span className="w-0.5 h-6 bg-emerald-500 animate-[pulse_1s_infinite]" />}
                   
                   {(phase !== 'idle' && phase !== 'hidden') && (
                      <p className={`text-zinc-800 font-medium text-[16px] sm:text-[18px] flex items-center gap-1 transition-opacity duration-300 ${phase === 'done' ? 'opacity-50' : 'opacity-100'}`}>
                         {text}
                         {phase === 'typing' && <span className="inline-block w-0.5 h-6 bg-emerald-500 animate-[pulse_1s_infinite]" />}
                      </p>
                   )}
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-center">
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  (phase === 'hidden' || phase === 'idle' || phase === 'typing') 
                    ? (text.length < targetText.length 
                       ? 'bg-zinc-100 text-zinc-400' 
                       : 'bg-emerald-500 text-white shadow-md')
                    : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {(phase === 'sending' || phase === 'building') ? (
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  ) : phase === 'done' ? (
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </div>
              </div>
           </div>
        </div>
      </div>

      {/* The Resulting Workflow Nodes */}
      <div className="absolute inset-0 flex items-center justify-center pt-24 z-10 pointer-events-none">
         <AnimatePresence mode="wait">
            {(phase === 'building' || phase === 'done') && (
               <div className="relative w-full max-w-[800px] h-[300px]">
                 
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
                   <motion.div
                     animate={{ y: [0, -6, 0, 6, 0] }}
                     transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                     className="relative flex items-center justify-center gap-6 w-full px-4"
                   >
                     {/* The "Ghost Builder" Glow Dot */}
                     {phase === 'building' && (
                       <motion.div
                         initial={{ opacity: 0 }}
                         animate={{
                           x: [0, -152, -152, -252, -252, 160, 160, 10, 10, 182, 182, 262, 262, 262],
                           y: [100, -100, -100, 0, 0, 120, 120, 0, 0, 160, 160, 0, 50, 50],
                           opacity: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0]
                         }}
                         transition={{ duration: 2.1, times: [0, 0.095, 0.119, 0.262, 0.310, 0.405, 0.429, 0.571, 0.619, 0.714, 0.738, 0.881, 0.929, 1], ease: "easeInOut" }}
                         className="absolute top-1/2 left-1/2 w-4 h-4 z-50 pointer-events-none"
                         style={{ marginLeft: '-8px', marginTop: '-8px' }}
                       >
                         <div className="absolute inset-0 bg-emerald-400 rounded-full shadow-[0_0_20px_6px_rgba(52,211,153,0.6)] animate-pulse"></div>
                         <div className="absolute -inset-2 bg-emerald-300/40 rounded-full blur-sm"></div>
                         <div className="absolute inset-1 bg-white rounded-full"></div>
                       </motion.div>
                     )}
                     
                     {/* Trigger Node */}
                     <motion.div 
                       initial={{ opacity: 0, x: 100, y: -100, scale: 0.8 }}
                       animate={phase === 'done' ? { opacity: 1, scale: 1, x: 0, y: 0 } : { 
                         opacity: [0, 0.5, 0.5, 1, 1], 
                         scale: [0.8, 1.05, 1.05, 1, 1],
                         x: [100, 100, 100, 0, 0],
                         y: [-100, -100, -100, 0, 0]
                       }}
                       transition={{ 
                          duration: phase === 'done' ? 0.5 : 2.1, 
                          times: phase === 'done' ? undefined : [0, 0.095, 0.119, 0.262, 1], 
                          ease: "easeInOut" 
                       }}
                       className={`w-[180px] bg-white border rounded-2xl p-4 relative group shrink-0 transition-all duration-700 ease-out ${phase === 'done' ? 'border-emerald-300 shadow-[0_8px_30px_rgba(52,211,153,0.25)] ring-1 ring-emerald-500/30' : 'border-zinc-200 shadow-sm'}`}
                     >
                      <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center mb-3 text-rose-500">
                        <UserPlus size={16} className="transform rotate-180 opacity-0" />
                        <span className="absolute">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="17" y1="8" x2="23" y2="14"/><line x1="23" y1="8" x2="17" y2="14"/></svg>
                        </span>
                      </div>
                      <div className="text-xs font-bold text-zinc-900 mb-1 leading-tight">Churned User</div>
                      <div className="text-[10px] text-zinc-500">Inactive &gt; 45d</div>
                      
                      <div className="hidden md:block absolute top-1/2 -right-1.5 w-3 h-3 bg-white border-2 border-zinc-200 rounded-full -translate-y-1/2 z-10"></div>
                    </motion.div>

                    {/* Connector */}
                    <div className="hidden md:block h-0.5 relative w-6 shrink-0">
                      <motion.div 
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: phase === 'done' ? 0 : 0.55, duration: 0.3 }}
                        className="absolute inset-0 bg-zinc-200 origin-left"
                      />
                      <div className={`absolute inset-0 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] transition-all duration-700 ease-out origin-left delay-100 ${phase === 'done' ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}`} />
                      <div className={`absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 z-10 transition-colors duration-700 delay-100 ${phase === 'done' ? 'text-emerald-500' : 'text-zinc-300'}`}>
                         <ChevronRight size={14} />
                      </div>
                    </div>

                    {/* Action Node (Wait + Email) */}
                    <motion.div 
                      initial={{ opacity: 0, x: 150, y: 120, scale: 0.8 }}
                      animate={phase === 'done' ? { opacity: 1, scale: 1, x: 0, y: 0 } : { 
                        opacity: [0, 0, 0.5, 0.5, 1, 1],
                        scale: [0.8, 0.8, 1.05, 1.05, 1, 1],
                        x: [150, 150, 150, 150, 0, 0],
                        y: [120, 120, 120, 120, 0, 0]
                      }}
                      transition={{ 
                         duration: phase === 'done' ? 0.5 : 2.1, 
                         times: phase === 'done' ? undefined : [0, 0.310, 0.405, 0.429, 0.571, 1], 
                         ease: "easeInOut" 
                      }}
                      className={`w-[200px] bg-white border rounded-2xl relative shrink-0 transition-all duration-700 ease-out delay-[150ms] ${phase === 'done' ? 'border-emerald-300 shadow-[0_8px_30px_rgba(52,211,153,0.3)] ring-1 ring-emerald-500/30' : 'border-indigo-100 shadow-[0_4px_20px_rgba(99,102,241,0.08)]'}`}
                    >
                      <div className="bg-orange-50 border-b border-orange-100 px-4 py-2 rounded-t-2xl flex items-center gap-2">
                         <Clock size={12} className="text-orange-500" />
                         <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider">Delay 2d</span>
                      </div>
                      <div className="p-4 relative">
                         <div className="hidden md:block absolute top-1/2 -left-1.5 w-3 h-3 bg-white border-2 border-zinc-200 rounded-full -translate-y-1/2 z-10"></div>
                         <div className="hidden md:block absolute top-1/2 -right-1.5 w-3 h-3 bg-white border-2 border-orange-200 rounded-full -translate-y-1/2 z-10"></div>
                         
                         <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center mb-3 text-orange-600">
                           <Mail size={16} />
                         </div>
                         <div className="text-xs font-bold text-zinc-900 mb-1 leading-tight">Winback Offer</div>
                         <div className="text-[10px] text-zinc-500">20% off returning code</div>
                      </div>
                    </motion.div>

                    {/* Connector */}
                    <div className="hidden md:block h-0.5 relative w-6 shrink-0">
                      <motion.div 
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: phase === 'done' ? 0 : 1.2, duration: 0.3 }}
                        className="absolute inset-0 bg-orange-200 origin-left"
                      />
                      <div className={`absolute inset-0 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] transition-all duration-700 ease-out origin-left delay-[300ms] ${phase === 'done' ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}`} />
                      <div className={`absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 z-10 transition-colors duration-700 delay-[300ms] ${phase === 'done' ? 'text-emerald-500' : 'text-orange-300'}`}>
                        <ChevronRight size={14} />
                      </div>
                    </div>

                    {/* Success Node */}
                    <motion.div 
                      initial={{ opacity: 0, x: -80, y: 160, scale: 0.8 }}
                      animate={phase === 'done' ? { opacity: 1, scale: 1, x: 0, y: 0 } : { 
                        opacity: [0, 0, 0.5, 0.5, 1, 1],
                        scale: [0.8, 0.8, 1.05, 1.05, 1, 1],
                        x: [-80, -80, -80, -80, 0, 0],
                        y: [160, 160, 160, 160, 0, 0]
                      }}
                      transition={{ 
                         duration: phase === 'done' ? 0.5 : 2.1, 
                         times: phase === 'done' ? undefined : [0, 0.619, 0.714, 0.738, 0.881, 1], 
                         ease: "easeInOut" 
                      }}
                      className={`w-[160px] bg-white border rounded-2xl p-4 relative shrink-0 transition-all duration-700 ease-out delay-[450ms] ${phase === 'done' ? 'border-emerald-400 shadow-[0_8px_40px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/40' : 'border-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/20'}`}
                    >
                      <div className="hidden md:block absolute top-1/2 -left-1.5 w-3 h-3 bg-white border-2 border-emerald-200 rounded-full -translate-y-1/2 z-10"></div>
                      
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle2 size={12} />
                      </div>
                      <div className="text-lg font-bold text-emerald-600 mb-1 leading-tight">Recovered</div>
                      <div className="text-[10px] text-zinc-500 leading-tight">Revenue Saved</div>
                    </motion.div>
                  </motion.div>
                 </div>
               </div>
            )}
         </AnimatePresence>
      </div>

    </div>
  );
}

