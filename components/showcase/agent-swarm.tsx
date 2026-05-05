'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { UserMinus, BrainCircuit, Sparkles, Send } from 'lucide-react';

const users = [
  {
    id: 1,
    name: "Alex M.",
    role: "Designer",
    churned: "2 days ago",
    reason: "Too complex",
    emailSubject: "Alex, a simplified workspace for you",
    emailBody: "We noticed you found the interface overwhelming. I've automatically configured a minimalist workspace tailored for designers..."
  },
  {
    id: 2,
    name: "Jordan K.",
    role: "Developer",
    churned: "5 days ago",
    reason: "Missing API",
    emailSubject: "Jordan, v2 API is live (+ free credits) 🚀",
    emailBody: "You needed better endpoints. They're here. Here's a private beta key and 50K compute credits to resume your testing..."
  },
  {
    id: 3,
    name: "Casey R.",
    role: "Founder",
    churned: "1 week ago",
    reason: "Price",
    emailSubject: "Casey, a special startup plan",
    emailBody: "Bootstrapping is hard. Let's make this work. I've generated a 6-month runway grant for your account so you can focus on building..."
  }
];

type SwarmItem = {
  id: string;
  userIndex: number;
  isEven: boolean;
};

export function AgentSwarm() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { margin: "-20%" });
  
  const [items, setItems] = useState<SwarmItem[]>([]);
  const [pulse, setPulse] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!isInView) {
      setItems([]);
      return;
    }

    const addItem = () => {
      const id = Math.random().toString();
      const userIndex = indexRef.current % users.length;
      const isEven = indexRef.current % 2 === 0;
      indexRef.current++;
      
      setItems(prev => [...prev, { id, userIndex, isEven }]);

      // Pulse exactly when left card hits center
      setTimeout(() => {
         setPulse(true);
         setTimeout(() => setPulse(false), 900);
      }, 4500); 

      // Remove item after completing both animations
      setTimeout(() => {
         setItems(prev => prev.filter(item => item.id !== id));
      }, 9500);
    };

    addItem();
    const interval = setInterval(addItem, 3000); // Stagger interval (causes max 3 items to exist concurrently)

    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden pointer-events-none">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" style={{ maskImage: "radial-gradient(ellipse at center, black 40%, transparent 70%)" }}></div>
        
        {/* Central Connecting Line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-zinc-200/50 to-transparent -translate-y-1/2" />
        
        {items.map(item => {
            const u = users[item.userIndex];
            
            return (
              <div key={item.id} className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 w-full h-full">
                
                {/* Left Card: Churned User */}
                <motion.div
                  initial={{ opacity: 0, x: -450, y: item.isEven ? -140 : 140, scale: 1.1 }}
                  animate={{
                     opacity: [0, 1, 1, 0.5, 0], // fades out right as it hits center
                     x: [-450, -280, -100, -20, 0],
                     y: [
                        item.isEven ? -140 : 140, 
                        item.isEven ? -80 : 80, 
                        item.isEven ? -30 : 30, 
                        0, 0
                     ],
                     scale: [1.1, 1.1, 0.9, 0.4, 0]
                  }}
                  transition={{
                     duration: 4.5,
                     times: [0, 0.15, 0.6, 0.9, 1], // Stays big until 0.6, then gets sucked in
                     ease: "easeInOut"
                  }}
                  className="absolute w-full max-w-[200px] bg-white/90 backdrop-blur-sm border border-zinc-200/80 shadow-[0_8px_30px_rgba(0,0,0,0.08)] rounded-2xl p-3 origin-center pointer-events-none"
                >
                    <div className="flex items-center gap-2 mb-2 border-b border-zinc-100/80 pb-2">
                       <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shrink-0 shadow-sm border border-rose-100/50">
                           <UserMinus size={14} />
                       </div>
                       <div>
                           <div className="font-bold text-zinc-900 text-[13px] leading-tight">{u.name}</div>
                           <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">{u.role}</div>
                       </div>
                    </div>
                    <div className="space-y-1.5">
                       <div className="flex justify-between items-center text-[11px]">
                          <span className="text-zinc-500 font-medium">Churned:</span>
                          <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100/50">{u.churned}</span>
                       </div>
                       <div className="flex justify-between items-center text-[11px]">
                          <span className="text-zinc-500 font-medium">Reason:</span>
                          <span className="font-semibold text-zinc-700">{u.reason}</span>
                       </div>
                    </div>
                </motion.div>

                {/* Right Card: Pop out email */}
                <motion.div
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  animate={{
                     opacity: [0, 0, 1, 1, 0],
                     x: [0, 0, 80, 250, 450],
                     y: [
                        0, 0,
                        item.isEven ? 40 : -40,
                        item.isEven ? 80 : -80,
                        item.isEven ? 100 : -100
                     ],
                     scale: [0, 0, 0.5, 1, 1.1]
                  }}
                  transition={{
                     duration: 9, // Entire life span
                     times: [0, 0.5, 0.55, 0.95, 1], // Wait 4.5s (0.5), scale up immediately (0.55), move, stay, fade out
                     ease: "easeOut"
                  }}
                  className="absolute w-full max-w-[260px] bg-white border border-emerald-200 shadow-[0_16px_40px_rgba(16,185,129,0.15)] rounded-2xl p-4 relative ring-1 ring-emerald-500/10 origin-center pointer-events-none"
                >
                    {/* Connecting beam overlay from core to card */}
                    <motion.div 
                       initial={{ scaleX: 0, opacity: 1 }}
                       animate={{ 
                         scaleX: [0, 0, 1, 0], 
                         opacity: [0, 0, 1, 0], 
                         x: [0, 0, 0, 100] 
                       }}
                       transition={{ 
                         duration: 9,
                         times: [0, 0.5, 0.55, 0.7]
                       }}
                       className="absolute top-1/2 -left-[100px] w-[100px] h-0.5 bg-gradient-to-r from-emerald-400 to-transparent origin-left z-[-1]"
                    />
                    
                    <div className="flex items-center gap-2 mb-3 border-b border-zinc-100 pb-3">
                       <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm border border-emerald-200/50">
                           <Sparkles className="w-4 h-4" />
                       </div>
                       <div className="text-[10px] md:text-[11px] font-bold text-emerald-600 uppercase tracking-widest leading-tight">
                           Personalized<br/>Winback
                       </div>
                    </div>
                    <div className="space-y-2 relative">
                       <div className="absolute -top-1 -left-2 text-4xl text-emerald-100 opacity-50 font-serif leading-none select-none pointer-events-none">"</div>
                       <div className="font-bold text-zinc-900 text-[13px] leading-tight relative z-10">
                           {u.emailSubject}
                       </div>
                       <div className="text-[11px] text-zinc-600 leading-relaxed relative z-10 italic">
                           {u.emailBody}
                       </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-zinc-50 flex justify-end">
                       <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-100/50 px-2 py-1 rounded-lg border border-emerald-200/50 shadow-sm">
                          <Send className="w-3 h-3" /> Auto-Sent
                       </div>
                    </div>
                </motion.div>

              </div>
            );
        })}

        {/* Center: AI Agent Core */}
        <div className="relative flex justify-center z-20 mx-auto pointer-events-auto">
            <motion.div 
               animate={{ scale: pulse ? [1, 1.15, 1] : 1 }}
               transition={{ duration: 0.6, ease: "easeInOut" }}
               className="relative flex items-center justify-center"
            >
                {/* Ping rings */}
                <div className={`absolute -inset-4 rounded-full border-2 border-emerald-500/20 transition-all duration-700 ${pulse ? 'animate-ping opacity-100' : 'opacity-0 scale-50'}`} />
                <div className={`absolute -inset-8 rounded-full border border-emerald-500/10 transition-all duration-1000 delay-100 ${pulse ? 'animate-ping opacity-100' : 'opacity-0 scale-50'}`} />
                
                <div className={`relative flex items-center justify-center w-28 h-28 rounded-full bg-zinc-900 shadow-2xl z-10 transition-all duration-500 ${pulse ? 'shadow-[0_0_60px_rgba(16,185,129,0.5)] border-emerald-500' : 'border-zinc-800'} border-[6px]`}>
                    <div className={`absolute inset-0 rounded-full transition-opacity duration-300 ${pulse ? 'bg-emerald-500/30 opacity-100' : 'opacity-0'}`} />
                    <BrainCircuit className={`w-12 h-12 transition-colors duration-500 ${pulse ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'text-zinc-500'}`} />
                    
                    {/* Micro badge */}
                    <div className="absolute -bottom-3 bg-zinc-800 text-zinc-300 text-[10px] font-mono px-3 py-1.5 rounded-full border border-zinc-700/50 font-semibold whitespace-nowrap shadow-xl select-none flex items-center gap-1.5 backdrop-blur-md">
                       <span className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${pulse ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
                       RevTray AI
                    </div>
                </div>
            </motion.div>
        </div>

    </div>
  );
}
