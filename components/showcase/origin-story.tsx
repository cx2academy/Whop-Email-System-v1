'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { TrendingDown, SearchX, Zap, AlertCircle, Sparkles } from 'lucide-react';

export function OriginStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const glowColor = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ["rgba(244, 63, 94, 0.15)", "rgba(245, 158, 11, 0.15)", "rgba(16, 185, 129, 0.15)"]
  );

  return (
    <section ref={containerRef} className="relative bg-white border-t border-zinc-100">
      {/* Background timeline line that runs down the middle/side on desktop */}
      <div className="hidden md:block absolute left-[45%] lg:left-[50%] top-0 bottom-0 w-px bg-zinc-100">
         <motion.div 
            className="w-full bg-zinc-900 origin-top"
            style={{ scaleY: scrollYProgress }}
         />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative flex flex-col md:flex-row items-start">
        
        {/* Left: Sticky Headline */}
        <div className="w-full md:w-[45%] lg:w-[50%] md:sticky md:top-0 md:h-screen flex flex-col justify-start pt-24 pb-12 md:pt-[30vh] pr-0 md:pr-16 lg:pr-24 lg:pl-12 z-10 bg-white/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-b border-zinc-100 md:border-none">
           <div className="absolute inset-0 z-[-1] hidden md:block">
             <motion.div 
               className="absolute top-[30vh] left-1/4 w-64 h-64 -translate-y-1/2 rounded-full blur-[80px]"
               style={{ backgroundColor: glowColor }}
             />
           </div>

           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.5 }}
             className="relative"
           >
             <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white border border-zinc-200 text-xs sm:text-sm font-semibold text-zinc-600 w-fit mb-6 sm:mb-8 shadow-sm">
               <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
               </span>
               Built by Whop Creators
             </div>
             
             <h2 className="text-4xl md:text-6xl lg:text-[72px] font-medium text-zinc-900 tracking-tight leading-[1.05]">
               Why we built <br className="hidden md:block" />
               <span className="text-zinc-400">RevTray.</span>
             </h2>
             
             <p className="mt-6 md:mt-8 text-base md:text-lg lg:text-xl font-medium text-zinc-500 max-w-sm leading-relaxed">
               We decided to stop waiting for someone else to build the solution, so we built the exact system we use to recover thousands in lost MRR.
             </p>
           </motion.div>
        </div>

        {/* Right: Scrolling Story */}
        <div className="w-full md:w-[55%] lg:w-[50%] flex flex-col md:pb-[20vh] relative pt-12 md:pt-0">
          
          <StoryStep 
            icon={<TrendingDown className="w-7 h-7 text-rose-500" />}
            title="The Pain"
            headline="Watching MRR slip away."
            description="As high-earning Whop creators ourselves, we watched helplessly as inactive users slipped away. Our engagement was plummeting, and once a user churned, there was no hope of getting them back."
            isFirst
            visual={
              <div className="mt-8 p-6 bg-white border border-zinc-100 rounded-2xl shadow-sm">
                 <div className="text-xs font-bold tracking-wider text-zinc-400 mb-6 flex justify-between items-center">
                   ACTIVE SUBSCRIBERS
                   <span className="text-rose-500 bg-rose-50 px-2 py-0.5 rounded flex items-center gap-1"><TrendingDown size={12} /> -14%</span>
                 </div>
                 <div className="flex items-end gap-3 h-28 opacity-80">
                    {[60, 55, 48, 42, 35, 28, 22].map((val, i) => (
                       <div key={i} className="flex-1 bg-zinc-50 rounded-t-sm relative h-full flex items-end group">
                          <div 
                            className="w-full bg-rose-200 group-hover:bg-rose-300 transition-colors rounded-t-sm" 
                            style={{ height: `${val}%` }} 
                          />
                       </div>
                    ))}
                 </div>
              </div>
            }
          />

          <StoryStep 
            icon={<SearchX className="w-7 h-7 text-amber-500" />}
            title="The Search"
            headline="Stuck in 2010."
            description="We looked into existing email marketing software. They were all the same: expensive, painfully manual, and constantly breaking during imports. Nothing was built specifically to handle community churn at scale."
            visual={
              <div className="mt-8 p-6 bg-red-50/50 border border-red-100 rounded-2xl relative overflow-hidden shadow-sm">
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-sm border border-red-200/50 mt-1">
                    <AlertCircle size={20} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="text-[15px] font-bold text-red-900">CSV Import Failed</div>
                    <div className="text-sm text-red-700/80 leading-relaxed">
                      743 rows skipped. Missing required field "first_name" on line 42. Duplicate email found on line 128.
                    </div>
                    <div className="pt-3">
                       <button className="px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-semibold rounded-lg shadow-sm hover:bg-red-50 transition-colors">
                         View Details
                       </button>
                    </div>
                  </div>
                </div>
              </div>
            }
          />

          <StoryStep 
            icon={<Zap className="w-7 h-7 text-emerald-500" />}
            title="The Build"
            headline="Building the solution."
            description="We dumped our time and resources into developing a platform that works for you. RevTray isn't just software—it's the AI-native system we desperately needed to automate our winbacks and retain our users."
            visual={
              <div className="mt-8 p-6 lg:p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex justify-between items-start mb-8 relative z-10">
                   <div className="flex gap-4 items-center">
                     <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shadow-inner">
                       <Sparkles className="w-6 h-6 text-emerald-400" />
                     </div>
                     <div>
                       <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">Campaign Status</div>
                       <div className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                         RevTray Automations
                       </div>
                     </div>
                   </div>
                   <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/20">
                     <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                     </span>
                     <span className="text-[11px] font-bold uppercase tracking-wider">Active</span>
                   </div>
                </div>
                
                <div className="space-y-4 relative z-10">
                  <div className="h-2 bg-zinc-800 rounded-full w-full overflow-hidden shadow-inner">
                    <motion.div 
                      className="h-full bg-emerald-500" 
                      initial={{ width: 0 }}
                      whileInView={{ width: "78%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    />
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-[11px] text-zinc-500 font-medium mb-0.5">Recovery Rate</div>
                      <div className="text-white font-bold text-xl">78%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-zinc-500 font-medium mb-0.5">Revenue Recovered</div>
                      <div className="text-emerald-400 font-bold text-xl">+$4,200</div>
                    </div>
                  </div>
                </div>
              </div>
            }
          />

        </div>
      </div>
    </section>
  );
}

