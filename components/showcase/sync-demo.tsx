'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { RefreshCw, CheckCircle2, MousePointer2 } from 'lucide-react';

const mockContacts = [
  { email: "cameronmurphy093@gmail.com", status: "Subscribed", source: "Whop" },
  { email: "demo.buyer@example.com", status: "Subscribed", source: "Whop" },
  { email: "tylerroberts55@gmail.com", status: "Subscribed", source: "Whop" },
  { email: "sofiadavies2@gmail.com", status: "Subscribed", source: "Whop" },
];

export function SyncDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { amount: 0.5 });
  const [syncState, setSyncState] = useState<'waiting' | 'idle' | 'clicking' | 'syncing' | 'synced'>('waiting');

  useEffect(() => {
    if (!isInView) return;

    let mounted = true;
    const cycle = async () => {
      while (mounted) {
        setSyncState('idle'); // Cursor moves toward button
        await new Promise(r => setTimeout(r, 1200));
        if (!mounted) break;
        
        setSyncState('clicking'); // Cursor reaches button, shows ripple, button compresses
        await new Promise(r => setTimeout(r, 300));
        if (!mounted) break;
        
        setSyncState('syncing'); // Cursor leaves, button turns to syncing state
        await new Promise(r => setTimeout(r, 2000));
        if (!mounted) break;
        
        setSyncState('synced'); // Content loads
        await new Promise(r => setTimeout(r, 4500));
      }
    };
    cycle();
    return () => { mounted = false; };
  }, [isInView]);

  return (
    <div ref={containerRef} className="w-full h-full p-6 flex flex-col font-sans relative overflow-hidden bg-white rounded-2xl border border-zinc-200 shadow-xl shadow-zinc-200/50">
      
      {/* Animated Cursor */}
      <AnimatePresence>
        {(syncState === 'idle' || syncState === 'clicking') && (
          <motion.div
            initial={{ opacity: 0, right: -20, top: 150 }}
            animate={{ opacity: 1, right: 38, top: 34 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="absolute z-50 text-zinc-800 drop-shadow-md pointer-events-none"
          >
            <MousePointer2 className="w-5 h-5 fill-zinc-800 text-white" />
            {/* Click ripple effect */}
            <AnimatePresence>
              {syncState === 'clicking' && (
                <motion.div 
                   initial={{ opacity: 0, scale: 0 }}
                   animate={{ opacity: [0, 0.4, 0], scale: 2 }}
                   transition={{ duration: 0.3 }}
                   className="absolute -top-1 -left-1 w-6 h-6 bg-zinc-900 rounded-full"
                />
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center mb-6 border-b border-zinc-100 pb-4 relative z-10">
        <div>
          <h4 className="text-xl font-medium text-zinc-900">Contacts</h4>
          <p className="text-xs text-zinc-400 mt-1">
            {syncState === 'synced' ? '25 contacts imported' : 'No contacts imported yet'}
          </p>
        </div>
        
        <button className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 relative overflow-hidden shadow-sm ${
          (syncState === 'idle' || syncState === 'clicking') ? 'bg-[#10B981] text-white' : 
          syncState === 'syncing' ? 'bg-zinc-100 text-zinc-500 border border-zinc-200' :
          'bg-[#ECFDF5] text-[#10B981] border border-[#10B981]/20'
        } ${syncState === 'clicking' ? 'scale-95 bg-[#059669]' : 'scale-100'}`}>
          {(syncState === 'idle' || syncState === 'clicking' || syncState === 'waiting') && <><RefreshCw className="w-3 h-3" /> Sync from Whop</>}
          {syncState === 'syncing' && <><RefreshCw className="w-3 h-3 animate-spin" /> Syncing...</>}
          {syncState === 'synced' && <><CheckCircle2 className="w-3 h-3" /> Synced just now</>}
        </button>
      </div>
      
      <div className="border border-zinc-200 rounded-xl overflow-hidden flex-1 flex flex-col bg-white">
        <div className="grid grid-cols-12 text-xs font-semibold text-zinc-500 bg-zinc-50/80 px-4 py-2.5 border-b border-zinc-200">
           <div className="col-span-6">Contact</div>
           <div className="col-span-3">Status</div>
           <div className="col-span-3">Source</div>
        </div>
        
        <div className="flex flex-col relative flex-1">
           {syncState !== 'synced' ? (
              <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center text-xs text-zinc-400">
                {syncState === 'syncing' ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-zinc-300" />
                    Fetching latest records...
                  </>
                ) : (
                  'Click sync to import contacts'
                )}
              </div>
           ) : (
             <div className="w-full">
               <AnimatePresence>
                 {syncState === 'synced' && mockContacts.map((contact, i) => (
                   <motion.div 
                     key={contact.email}
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.1, duration: 0.3 }}
                     className="grid grid-cols-12 text-xs text-zinc-700 px-4 py-3 border-b border-zinc-100 last:border-0 hover:bg-zinc-50 transition-colors"
                   >
                     <div className="col-span-6 truncate pr-2 font-medium text-zinc-900">{contact.email}</div>
                     <div className="col-span-3">
                       <span className="text-[#10B981] font-medium bg-[#ECFDF5] px-2 py-0.5 rounded-full">{contact.status}</span>
                     </div>
                     <div className="col-span-3 text-zinc-500">{contact.source}</div>
                   </motion.div>
                 ))}
               </AnimatePresence>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
