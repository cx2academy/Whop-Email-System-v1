'use client';

import { motion } from 'framer-motion';
import { WorkflowGraphic } from './workflow-graphic';
import { AgentSwarm } from './agent-swarm';
import { MetricSwitcher } from './metric-switcher';
import { SyncDemo } from './sync-demo';

function Crosshair({ className = "" }: { className?: string }) {
  return (
    <svg className={`absolute w-[11px] h-[11px] text-zinc-300 z-20 ${className}`} viewBox="0 0 11 11" fill="none">
      <path d="M5.5 0v11M0 5.5h11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function GlowingLine({ horizontal = false, delay = 0, className = "" }: { horizontal?: boolean, delay?: number, className?: string }) {
  return (
    <div className={`absolute overflow-hidden z-20 pointer-events-none ${horizontal ? 'h-[1px] w-full' : 'w-[1px] h-full'} ${className}`}>
      <motion.div
        animate={horizontal ? { x: ['-100%', '300%'] } : { y: ['-100%', '300%'] }}
        transition={{ repeat: Infinity, duration: 4, ease: "linear", delay }}
        className={`absolute ${horizontal ? 'h-[1px] w-[30%] left-0 top-0 bg-gradient-to-r' : 'w-[1px] h-[30%] top-0 left-0 bg-gradient-to-b'} from-transparent via-zinc-400 to-transparent`}
      />
    </div>
  );
}

export function ContinuousBento() {
  return (
    <section className="w-full bg-[#FAFAFA] flex flex-col items-center pt-24 overflow-hidden relative border-t border-zinc-200">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
        style={{ 
          backgroundImage: `linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)`, 
          backgroundSize: '40px 40px' 
        }} 
      />

      <div className="relative w-full max-w-[1280px] border-x border-zinc-200 z-10 flex flex-col">
          {/* Header */}
          <div className="px-6 md:px-12 pt-16 pb-20 border-b border-zinc-200 relative bg-white/70 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-6">
               <div className="h-px w-6 bg-zinc-300"></div>
               <span className="text-zinc-500 font-mono text-xs uppercase tracking-widest font-semibold">[01] Powerful Platform</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[56px] font-medium text-zinc-900 tracking-tight max-w-4xl text-balance">
              MRR recovery at full throttle. <span className="text-zinc-400 font-normal">Execute your winback strategy with precision. Design powerful workflows, deploy AI, and automate recovery.</span>
            </h2>
            <Crosshair className="-bottom-[6px] -left-[6px]" />
            <Crosshair className="-bottom-[6px] -right-[6px]" />
            <GlowingLine horizontal delay={0} className="bottom-0 left-0" />
            <GlowingLine horizontal delay={2} className="top-0 left-0" />
          </div>

          {/* Row 1: Automations */}
          <div className="flex flex-col lg:flex-row w-full border-b border-zinc-200 relative bg-white">
            <Crosshair className="-bottom-[6px] -left-[6px]" />
            <Crosshair className="-bottom-[6px] -right-[6px]" />
            {/* The vertical divider line with crosshairs */}
            <div className="hidden lg:block absolute top-0 bottom-0 left-1/3 w-[1px] bg-zinc-200 z-10">
               <GlowingLine delay={1.5} className="top-0 left-0" />
               <Crosshair className="-bottom-[6px] -ml-[5px]" />
            </div>

            <div className="lg:w-1/3 flex flex-col p-8 lg:p-12 relative z-10">
              <h3 className="text-2xl font-medium text-zinc-900 mb-3 tracking-tight">Automate everything</h3>
              <p className="text-zinc-500 leading-relaxed text-balance">
                You're in control. Automate your winback sequences based on specific cancellation reasons and subscription tiers to intercept MRR leaks.
              </p>
            </div>
            <div className="lg:w-2/3 p-4 md:p-8 bg-[#FAFAFA] relative overflow-hidden flex items-center justify-center min-h-[500px] border-t lg:border-t-0 border-zinc-200 lg:border-l-0">
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.02)_0%,transparent_70%)]" />
               <div className="relative w-full max-w-[600px] scale-90 sm:scale-100">
                  <WorkflowGraphic />
               </div>
            </div>
          </div>

          {/* Row 2: Data Model */}
          <div className="flex flex-col lg:flex-row w-full border-b border-zinc-200 relative bg-white z-0">
            <Crosshair className="-bottom-[6px] -left-[6px]" />
            <Crosshair className="-bottom-[6px] -right-[6px]" />
            <div className="hidden lg:block absolute top-0 bottom-0 right-1/3 w-[1px] bg-zinc-200 z-10">
               <GlowingLine delay={3.5} className="top-0 left-0" />
               <Crosshair className="-bottom-[6px] -ml-[5px]" />
            </div>

            <div className="lg:w-2/3 p-4 md:p-12 relative overflow-hidden flex items-center justify-center min-h-[400px] order-2 lg:order-1 bg-[#FAFAFA] border-t lg:border-t-0 border-zinc-200">
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.02)_0%,transparent_70%)]" />
               <div className="relative w-full max-w-xl scale-90 sm:scale-100 z-10 h-[340px]">
                 <SyncDemo />
               </div>
            </div>

            <div className="lg:w-1/3 flex flex-col p-8 lg:p-12 relative z-10 order-1 lg:order-2">
              <h3 className="text-2xl font-medium text-zinc-900 mb-3 tracking-tight">Direct Integration</h3>
              <p className="text-zinc-500 leading-relaxed text-balance">
                A seamless integration syncing your Whop products, subscriptions, and churning customers in real-time to trigger flows based on actual billing data.
              </p>
            </div>
          </div>

          {/* Row 3: Reporting */}
          <div className="flex flex-col lg:flex-row w-full border-b border-zinc-200 relative bg-white">
            <Crosshair className="-bottom-[6px] -left-[6px]" />
            <Crosshair className="-bottom-[6px] -right-[6px]" />
            <div className="hidden lg:block absolute top-0 bottom-0 left-1/3 w-[1px] bg-zinc-200 z-10">
               <GlowingLine delay={0.5} className="top-0 left-0" />
               <Crosshair className="-bottom-[6px] -ml-[5px]" />
            </div>

            <div className="lg:w-1/3 flex flex-col p-8 lg:p-12 relative z-10">
              <h3 className="text-2xl font-medium text-zinc-900 mb-3 tracking-tight">Powerful reporting</h3>
              <p className="text-zinc-500 leading-relaxed text-balance">
                Create real-time, detailed reports that actually track your recovered MRR. Get deep insights into your most successful winback flows and exactly why customers are leaving.
              </p>
            </div>
            <div className="lg:w-2/3 p-4 md:p-8 bg-[#FAFAFA] relative overflow-hidden flex items-center justify-center min-h-[500px] border-t lg:border-t-0 border-zinc-200 lg:border-l-0">
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.02)_0%,transparent_70%)]" />
               <div className="scale-90 md:scale-100 w-full max-w-[420px] flex items-center justify-center z-10">
                  <MetricSwitcher />
               </div>
            </div>
          </div>

          {/* Row 4: Deploy AI */}
          <div className="flex flex-col w-full relative bg-white border-b border-zinc-200">
            <Crosshair className="-bottom-[6px] -left-[6px]" />
            <Crosshair className="-bottom-[6px] -right-[6px]" />
            
            <div className="w-full flex justify-center p-8 lg:p-12 lg:pb-16 text-center border-b border-zinc-200 bg-white z-10 relative">
              <div className="max-w-3xl flex flex-col items-center">
                <h3 className="text-2xl md:text-3xl font-medium text-zinc-900 mb-4 tracking-tight">Deploy AI Agents</h3>
                <p className="text-zinc-500 leading-relaxed text-balance max-w-2xl text-lg">
                  Let our AI superagent analyze the churn data and orchestrate highly-personalized email sequences that convert silently cancelled users.
                </p>
              </div>
              <GlowingLine delay={2.5} className="bottom-0 left-0 h-[100px] w-[1px]" />
            </div>
            
            <div className="w-full relative flex items-center justify-center bg-[#FAFAFA] min-h-[500px] overflow-hidden">
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.02)_0%,transparent_70%)]" />
               <div className="absolute inset-0 w-full h-full z-10">
                 <AgentSwarm />
               </div>
            </div>
          </div>

      </div>
    </section>
  );
}
