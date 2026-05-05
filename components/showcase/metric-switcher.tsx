'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, MousePointer2, TrendingUp, DollarSign, AlertCircle, CheckCircle2, Receipt, ArrowRight, MousePointerClick, Inbox, Activity } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export function MetricSwitcher() {
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlipped((prev) => !prev);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center font-sans tracking-tight" style={{ perspective: 2000 }}>
      
      {/* 3D Card Container */}
      <motion.div 
        className="w-full max-w-[420px] relative cursor-pointer"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.8, type: 'spring', bounce: 0.2 }}
        onClick={() => setIsFlipped(!isFlipped)}
        onMouseEnter={() => setIsFlipped(true)}
        onMouseLeave={() => setIsFlipped(false)}
      >
        {/* Front of Card: Standard ESP (Receipt) */}
        <div 
          className="w-full bg-[#fcfcfc] shadow-xl overflow-hidden relative border border-zinc-200"
          style={{ backfaceVisibility: 'hidden', minHeight: '520px', borderRadius: '4px' }}
        >
          {/* Jagged / Sawtooth Top */}
          <div className="absolute top-0 w-full h-[6px] bg-repeat-x z-20" style={{ backgroundImage: 'linear-gradient(135deg, white 25%, transparent 25%), linear-gradient(225deg, white 25%, transparent 25%)', backgroundSize: '12px 12px', backgroundPosition: '0 0, 6px 0' }}></div>
          
          <div className="p-8 pb-10 font-mono text-zinc-600 bg-white h-full flex flex-col pt-12">
            <div className="text-center mb-6 border-b-2 border-dashed border-zinc-200 pb-6">
               <Receipt className="w-10 h-10 mx-auto mb-3 text-zinc-300" />
               <h3 className="text-sm uppercase tracking-widest font-bold text-zinc-800">Standard ESP Report</h3>
               <p className="text-xs text-zinc-400 mt-1">Date: {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>
            </div>

            <div className="space-y-6 mb-auto px-2">
              <div className="flex justify-between items-end border-b border-dotted border-zinc-200 pb-2">
                <span className="text-xs uppercase text-zinc-500 font-medium tracking-wider flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> Open Rate</span>
                <span className="text-lg font-bold text-zinc-800">42.8%</span>
              </div>
              <div className="flex justify-between items-end border-b border-dotted border-zinc-200 pb-2">
                <span className="text-xs uppercase text-zinc-500 font-medium tracking-wider flex items-center gap-2"><MousePointerClick className="w-3.5 h-3.5" /> Click Rate</span>
                <span className="text-lg font-bold text-zinc-800">5.2%</span>
              </div>
              <div className="flex justify-between items-end border-b border-dotted border-zinc-200 pb-2">
                <span className="text-xs uppercase text-zinc-500 font-medium tracking-wider flex items-center gap-2"><Inbox className="w-3.5 h-3.5" /> Deliverability</span>
                <span className="text-lg font-bold text-zinc-800">98.9%</span>
              </div>
            </div>

            <div className="mt-8 px-2">
              <div className="flex flex-col gap-2">
                <span className="text-xs uppercase text-zinc-800 font-bold tracking-wider">Total ROI Generated</span>
                <div className="bg-red-50/80 text-red-600 p-4 mt-2 rounded border border-red-200 flex items-start gap-3 shadow-sm">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 opacity-80" />
                  <span className="text-[11px] font-bold leading-relaxed uppercase tracking-wider">ERROR: Billing Not Connected.<br />Unable to attribute revenue.</span>
                </div>
              </div>
            </div>
            
            {/* Barcode bottom */}
            <div className="mt-8 flex flex-col items-center opacity-30">
               <div className="flex gap-px h-10 w-4/5 justify-center">
                 {[...Array(40)].map((_, i) => (
                   <div 
                     key={i} 
                     className="h-full bg-zinc-800" 
                     style={{ 
                       width: [1, 2, 4, 1, 2, 1, 4, 2, 1, 2][i % 10] + 'px', 
                       marginRight: [1, 2, 1, 1, 2][i % 5] + 'px' 
                     }}
                   />
                 ))}
               </div>
               <span className="text-[9px] tracking-[0.4em] mt-3 font-bold text-zinc-900">CUST-RPT-ERR-001</span>
            </div>
          </div>
        </div>

        {/* Back of Card: RevTray Report */}
        <div 
          className="w-full bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden absolute inset-0"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', minHeight: '520px' }}
        >
          {/* Subtle gradient instead of heavy green glow for a more professional look */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="p-10 font-sans h-full bg-transparent relative z-10 flex flex-col">
            <div className="flex items-center justify-center mb-10 pb-6 border-b border-zinc-100">
               <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-[14px] bg-white border border-zinc-100 flex items-center justify-center shadow-sm relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-br from-white to-zinc-50/50"></div>
                   <div className="relative z-10 scale-[0.8] text-[#10B981]">
                     <Logo size={36} />
                   </div>
                 </div>
                 <div className="text-left">
                   <h3 className="text-xl font-bold text-zinc-900 tracking-tight">RevTray Verified</h3>
                   <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-widest mt-1 flex items-center gap-1.5">
                     <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> ROI Report
                   </p>
                 </div>
               </div>
            </div>

            <div className="space-y-4 mb-auto">
              <div className="bg-white rounded-[20px] p-5 border border-emerald-100/60 shadow-[0_4px_24px_rgba(16,185,129,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[200%] h-full bg-gradient-to-r from-transparent via-emerald-400/5 to-transparent -translate-x-full animate-[shimmer_3s_infinite] pointer-events-none skew-x-[-20deg]" />
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <DollarSign className="w-3.5 h-3.5 bg-emerald-50 rounded-md text-emerald-500 p-0.5" /> Recovered MRR
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">$4,250</span>
                  <span className="text-xs font-semibold text-zinc-400">/mo</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-[20px] p-5 border border-emerald-100/60 shadow-[0_4px_24px_rgba(16,185,129,0.15)] relative overflow-hidden group hover:border-emerald-200 transition-colors">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 bg-emerald-50 rounded-md text-emerald-500 p-0.5" /> Subs Saved
                  </span>
                  <div className="flex items-baseline gap-1.5">
                     <span className="text-2xl font-bold text-zinc-800 tracking-tight">142</span>
                     <span className="text-[10px] text-zinc-500 font-medium">/mo</span>
                  </div>
                </div>

                <div className="bg-white rounded-[20px] p-5 border border-emerald-100/60 shadow-[0_4px_24px_rgba(16,185,129,0.15)] relative overflow-hidden group hover:border-emerald-200 transition-colors">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <Activity className="w-3.5 h-3.5 bg-emerald-50 rounded-md text-emerald-500 p-0.5" /> Total ROI
                  </span>
                  <div className="flex items-baseline gap-1.5">
                     <span className="text-2xl font-bold text-zinc-800 tracking-tight">852%</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[20px] p-5 border border-emerald-100/60 shadow-[0_4px_24px_rgba(16,185,129,0.15)] relative overflow-hidden group hover:border-emerald-200 transition-colors">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <Receipt className="w-3.5 h-3.5 bg-emerald-50 rounded-md text-emerald-500 p-0.5" /> Revenue Attributed
                </span>
                <div className="flex items-baseline gap-1.5">
                   <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">$12,450</span>
                   <span className="text-xs font-semibold text-zinc-400">Total</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-100 flex items-center justify-center">
               <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg">
                 <span className="relative flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/80 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                 </span>
                 Direct Whop Billing Sync
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-10 text-center text-zinc-500 font-medium text-xs uppercase tracking-widest flex items-center justify-center gap-4 bg-white border border-zinc-200 px-5 py-2.5 rounded-full shadow-sm"
      >
        <span className={isFlipped ? "text-zinc-400" : "text-zinc-900 font-bold"}>Standard ESP</span>
        <ArrowRight className={`w-4 h-4 transition-colors ${isFlipped ? 'text-emerald-500' : 'text-zinc-300'}`} />
        <span className={isFlipped ? "text-emerald-600 font-bold" : "text-zinc-400"}>RevTray</span>
      </motion.p>
    </div>
  );
}
