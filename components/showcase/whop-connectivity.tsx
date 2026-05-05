'use client';

import { motion } from 'framer-motion';
import { Database, Zap, ArrowRight, MessageSquare, GraduationCap, CreditCard, ShieldCheck } from 'lucide-react';

export function WhopConnectivity() {
  return (
    <div className="relative w-full max-w-4xl mx-auto h-[400px] bg-white rounded-3xl border border-zinc-100 overflow-hidden shadow-2xl p-8">
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between h-full gap-12">
        {/* Whop Side */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-zinc-50 border border-zinc-200 flex items-center justify-center relative group shadow-sm">
            <div className="absolute inset-0 bg-blue-50/50 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-10 h-10 bg-zinc-200 rounded-lg animate-pulse" />
            {/* Pulsing rings */}
            <div className="absolute inset-[-4px] border border-blue-100 rounded-3xl animate-ping opacity-20"></div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest mb-1">Source</div>
            <div className="text-sm font-bold text-zinc-900">Whop Dashboard</div>
          </div>
        </div>

        {/* Data Streams Area */}
        <div className="flex-1 relative h-full w-full hidden md:block">
          <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
            {/* Stream 1: Discord */}
            <DataStreamPath d="M 0 100 Q 200 0 400 100" color="#818cf8" delay={0} />
            {/* Stream 2: Courses */}
            <DataStreamPath d="M 0 100 Q 200 100 400 100" color="#34d399" delay={0.5} />
            {/* Stream 3: Subs */}
            <DataStreamPath d="M 0 100 Q 200 200 400 100" color="#60a5fa" delay={1} />
          </svg>

          {/* Floating Event Indicators */}
          <FloatingEvent icon={MessageSquare} color="text-indigo-400" label="Role Change" top="20%" left="30%" delay={0} />
          <FloatingEvent icon={GraduationCap} color="text-emerald-400" label="Course Finish" top="45%" left="50%" delay={0.4} />
          <FloatingEvent icon={CreditCard} color="text-blue-400" label="Sub Renewed" top="70%" left="70%" delay={0.8} />
        </div>

        {/* RevTray Side */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-green-50 border border-green-100 flex items-center justify-center relative group shadow-sm">
            <div className="absolute inset-0 bg-green-100/50 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <Zap className="w-10 h-10 text-green-600 relative z-10" />
            
            {/* Success Ping */}
            <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white z-20"></div>
          </div>
          <div className="text-center">
            <div className="text-[10px] font-mono font-bold text-green-600 uppercase tracking-widest mb-1">Destination</div>
            <div className="text-sm font-bold text-zinc-900">RevTray Engine</div>
          </div>
        </div>
      </div>

      {/* Metadata Labels */}
      <div className="absolute bottom-4 left-0 right-0 px-8 flex justify-between items-center opacity-40">
        <div className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-900">LATENCY: &lt;12MS</div>
        <div className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-900">WEBHOOK: ACTIVE</div>
        <div className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-900">SYNC: REAL-TIME</div>
      </div>
    </div>
  );
}

function DataStreamPath({ d, color, delay }: { d: string; color: string; delay: number }) {
  return (
    <>
      <path d={d} fill="none" stroke="black" strokeWidth="1" strokeOpacity="0.03" />
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray="4 20"
        initial={{ strokeDashoffset: 100 }}
        animate={{ strokeDashoffset: 0 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
          delay
        }}
      />
    </>
  );
}

function FloatingEvent({ icon: Icon, color, label, top, left, delay }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: [0, 1, 1, 0],
        scale: [0.8, 1, 1, 0.8],
        x: [0, 20, 40, 60]
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        delay,
        ease: "easeInOut"
      }}
      style={{ top, left }}
      className="absolute flex items-center gap-2 bg-white border border-zinc-100 rounded-full px-3 py-1.5 shadow-md z-30"
    >
      <Icon size={12} className={color} />
      <span className="text-[9px] font-bold text-zinc-800 uppercase tracking-tight">{label}</span>
    </motion.div>
  );
}
