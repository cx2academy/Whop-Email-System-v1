"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Zap,
  Lock,
  Clock,
  Sparkles,
  Workflow,
  Users,
  MessageSquare,
  ChevronRight,
  ShieldAlert,
  Search,
} from "lucide-react";
import Link from "next/link";
import { SharedFooter } from "@/components/ui/shared-footer";
import { useBetaPopup } from "@/components/ui/beta-popup-context";

export default function AutomationsPage() {
  const { show: showBetaPopup, showWaitlist } = useBetaPopup();
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  const activeFeatures = [
    {
      title: "Whop Event Triggers",
      status: "Live",
      description:
        "Automate sequences the millisecond a user joins, upgrades, or disputes in your Whop dashboard.",
      icon: <Workflow className="w-6 h-6 text-green-500" />,
    },
    {
      title: "Smart Segmentation",
      status: "Live",
      description:
        "Auto-group users by LTV, session frequency, and renewal status without touching a CSV.",
      icon: <Users className="w-6 h-6 text-green-500" />,
    },
  ];

  const upcomingFeatures = [
    {
      title: "AI Content Weaver",
      revealDate: "May 12",
      description:
        "Generates high-converting email copy based on your specific Whop product category.",
      icon: <Sparkles className="w-6 h-6 text-indigo-400" />,
    },
    {
      title: "Predictive Attrition Guard",
      revealDate: "May 19",
      description:
        "Identifies users likely to cancel 48 hours before they even open the Whop cancellation UI.",
      icon: <ShieldAlert className="w-6 h-6 text-indigo-400" />,
    },
    {
      title: "Dynamic Incentive Engine",
      revealDate: "May 26",
      description:
        "Automatically offers a 1-month trial extension to high-value users who are drifting away.",
      icon: <Zap className="w-6 h-6 text-indigo-400" />,
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-green-100 selection:text-green-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100 px-6">
        <div className="max-w-7xl mx-auto h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-xl bg-zinc-50 group-hover:bg-zinc-100 transition-colors">
              <ArrowLeft size={18} className="text-zinc-900" />
            </div>
            <span className="text-sm font-bold text-zinc-900 tracking-tight">
              RevTray Dashboard
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-widest">
              <Clock size={12} /> Next Drop: 7 Days
            </div>
            <button
              onClick={showWaitlist}
              className="px-6 py-2.5 bg-zinc-900 text-white text-xs font-black uppercase tracking-tighter rounded-full hover:scale-105 transition-all"
            >
              Get Beta Invite
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-40 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          {/* Hero Section */}
          <div className="max-w-3xl mb-24">
            <motion.div
              {...fadeInUp}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest mb-6"
            >
              <Workflow className="w-3 h-3" />
              Workflow Automations
            </motion.div>
            <h1 className="text-6xl font-black text-zinc-900 tracking-tight leading-[0.9] mb-8">
              The Automation Suite <br />
              <span className="text-zinc-400 text-5xl">Built Solely for Whop.</span>
            </h1>
            <p className="text-xl text-zinc-500 font-medium leading-relaxed">
              Don&apos;t just send emails. Build a recurring revenue engine that reacts to every
              heartbeat of your Whop store.
            </p>
          </div>

          {/* Active Features Section */}
          <div className="mb-32">
            <div className="flex items-center gap-4 mb-12">
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight underline decoration-green-500 decoration-4 underline-offset-8">
                Currently Operational
              </h2>
              <div className="h-px bg-zinc-100 flex-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {activeFeatures.map((feature, i) => (
                <motion.div
                  key={i}
                  whileHover={{ scale: 1.02 }}
                  className="p-10 bg-zinc-50 rounded-[2.5rem] border border-zinc-100 group cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-8 shadow-sm border border-zinc-100 group-hover:bg-green-500 group-hover:text-white transition-colors">
                    {feature.icon}
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-xl font-bold text-zinc-900">{feature.title}</h3>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest rounded-md">
                      {feature.status}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 group-hover:text-zinc-900 transition-colors">
                    Explore Docs <ChevronRight size={14} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Locked / Pre-launch Section */}
          <div className="mb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div className="max-w-xl">
                <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-4 flex items-center gap-3">
                  The AI Reveal Roadshow
                  <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
                </h2>
                <p className="text-zinc-500 font-medium text-sm">
                  We are rolling out one core AI primitive every week. Join the beta now to get
                  early access to the alpha branches as they drop.
                </p>
              </div>
              <div className="flex items-center gap-4 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                <Search size={18} className="text-zinc-400" />
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Next Audit: Tuesday, 10:00 AM
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {upcomingFeatures.map((feature, i) => (
                <div key={i} className="relative group overflow-hidden">
                  <div className="absolute inset-0 bg-white/40 backdrop-blur-md z-10 opacity-100 transition-opacity" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20 p-8 text-center">
                    <div className="p-3 bg-zinc-900/5 rounded-2xl mb-4">
                      <Lock className="w-5 h-5 text-zinc-900" />
                    </div>
                    <div className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1 rounded-full uppercase tracking-widest mb-4">
                      Unlocks {feature.revealDate}
                    </div>
                    <h4 className="text-lg font-bold text-zinc-900 mb-2">{feature.title}</h4>
                  </div>

                  {/* Blurred Content */}
                  <div className="p-8 rounded-[2rem] border border-zinc-100 filter blur-xl select-none">
                    <div className="w-12 h-12 bg-zinc-200 rounded-xl mb-6" />
                    <div className="h-6 w-32 bg-zinc-200 rounded-md mb-4" />
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-zinc-100 rounded-md" />
                      <div className="h-4 w-2/3 bg-zinc-100 rounded-md" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Automation Lifecycle - Visualizing SEO Keyword "Whop Automation" */}
          <div className="bg-zinc-900 rounded-[3rem] p-12 lg:p-24 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-green-500/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/3" />

            <div className="relative z-10">
              <div className="max-w-2xl mb-16">
                <h2 className="text-4xl font-black text-white tracking-tight mb-6">
                  Zero Work. <br />
                  <span className="text-zinc-500">Infinite Scalability.</span>
                </h2>
                <p className="text-zinc-400 font-medium">
                  Standard auto-responders are dead. RevTray uses behavioral triggers to ensure your
                  Whop store is making money while you sleep.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                  <div className="text-green-500 mb-4 font-mono font-bold">01.</div>
                  <h4 className="text-white font-bold mb-2">Connect Whop API</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Secure, one-click authorization that pulls your entire store structure
                    instantly.
                  </p>
                </div>
                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                  <div className="text-green-500 mb-4 font-mono font-bold">02.</div>
                  <h4 className="text-white font-bold mb-2">Toggle Pulse Engine</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Turn on our pre-built recovery pulses that are already proven to save drift-away
                    users.
                  </p>
                </div>
                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
                  <div className="text-green-500 mb-4 font-mono font-bold">03.</div>
                  <h4 className="text-white font-bold mb-2">Review ROI Monthly</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Deep analysis of recovered revenue, churn rates, and campaign performance
                    dashboard.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-32 text-center">
            <h2 className="text-4xl font-black text-zinc-900 tracking-tight mb-8">
              Ready to automate your Whop growth?
            </h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <button
                onClick={showWaitlist}
                className="px-10 py-5 bg-green-500 text-zinc-900 font-black rounded-2xl hover:scale-105 transition-all shadow-xl shadow-green-200 uppercase tracking-tighter"
              >
                Join the Beta Waitlist
              </button>
              <Link
                href="/revenue-recovery"
                className="px-10 py-5 border border-zinc-200 text-zinc-900 font-bold rounded-2xl hover:bg-zinc-50 transition-all"
              >
                See Recovery Mechanics
              </Link>
            </div>
            <p className="mt-8 text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center justify-center gap-2">
              <MessageSquare size={14} className="text-indigo-500" />
              Featured in Whop Creator Weekly
            </p>
          </div>
        </div>
      </main>

      <SharedFooter />
    </div>
  );
}
