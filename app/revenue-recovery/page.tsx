"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  Zap,
  Target,
  ShieldCheck,
  ArrowRight,
  MousePointer2,
  BellRing,
  RefreshCcw,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { SharedFooter } from "@/components/ui/shared-footer";
import { useBetaPopup } from "@/components/ui/beta-popup-context";

export default function RevenueRecovery() {
  const { show: showBetaPopup, showWaitlist } = useBetaPopup();
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  const steps = [
    {
      title: "Identify Churn Signals",
      description:
        "Our AI monitors Whop events for 'Ghosting' behavior—sudden drops in terminal logins or community engagement.",
      icon: <Target className="w-6 h-6" />,
    },
    {
      title: "Trigger the Recovery Pulse",
      description:
        "Instead of waiting for the cancellation, RevTray sends a tiered 'Health Check' email optimized for high-LTV users.",
      icon: <BellRing className="w-6 h-6" />,
    },
    {
      title: "AI-Negotiated Retention",
      description:
        "If the user attempts to cancel, our AI offers dynamic incentives (trial extensions or discounts) specific to their usage history.",
      icon: <RefreshCcw className="w-6 h-6" />,
    },
  ];

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-green-100 selection:text-green-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-xl bg-zinc-50 group-hover:bg-zinc-100 transition-colors">
              <ArrowLeft size={20} className="text-zinc-900" />
            </div>
            <span className="text-sm font-bold text-zinc-900">Back to RevTray</span>
          </Link>
          <button
            onClick={showWaitlist}
            className="px-5 py-2.5 bg-zinc-900 text-white text-sm font-bold rounded-full hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
          >
            Apply for Beta
          </button>
        </div>
      </nav>

      <main className="pt-40 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          {/* Hero Section */}
          <motion.div {...fadeInUp} className="max-w-3xl mb-24">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest mb-6">
              <Zap className="w-3 h-3 fill-current" />
              Core Engine
            </div>
            <h1 className="text-6xl font-black text-zinc-900 tracking-tight leading-[0.95] mb-8">
              Eliminate Silent <br />
              <span className="text-zinc-400">Cancellations Forever.</span>
            </h1>
            <p className="text-xl text-zinc-500 leading-relaxed font-medium">
              Recover up to 22% of churned revenue before it leaves your Whop ecosystem. Our AI
              doesn&apos;t just ask them to stay—it targets the psychology of why they left.
            </p>
          </motion.div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-32">
            <div className="lg:col-span-7">
              <div className="relative aspect-video rounded-[2.5rem] bg-zinc-900 overflow-hidden shadow-2xl group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent" />

                {/* Visual Representation of Recovery */}
                <div className="absolute inset-0 flex items-center justify-center p-12">
                  <div className="w-full space-y-4">
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-sm">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                          <MousePointer2 size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white/40 uppercase tracking-widest">
                            User Action
                          </div>
                          <div className="text-white font-bold italic">
                            Clicked &quot;Cancel Subscription&quot;
                          </div>
                        </div>
                      </div>
                      <div className="h-px bg-white/10 w-full" />
                      <div className="mt-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                          <Zap size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-green-400 uppercase tracking-widest">
                            RevTray Intervention
                          </div>
                          <div className="text-white font-bold">
                            Injected: &quot;7-Day Free Pass Extension&quot;
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <div className="px-6 py-3 rounded-full bg-green-500 text-zinc-900 text-sm font-black uppercase tracking-tighter">
                        Result: +$49.00 Saved Monthly
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-center space-y-12">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex gap-6 group"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-green-600 group-hover:text-white transition-all">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-zinc-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Email Example Section */}
          <div className="bg-zinc-50 rounded-[3rem] p-12 lg:p-24 border border-zinc-100">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <h2 className="text-4xl font-black text-zinc-900 tracking-tight mb-4">
                The &quot;Friendly-First&quot; AI Approach
              </h2>
              <p className="text-lg text-zinc-500 font-medium italic">
                &quot;Traditional recovery feels like spam. RevTray feels like a personal
                favor.&quot;
              </p>
            </div>

            <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-zinc-200 shadow-xl overflow-hidden">
              <div className="bg-zinc-900 p-4 flex items-center justify-between text-white/50 text-[10px] font-bold uppercase tracking-widest px-8">
                <div className="flex items-center gap-2">
                  <Mail size={12} />
                  Smart Win-Back Sequence #1
                </div>
                <div>RevTray Logic v2.4</div>
              </div>
              <div className="p-10 space-y-6">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    Subject
                  </div>
                  <div className="text-sm font-bold text-zinc-900">
                    Your Whop Store Access: A small surprise inside! 🎁
                  </div>
                </div>
                <div className="h-px bg-zinc-100" />
                <div className="text-zinc-600 space-y-4 leading-relaxed text-sm">
                  <p>Hey there,</p>
                  <p>
                    We noticed you haven&apos;t been around lately, and we&apos;d hate for you to
                    lose the momentum you&apos;ve built.
                  </p>
                  <p className="font-bold text-zinc-900">
                    Because your loyalty matters, we&apos;ve automatically credited your account
                    with an extra 4 days of access—zero cost.
                  </p>
                  <p>Need a hand getting back in? Just hit reply.</p>
                  <div className="pt-4">
                    <button className="px-6 py-3 bg-green-500 text-zinc-900 font-black rounded-xl text-xs uppercase tracking-tighter">
                      Claim My Bonus Days
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="mt-32 text-center pb-20">
            <motion.div {...fadeInUp} className="max-w-2xl mx-auto">
              <h2 className="text-5xl font-black text-zinc-900 tracking-tight mb-8">
                Ready to stop <br /> the bleeding?
              </h2>
              <button
                onClick={showWaitlist}
                className="inline-flex items-center gap-3 px-8 py-5 bg-zinc-900 text-white rounded-2xl font-black hover:scale-105 transition-all shadow-2xl shadow-zinc-300 group"
              >
                Apply for the Revenue Beta
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="mt-8 flex items-center justify-center gap-6 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-green-500" />
                  GDPR Compliant
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-green-500" />
                  Whop Certified
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <SharedFooter />
    </div>
  );
}
