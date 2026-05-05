"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, TrendingUp, ShieldCheck, Gem, Calculator } from "lucide-react";
import Link from "next/link";
import { SharedFooter } from "@/components/ui/shared-footer";

export default function PricingPage() {
  const [revenue, setRevenue] = useState(5000);
  const churnRate = 0.12; // 12% avg churn
  const recoveryRate = 0.22; // 22% RevTray recovery

  const estimatedSavings = Math.round(revenue * churnRate * recoveryRate);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  const faqs = [
    {
      q: "Is it really free during Beta?",
      a: "Yes. All early adopters get full access to the AI engine for $0. Our goal is to gather as much 'Recovery Data' as possible to refine the model.",
    },
    {
      q: "How does the Performance Fee work?",
      a: "Post-beta, we will move to a 1.5% fee on successfully recovered revenue. If we don't save a customer from churning, you don't pay anything.",
    },
    {
      q: "Can I cancel anytime?",
      a: "RevTray is non-custodial. You can disconnect your Whop store with one click at any time. No locked-in contracts.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-green-100 selection:text-green-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-slate-100 transition-colors border border-slate-200">
              <ArrowLeft size={18} className="text-slate-900" />
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">Main HQ</span>
          </Link>
          <div className="flex items-center gap-6">
            <span className="hidden md:block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Status: Public Beta
            </span>
            <Link
              href="/#apply"
              className="px-6 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-tighter rounded-full hover:scale-105 transition-all shadow-xl shadow-slate-200"
            >
              Claim Beta Access
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-40 pb-32">
        <div className="max-w-5xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-24">
            <motion.div
              {...fadeInUp}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 border border-green-100 text-green-700 text-[10px] font-bold uppercase tracking-widest mb-6"
            >
              <TrendingUp className="w-3 h-3" />
              Transparency Report
            </motion.div>
            <h1 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter mb-8 leading-[0.9]">
              Zero Fee. <br />
              <span className="text-slate-400">Zero Risk.</span>
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-semibold">
              RevTray is free during our private beta. Once we move to production, you only pay if
              we generate profit for you.
            </p>
          </div>

          {/* Pricing Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-32 items-center">
            {/* Beta Plan */}
            <motion.div
              whileHover={{ y: -8 }}
              className="relative p-10 bg-white rounded-[3rem] border-4 border-green-500 shadow-2xl shadow-green-100"
            >
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-green-500 text-white text-xs font-black rounded-full uppercase tracking-widest">
                Active Now
              </div>
              <div className="mb-8">
                <h3 className="text-2xl font-black text-slate-900 mb-2">Early Beta</h3>
                <p className="text-slate-500 text-sm font-medium">For high-growth Whop creators.</p>
              </div>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-6xl font-black text-slate-900 tracking-tighter">$0</span>
                <span className="text-slate-400 font-bold">/lifetime</span>
              </div>
              <ul className="space-y-4 mb-10">
                {[
                  "Full AI Engine Access",
                  "Unlimited Whop Connections",
                  "Priority Engineering Support",
                  "Real-time Revenue Telemetry",
                  "Early Access to 'Ghost' Detection",
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <Check size={18} className="text-green-500" strokeWidth={3} />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link
                href="/#apply"
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-center block hover:bg-slate-800 transition-colors group"
              >
                Reserve My Spot
              </Link>
            </motion.div>

            {/* ROI Calculator */}
            <div className="p-10 bg-slate-900 rounded-[3rem] text-white">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <Calculator className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold tracking-tight">Projected Savings</h3>
              </div>

              <div className="space-y-12">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Monthly Whop Revenue
                    <span className="text-white">${revenue}</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="100000"
                    step="500"
                    value={revenue}
                    onChange={(e) => setRevenue(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-green-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6">
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                      Estimated Churn
                    </div>
                    <div className="text-2xl font-bold text-red-400">12%</div>
                  </div>
                  <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20">
                    <div className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-2">
                      Saved Revenue
                    </div>
                    <div className="text-2xl font-bold font-mono text-green-400">
                      +${estimatedSavings}/mo
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic leading-relaxed text-center">
                  *Based on average 22% recovery rate across our internal Whop datasets.
                </p>
              </div>
            </div>
          </div>

          {/* Comparison table */}
          <div className="mb-32">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Why RevTray Wins
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Metric
                    </th>
                    <th className="py-6 text-xs font-bold text-slate-900 uppercase tracking-widest">
                      RevTray (Target)
                    </th>
                    <th className="py-6 text-xs font-bold text-slate-400 uppercase tracking-widest">
                      General ESPs
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  <tr>
                    <td className="py-8 text-slate-500">Pricing Model</td>
                    <td className="py-8 text-slate-900 font-bold">1.5% Performance Fee</td>
                    <td className="py-8 text-slate-500">$200 - $1,500/mo Fixed</td>
                  </tr>
                  <tr>
                    <td className="py-8 text-slate-500">Whop Integration</td>
                    <td className="py-8 text-slate-900 font-bold font-mono">Deep-API Native</td>
                    <td className="py-8 text-slate-500 w-48 leading-tight">
                      Requires Zapier/Custom Webhooks
                    </td>
                  </tr>
                  <tr>
                    <td className="py-8 text-slate-500">Churn Detection</td>
                    <td className="py-8 text-slate-900 font-bold">Predictive AI Pulse</td>
                    <td className="py-8 text-slate-500">Reactive (Post-Cancel)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto mb-32">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Question Center</h2>
            </div>
            <div className="space-y-6">
              {faqs.map((faq, i) => (
                <div key={i} className="p-8 bg-white rounded-3xl border border-slate-200">
                  <h4 className="text-base font-bold text-slate-900 mb-3">{faq.q}</h4>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final Social Proof Footer */}
          <div className="text-center">
            <div className="inline-flex items-center gap-8 px-8 py-4 bg-white border border-slate-200 rounded-full shadow-lg">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-green-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Payment Secured
                </span>
              </div>
              <div className="w-px h-6 bg-slate-100" />
              <div className="flex items-center gap-2">
                <Gem size={18} className="text-green-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Exclusive Beta Access
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <SharedFooter />
    </div>
  );
}
