'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Send, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';

const terminalSteps = [
  { text: '$ connect --source whop_members', delay: 800 },
  { text: '> INGESTING: 1,248 active members... done', delay: 1500, type: 'success' },
  { text: '$ analyze --segment "churn_risk_high"', delay: 2500 },
  { text: '> IDENTIFIED: 142 users. 0 logins in 14 days', delay: 3500, type: 'warning' },
  { text: '$ generate --campaign "win_back_discount"', delay: 4500 },
  { text: '> COMPILING ASSETS: Subject, Body, CTA... done', delay: 6000, type: 'success' },
  { text: '$ deploy --mode autopilot --trigger "now"', delay: 7000 },
  { text: '> DEPLOYED: Campaign actively tracking ROI.', delay: 8000, type: 'success' },
];

export function AiTerminalPreview() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    let timeouts: NodeJS.Timeout[] = [];
    
    const runSequence = () => {
      setCurrentStepIndex(0);
      setIsTyping(true);
      
      terminalSteps.forEach((step, index) => {
        timeouts.push(
          setTimeout(() => {
            setCurrentStepIndex(index);
            if (index === terminalSteps.length - 1) {
              setIsTyping(false);
              // Restart sequence after a long pause
              timeouts.push(setTimeout(runSequence, 12000));
            }
          }, step.delay)
        );
      });
    };

    runSequence();

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="grid md:grid-cols-2 gap-6 items-stretch">
      {/* Terminal View pane */}
      <div className="bg-[#050505] rounded-2xl border border-white/10 flex flex-col overflow-hidden shadow-2xl relative min-h-[400px]">
        {/* Terminal Header */}
        <div className="bg-[#111] px-4 py-3 border-b border-white/5 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
          </div>
          <div className="mx-auto text-[10px] font-mono font-medium text-zinc-500 flex items-center gap-1">
            <Terminal size={12} /> orchestrator.exe
          </div>
        </div>
        
        {/* Terminal Body */}
        <div className="p-6 font-mono text-sm flex flex-col gap-3 font-medium h-full">
          <AnimatePresence>
            {terminalSteps.slice(0, currentStepIndex + 1).map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`${
                  step.type === 'success' ? 'text-green-400' :
                  step.type === 'warning' ? 'text-yellow-400' :
                  'text-zinc-300'
                }`}
              >
                {step.text}
              </motion.div>
            ))}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-2 h-4 bg-zinc-400 mt-1"
              />
            )}
          </AnimatePresence>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#050505] to-transparent pointer-events-none"></div>
      </div>

      {/* Preview View pane */}
      <div className="relative bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden shadow-2xl min-h-[400px] flex items-center justify-center p-8">
        {/* Ambient Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_70%)] pointer-events-none"></div>
        
        {currentStepIndex < 5 ? (
          // Skeleton State
          <div className="w-full max-w-sm flex flex-col items-center">
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
            >
              <Loader2 className="w-10 h-10 text-indigo-500/50 mb-6" />
            </motion.div>
            <div className="w-3/4 h-6 bg-white/5 rounded animate-pulse mb-6"></div>
            <div className="w-full h-32 bg-white/5 rounded-xl animate-pulse mb-4"></div>
            <div className="w-1/2 h-10 bg-white/5 rounded-full animate-pulse"></div>
          </div>
        ) : (
          // Rendered State
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl overflow-hidden relative"
          >
            {/* Tiny top border for style */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
            
            {/* Email Header Info */}
            <div className="mb-6 flex gap-3 items-center">
              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                <Send size={18} />
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-widest text-zinc-400 uppercase">Automated Campaign</div>
                <div className="text-sm font-bold text-zinc-900">Still with us? Here's 20% off.</div>
              </div>
            </div>
            
            {/* Email Body Preview */}
            <div className="space-y-3 mb-6">
              <div className="h-3 w-1/4 bg-zinc-100 rounded"></div>
              <div className="h-3 w-full bg-zinc-100 rounded"></div>
              <div className="h-3 w-full bg-zinc-100 rounded"></div>
              <div className="h-3 w-5/6 bg-zinc-100 rounded"></div>
            </div>

            {/* CTA */}
            <div className="w-full bg-indigo-500 text-white rounded-xl py-3 flex text-center justify-center text-sm font-bold shadow-md">
              Claim 20% Discount
            </div>

            {/* Validation badge */}
            {currentStepIndex >= 7 && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="absolute -bottom-2 -right-2 bg-green-500 text-black text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1 uppercase tracking-widest"
               >
                 <CheckCircle2 size={12} /> Deployed successfully
               </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
