'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useMotionTemplate } from 'framer-motion';
import { Check, Sparkles, ChevronRight, Diamond } from 'lucide-react';

export function PricingSection({ onWaitlistOpen }: { onWaitlistOpen?: () => void }) {
  const [contacts, setContacts] = useState<number>(10000);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerX.set(e.clientX - rect.left);
    pointerY.set(e.clientY - rect.top);
  }

  // Pricing constants
  const MAX_CONTACTS = 100000;
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContacts(Number(e.target.value));
  };

  // Determine plan
  let planName = 'Growth';
  let planDescription = 'The standard for serious creators.';
  let monthlyPrice = 89;
  let features: { name: string; isUnlock?: boolean }[] = [];

  if (contacts <= 5000) {
    planName = 'Starter';
    planDescription = 'For growing communities scaling on Whop.';
    monthlyPrice = 45;
    features = [
      { name: '5,000 emails / month' },
      { name: '2,500 contacts' },
      { name: 'Unlimited campaigns' },
      { name: '14-day attribution' },
      { name: 'Whop Role Sync' }
    ];
  } else if (contacts >= 50000) {
    planName = 'Scale';
    planDescription = 'For the Whale Creators & Agencies.';
    monthlyPrice = 249;
    features = [
      { name: 'Unlimited emails' },
      { name: 'Unlimited contacts' },
      { name: 'Full attribution sync' },
      { name: 'Unlimited automations' },
      { name: 'Dedicated IP address', isUnlock: true },
      { name: 'Custom Webhooks', isUnlock: true },
      { name: 'Account Manager', isUnlock: true },
      { name: 'Early API Access', isUnlock: true }
    ];
  } else {
    planName = 'Growth';
    planDescription = 'The standard for serious creators.';
    monthlyPrice = 89;
    features = [
      { name: '25,000 emails / month' },
      { name: '10,000 contacts' },
      { name: 'Unlimited campaigns' },
      { name: '14-day attribution' },
      { name: 'Full attribution sync', isUnlock: true },
      { name: 'Unlimited automations', isUnlock: true },
      { name: 'Course Progress Triggers', isUnlock: true },
      { name: 'Priority Deliverability', isUnlock: true }
    ];
  }

  const annualPrice = Math.floor(monthlyPrice * 0.8);
  const displayPrice = billingCycle === 'annual' ? annualPrice : monthlyPrice;
  const sliderRatio = contacts / MAX_CONTACTS;

  return (
    <section id="pricing" className="py-32 px-6 bg-[#0a0a0a] border-t border-zinc-900 flex flex-col items-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto w-full relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-sm font-semibold text-zinc-300 w-fit mb-6">
            <Diamond className="w-4 h-4 text-emerald-400" />
            Founder&apos;s Black Card Access
          </div>
          <h2 className="text-4xl md:text-6xl font-medium text-white leading-[1.1] tracking-tight mb-6">
            Priced for <span className="text-zinc-500">ROI.</span>
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto text-balance">
            Drag the slider to find the right tier for your Whop community size. Lock in early-bird rates before they disappear.
          </p>
        </div>

        <motion.div 
          layout
          className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-[2rem] p-8 md:p-12 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay pointer-events-none" />

          {/* Slider */}
          <motion.div layout className="mb-16 relative z-10 select-none">
            <div className="flex justify-between items-end mb-6">
              <div>
                <div className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-1.5">
                   Whop Community Members
                </div>
                <div className="text-4xl font-medium text-white tracking-tight">{contacts >= MAX_CONTACTS ? '100k+' : contacts.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-1.5">Recommended Tier</div>
                <div className={`text-2xl font-medium tracking-tight transition-all duration-500 ${planName === 'Scale' ? 'bg-gradient-to-r from-emerald-300 via-white to-emerald-400 bg-clip-text text-transparent transform scale-105 origin-right' : 'text-emerald-400'}`}>
                  {planName}
                </div>
              </div>
            </div>
            
            <div className="relative h-3 bg-zinc-950 rounded-full mt-8 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] border border-zinc-800">
              {[5000, 50000].map(tick => (
                <div key={tick} className="absolute top-full mt-0 w-px h-2 bg-zinc-700" style={{ left: `${(tick / MAX_CONTACTS) * 100}%` }} />
              ))}
              {[5000, 50000].map(tick => (
                <div key={`lbl-${tick}`} className="absolute top-full mt-3 text-[11px] font-mono text-zinc-400 font-medium -translate-x-1/2" style={{ left: `${(tick / MAX_CONTACTS) * 100}%` }}>
                  {tick >= 1000 ? `${tick/1000}k` : tick}
                </div>
              ))}
              
              <motion.div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                style={{ width: `${(contacts / MAX_CONTACTS) * 100}%` }}
                layout
              />
              <input
                type="range"
                min="0"
                max={MAX_CONTACTS}
                step="1000"
                value={contacts}
                onChange={handleSliderChange}
                className="absolute top-1/2 -translate-y-1/2 left-0 w-full opacity-0 cursor-pointer h-10 z-20 m-0 p-0 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:border-0"
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-7 h-7 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_2px_3px_rgba(255,255,255,0.3),inset_0_-2px_3px_rgba(0,0,0,0.5)] bg-gradient-to-b from-zinc-300 to-zinc-500 pointer-events-none flex items-center justify-center border border-zinc-400 z-10 transition-transform"
                style={{ left: `calc(${sliderRatio * 100}% - ${sliderRatio * 28}px)` }}
              >
                <div className="flex gap-0.5">
                  <div className="w-px h-3 bg-zinc-600/50 rounded-full" />
                  <div className="w-px h-3 bg-zinc-600/50 rounded-full" />
                  <div className="w-px h-3 bg-zinc-600/50 rounded-full" />
                </div>
              </div>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-[1fr_minmax(0,320px)] gap-12 relative z-10 lg:gap-16 items-stretch">
            {/* Left: Price Card */}
            <div className="flex flex-col pt-4 md:pt-0 pr-0">
              <div 
                onMouseMove={handleMouseMove}
                className="relative p-10 rounded-3xl bg-[#111] border border-zinc-700/50 shadow-[0_20px_40px_rgba(0,0,0,0.4)] h-full flex flex-col items-center overflow-hidden group transition-all duration-500 hover:scale-[1.02] hover:border-zinc-600/50 hover:shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
              >
                <div className="absolute inset-0 bg-[#0a0a0a] z-0" />

                {/* Carbon Fiber Background */}
                <div 
                  className="absolute inset-0 z-0 pointer-events-none" 
                  style={{ 
                    backgroundImage: `repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #1a1a1a 25%, #1a1a1a 75%, #000 75%, #000)`, 
                    backgroundPosition: `0 0, 4px 4px`, 
                    backgroundSize: `8px 8px`,
                    opacity: 1
                  }} 
                />

                {/* Glow Shader */}
                <motion.div
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-10"
                  style={{
                    background: useMotionTemplate`radial-gradient(400px circle at ${pointerX}px ${pointerY}px, rgba(255,255,255,0.15), transparent 40%)`,
                    mixBlendMode: 'color-dodge'
                  }}
                />

                <div className="w-10 h-8 rounded-md bg-gradient-to-br from-zinc-400 to-zinc-600 opacity-60 flex items-center justify-center overflow-hidden relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_2px_4px_rgba(0,0,0,0.5)] self-start mb-10 z-20">
                   <div className="absolute inset-0 border border-black/20 rounded-md" />
                   <div className="w-full h-px bg-black/20 absolute top-1/2 -translate-y-1/2" />
                   <div className="h-full w-px bg-black/20 absolute left-1/2 -translate-x-1/2" />
                   <div className="w-6 h-4 border border-black/10 rounded-sm absolute" />
                </div>

                <div className="flex items-center gap-1 bg-[#1a1a1a] p-1.5 rounded-xl border border-white/5 relative z-20 mb-8 mx-auto self-center">
                  <button 
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${billingCycle === 'monthly' ? 'bg-[#222] text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Monthly
                  </button>
                  <button 
                    onClick={() => setBillingCycle('annual')}
                    className={`px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${billingCycle === 'annual' ? 'bg-[#222] text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Annual
                  </button>
                  <div className="absolute -top-3 right-0 transform rotate-12 bg-emerald-500 text-zinc-950 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-lg pointer-events-none">
                     20% OFF
                  </div>
                </div>

                <div className="mt-auto relative z-20 w-full flex flex-col items-center flex-1">
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-6xl md:text-7xl lg:text-8xl font-medium tracking-tighter text-white">${displayPrice}</span>
                    <span className="text-zinc-500 font-medium text-lg">/mo</span>
                  </div>
                  
                  <div className="h-10 mb-8 max-w-full flex items-center justify-center relative w-full">
                    <AnimatePresence mode="popLayout">
                      {billingCycle === 'annual' ? (
                        <motion.div 
                          key="annual-info"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex items-center gap-3 absolute justify-center w-full"
                        >
                          <span className="text-sm text-zinc-400 font-medium">Billed annually</span>
                          <span className="border border-emerald-500/20 text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-tight">Founder&apos;s rate: Save ${monthlyPrice * 12 - annualPrice * 12}/yr</span>
                        </motion.div>
                      ) : (
                        <motion.div 
                          key="monthly-info"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="text-sm text-zinc-400 font-medium flex items-center gap-3 absolute justify-center w-full"
                        >
                          Billed monthly
                          <span className="text-zinc-500 line-through text-[10px] font-bold uppercase tracking-tight">Legacy Value: ${Math.floor(monthlyPrice * 2.5)}/mo</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <button 
                    onClick={onWaitlistOpen}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 mt-auto rounded-xl font-bold bg-white text-black hover:bg-zinc-200 transition-colors group/btn"
                  >
                    Apply for Black Card
                    <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                  
                  <div className="flex justify-center items-center gap-3 mt-6">
                    <div className="flex -space-x-2">
                       <div className="w-6 h-6 rounded-full border border-[#222] bg-zinc-800 flex items-center justify-center text-[8px] font-bold text-white">7F</div>
                       <div className="w-6 h-6 rounded-full border border-[#222] bg-emerald-600 flex items-center justify-center text-[8px] font-bold text-white">6F</div>
                       <div className="w-6 h-6 rounded-full border border-[#222] bg-zinc-900 flex items-center justify-center text-[8px] font-bold text-white">8F</div>
                    </div>
                    <span className="text-[11px] font-medium text-zinc-500 tracking-tight">Designed by high-earning creators</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Features */}
            <motion.div layout className="flex flex-col justify-start min-h-[400px] pt-4 md:pt-8">
              <motion.div layout className="text-sm font-bold text-white mb-2">{planName} Tier Includes:</motion.div>
              <motion.div layout className="text-sm text-zinc-400 mb-6">{planDescription}</motion.div>
              
              <motion.ul layout className="space-y-4 mb-4">
                {features.filter(f => !f.isUnlock).map((feature) => (
                  <motion.li layout key={`core-${feature.name}`} className="flex gap-3 text-sm text-zinc-400">
                    <Check className="w-5 h-5 text-zinc-600 shrink-0" />
                    <span>{feature.name}</span>
                  </motion.li>
                ))}
              </motion.ul>

              <AnimatePresence mode="popLayout">
                {features.some(f => f.isUnlock) ? (
                  <motion.div 
                    key={`unlocks-${planName}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4 }}
                    className="mt-6 border-t border-zinc-800/50 pt-6 overflow-hidden"
                  >
                    <div className="text-[10px] font-bold tracking-widest text-emerald-500 uppercase mb-4 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" /> Tier Unlocks
                    </div>
                    <ul className="space-y-4">
                      {features.filter(f => f.isUnlock).map((feature, i) => (
                        <motion.li 
                          key={`${planName}-unlock-${feature.name}`}
                          initial={{ opacity: 0, x: -10, filter: 'blur(4px)', color: '#10b981' }}
                          animate={{ opacity: 1, x: 0, filter: 'blur(0px)', color: '#d4d4d8' }}
                          transition={{ delay: i * 0.1, duration: 0.4 }}
                          className="flex gap-3 text-sm font-medium"
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.1 + 0.2 }}
                          >
                            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                          </motion.div>
                          <span className="text-zinc-200">{feature.name}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty-unlocks"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 border-t border-zinc-800/50 pt-6 overflow-hidden flex-1 flex items-center justify-center"
                  >
                    <div className="w-full flex items-center justify-center p-8 border-2 border-dashed border-zinc-800/30 rounded-2xl bg-zinc-900/10">
                       <span className="text-zinc-600 text-xs font-medium text-center leading-relaxed max-w-[200px]">Drag slider past 5k<br/>to reveal Growth unlocks</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
