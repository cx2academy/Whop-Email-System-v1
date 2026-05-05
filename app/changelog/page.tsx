'use client';

import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Settings, 
  Zap, 
  Sparkles, 
  ShieldCheck, 
  Clock,
  ChevronRight
} from "lucide-react";
import { SharedFooter } from "@/components/ui/shared-footer";
import Link from "next/link";
import { useBetaPopup } from "@/components/ui/beta-popup-context";

export default function ChangelogPage() {
  const { show: showBetaPopup, showWaitlist } = useBetaPopup();
  const updates = [
    {
      date: "May 04, 2026",
      version: "v2.4.1",
      title: "Predictive Churn Engine v2",
      description: "Our core AI model now identifies 'Ghosting' signals 15% earlier than previous iterations.",
      type: "Improvement",
      details: [
        "Updated Whop Webhook handlers for lower latency",
        "Improved classification of 'Trial Extension' versus 'Discount Hunt' intents",
        "New revenue recovery dashboard widgets"
      ]
    },
    {
      date: "April 28, 2026",
      version: "v2.3.0",
      title: "Whop Deep-API Integration",
      description: "Complete overhaul of how we connect to Whop. No more Zapier needed.",
      type: "Feature",
      details: [
        "Native Whop store authorization",
        "Direct member status synchronization",
        "Automated discount code generation via Whop API"
      ]
    },
    {
      date: "April 21, 2026",
      version: "v2.2.5",
      title: "Texas HQ Migration",
      description: "We've officially moved our engineering base to Austin, Texas.",
      type: "Internal",
      details: [
        "Updated legal terms to reflect Texas jurisdiction",
        "Expanded support team for faster response times",
        "Local server nodes for reduced latency in North America"
      ]
    }
  ];

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-green-100 selection:text-green-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-xl bg-slate-50 group-hover:bg-slate-100 transition-colors border border-slate-200">
              <ArrowLeft size={18} className="text-slate-900" />
            </div>
            <span className="text-sm font-bold text-slate-900 tracking-tight">RevTray HQ</span>
          </Link>
          <div className="flex items-center gap-6">
            <button 
              onClick={showWaitlist}
              className="px-6 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-tighter rounded-full hover:scale-105 transition-all shadow-xl shadow-slate-200 cursor-pointer"
            >
              Reserve Beta Spot
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-40 pb-32">
        <div className="max-w-4xl mx-auto px-6">
          {/* Header */}
          <div className="mb-20">
            <motion.div {...fadeInUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-widest mb-6">
              <Clock className="w-3 h-3" />
              Live Updates
            </motion.div>
            <h1 className="text-6xl font-black text-slate-900 tracking-tighter mb-6 leading-[0.9]">
              Shipping <br /> 
              <span className="text-slate-400">Publicly.</span>
            </h1>
            <p className="text-xl text-slate-500 font-semibold max-w-2xl">
              We move fast to ensure Whop creators stay ahead of the curve. Here&apos;s what&apos;s new in the RevTray engine.
            </p>
          </div>

          {/* Timeline */}
          <div className="space-y-24">
            {updates.map((update, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="relative pl-12 border-l border-slate-200"
              >
                <div className="absolute -left-1 w-2 h-2 bg-indigo-500 rounded-full" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-indigo-500 uppercase tracking-widest">{update.date}</span>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[9px] font-black rounded uppercase tracking-widest">{update.version}</span>
                  </div>
                  <div className={`w-fit px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${
                    update.type === 'Feature' ? 'bg-green-50 text-green-700 border border-green-100' :
                    update.type === 'Internal' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                    'bg-blue-50 text-blue-700 border border-blue-100'
                  }`}>
                    {update.type === 'Feature' ? <Sparkles size={12} /> : 
                     update.type === 'Internal' ? <Settings size={12} /> : 
                     <Zap size={12} />}
                    {update.type}
                  </div>
                </div>

                <div className="p-10 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{update.title}</h3>
                  <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                    {update.description}
                  </p>
                  
                  <div className="space-y-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Key Changes</div>
                    <ul className="space-y-3">
                      {update.details.map((detail, j) => (
                        <li key={j} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                          <ChevronRight size={16} className="text-indigo-400" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Final Social Proof */}
          <div className="mt-32 text-center">
            <div className="py-12 px-8 bg-slate-900 rounded-[3rem] text-white">
              <h3 className="text-2xl font-black mb-4">Want the full transparency?</h3>
              <p className="text-slate-400 font-medium mb-8">Join 400+ creators getting our weekly dev log.</p>
              <button 
                onClick={showWaitlist}
                className="inline-flex items-center gap-3 px-8 py-4 bg-white text-slate-900 font-black rounded-2xl hover:scale-105 transition-all uppercase tracking-tighter cursor-pointer"
              >
                Join the Waitlist
              </button>
            </div>
            <div className="mt-12 flex items-center justify-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <ShieldCheck size={18} className="text-green-500" />
              Verifiable Ship Rate
            </div>
          </div>
        </div>
      </main>

      <SharedFooter />
    </div>
  );
}
