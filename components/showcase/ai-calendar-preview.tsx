'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Sparkles, TrendingUp, Mail } from 'lucide-react';

export function AiCalendarPreview() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const events = [
    { day: 5, label: '24hr Discord Access Expiring Reminder', type: 'urgent' },
    { day: 12, label: 'New Course Module Bonus Unlock', type: 'reward' },
    { day: 19, label: 'Abandoned Checkout: Free Trading Guide', type: 'recovery' },
    { day: 26, label: 'Subscription Extension Offer', type: 'upsell' },
    { day: 27, label: 'Flash Sale: Monthly Pass 20% Off', type: 'hype' },
  ];
  
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null);

  return (
    <div className="relative p-6 bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden group">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg text-green-500">
            <Calendar size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">AI ROI Calendar</h4>
            <p className="text-[10px] text-zinc-500">Peak hour scheduling for Whop traffic</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
          <Sparkles size={12} className="text-green-500" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">Predictive</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const event = events.find(e => e.day === day);
          const isHighTraffic = day % 7 === 0 || day % 7 === 6; // Weekends

          return (
            <div 
              key={day}
              onMouseEnter={() => event && setHoveredEvent(event.label)}
              onMouseLeave={() => setHoveredEvent(null)}
              className={`aspect-square rounded-lg border flex flex-col items-center justify-center relative transition-all duration-300 ${
                event 
                  ? 'border-green-500/50 bg-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.15)] cursor-pointer' 
                  : isHighTraffic
                  ? 'border-white/10 bg-white/[0.04]'
                  : 'border-white/5 bg-white/[0.02]'
              }`}
            >
              <span className={`text-[10px] font-medium ${event ? 'text-green-400' : 'text-zinc-600'}`}>
                {day}
              </span>
              
              {event && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="mt-1"
                >
                  <div className={`h-1.5 w-1.5 rounded-full ${
                    event.type === 'urgent' ? 'bg-red-400' : 
                    event.type === 'reward' ? 'bg-blue-400' :
                    'bg-green-400'
                  }`} />
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {hoveredEvent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-4 left-6 right-6 p-3 bg-white text-black rounded-xl shadow-2xl z-20 pointer-events-none"
          >
            <div className="flex items-center gap-2 mb-1">
              <Mail size={12} className="text-zinc-400" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Auto-Scheduled Campaign</span>
            </div>
            <p className="text-xs font-bold leading-tight">{hoveredEvent}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-6 flex gap-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-[10px] text-zinc-400 font-medium">Peak Traffic Window</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-white" />
          <span className="text-[10px] text-zinc-400 font-medium">AI Scheduled Drop</span>
        </div>
      </div>

      {/* Hover overlay hint */}
      <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex items-center justify-center">
        <div className="px-4 py-2 bg-black border border-white/10 rounded-full text-[10px] font-bold text-white uppercase tracking-widest shadow-2xl">
          Auto-Optimizing...
        </div>
      </div>
    </div>
  );
}