function StoryStep({ 
  icon, title, headline, description, visual, isFirst = false 
}: { 
  icon: React.ReactNode, title: string, headline: string, description: string, visual?: React.ReactNode, isFirst?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 80%", "center 50%", "end 20%"]
  });

  // Spotlight effect mapping
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.15, 1, 1, 0.15]);
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.95, 1, 1, 0.95]);
  const blur = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], ["blur(8px)", "blur(0px)", "blur(0px)", "blur(8px)"]);

  return (
    <motion.div 
      ref={ref}
      style={{ opacity, scale, filter: blur }}
      className={`relative flex flex-col gap-5 md:gap-6 pl-8 md:pl-16 ${isFirst ? 'mt-10 mb-24 md:mt-[30vh] md:mb-40' : 'my-24 md:my-40'}`}
    >
      {/* Node icon on mobile timeline */}
      <div className="absolute left-[-16px] md:left-[-32px] top-0 md:top-[-10px] w-8 h-8 md:w-16 md:h-16 rounded-xl bg-white border-2 md:border border-zinc-200 flex items-center justify-center shadow-sm z-10 hidden md:flex">
         <div className="relative z-10 scale-75 md:scale-100">
           {icon}
         </div>
      </div>
      
      {/* Mobile icon inline */}
      <div className="w-12 h-12 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm relative md:hidden">
         {icon}
      </div>

      <div className="space-y-3 md:space-y-4">
        <h4 className="text-xs md:text-sm font-bold tracking-widest uppercase text-zinc-400">{title}</h4>
        <h3 className="text-3xl md:text-5xl lg:text-[54px] font-medium text-zinc-900 tracking-tight leading-[1.1]">{headline}</h3>
        <p className="text-base md:text-lg lg:text-xl text-zinc-500 leading-relaxed font-medium">
          {description}
        </p>
      </div>
      
      {visual && (
        <div className="w-full">
          {visual}
        </div>
      )}
    </motion.div>
  );
}
