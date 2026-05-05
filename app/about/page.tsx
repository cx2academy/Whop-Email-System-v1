"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Heart, MapPin, Users, TrendingUp, Coffee, Rocket } from "lucide-react";
import Link from "next/link";
import { SharedFooter } from "@/components/ui/shared-footer";

export default function AboutPage() {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
  };

  const milestones = [
    {
      label: "The Solo Build",
      text: "Started as a custom script to solve one creator's churn problem.",
      icon: <Users className="w-5 h-5 text-green-500" />,
    },
    {
      label: "The Texas Lab",
      text: "Headquartered in Texas, where we're building the future of creator stability.",
      icon: <MapPin className="w-5 h-5 text-green-500" />,
    },
    {
      label: "The Mission",
      text: "Turning viral 'peaks' into permanent, recurring business foundations.",
      icon: <TrendingUp className="w-5 h-5 text-green-500" />,
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
            <span className="text-sm font-bold text-slate-900 tracking-tight">Return to Store</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="px-4 py-1.5 bg-green-500/10 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-green-500/20">
              Built in Texas
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-40 pb-32">
        <div className="max-w-4xl mx-auto px-6">
          {/* Story Header */}
          <motion.div {...fadeInUp} className="mb-20 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest mb-6">
              <Heart className="w-3 h-3 fill-red-500 text-red-500" />
              Creator-Native
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter mb-8 leading-[0.9]">
              The Story <br />
              <span className="text-slate-400">Behind the Tray.</span>
            </h1>
          </motion.div>

          {/* The Narrative */}
          <div className="space-y-12 mb-32">
            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="relative pl-12 border-l-2 border-slate-200"
            >
              <div className="absolute -left-[9px] top-0 w-4 h-4 bg-green-500 rounded-full border-4 border-slate-50" />
              <h2 className="text-2xl font-black text-slate-900 mb-6">Locked in the Viral Cycle</h2>
              <div className="prose prose-slate max-w-none text-slate-600 space-y-6 leading-relaxed">
                <p>
                  As Whop creators, we knew the feeling. You drop a YouTube video or a TikTok, it
                  goes viral, and your MRR peaks. For a few days, you&apos;re on top of the world.
                </p>
                <p>
                  But then, the quiet starts. Slowly, the traction fades, the churn rate climbs, and
                  your revenue begins to bleed out until the next viral hit. It wasn&apos;t a
                  business—it was a rollercoaster.
                </p>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="relative pl-12 border-l-2 border-slate-200"
            >
              <div className="absolute -left-[9px] top-0 w-4 h-4 bg-green-500 rounded-full border-4 border-slate-50" />
              <h2 className="text-2xl font-black text-slate-900 mb-6">
                The &quot;Relationship&quot; Problem
              </h2>
              <div className="prose prose-slate max-w-none text-slate-600 space-y-6 leading-relaxed">
                <p>
                  We had thousands of users in our free funnels, but zero ways to actually nurture
                  them. We couldn&apos;t build trust at scale. We couldn&apos;t upsell them
                  effectively. They were just numbers on a dashboard, not people getting informed
                  about our new value.
                </p>
                <p>
                  Whether it was organic or paid ads, the cycle was the same: temporary traction,
                  followed by a slow death of the MRR. We needed stability. We needed a way to serve
                  our users—and our revenue—differently.
                </p>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="relative pl-12 border-l-2 border-slate-200"
            >
              <div className="absolute -left-[9px] top-0 w-4 h-4 bg-green-500 rounded-full border-4 border-slate-50" />
              <h2 className="text-2xl font-black text-slate-900 mb-6">Serving Revenue on a Tray</h2>
              <div className="prose prose-slate max-w-none text-slate-600 space-y-6 leading-relaxed">
                <p>
                  RevTray was born from necessity. <strong>Rev</strong> for Revenue,{" "}
                  <strong>Tray</strong> for the literal tray you use to serve something valuable.
                </p>
                <p>
                  It started as a solo project to stabilize one store, but it quickly grew. We
                  realized that all creators deserve their revenue served on a &quot;silver
                  tray&quot;—stability and LTV that doesn&apos;t require you to be a 24/7 retention
                  manager.
                </p>
              </div>
            </motion.section>
          </div>

          {/* Mission Card */}
          <div className="bg-slate-900 rounded-[3rem] p-12 text-white mb-32 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-12 opacity-10">
              <Rocket size={200} />
            </div>
            <div className="relative z-10">
              <h3 className="text-3xl font-black mb-6">Our Mission</h3>
              <p className="text-xl text-slate-400 font-medium leading-relaxed mb-12 max-w-2xl">
                To help creators turn side-hustles into permanent, scalable businesses by providing
                the stability and &quot;Higher LTV&quot; they lack.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {milestones.map((m, i) => (
                  <div key={i}>
                    <div className="p-3 bg-white/5 rounded-2xl w-fit mb-4">{m.icon}</div>
                    <div className="font-bold text-white mb-2">{m.label}</div>
                    <div className="text-xs text-slate-500 leading-relaxed">{m.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Founder Section */}
          <div className="text-center">
            <motion.div {...fadeInUp} className="max-w-2xl mx-auto">
              <div className="w-24 h-24 bg-slate-200 rounded-full mx-auto mb-8 overflow-hidden grayscale">
                <Coffee className="w-full h-full p-6 text-slate-400" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">
                Built by Creators, for Creators.
              </h3>
              <p className="text-slate-500 font-medium mb-8 italic">
                &quot;We don&apos;t just build the tools. Our businesses depend on them.&quot;
              </p>
              <Link
                href="/#apply"
                className="inline-flex items-center gap-3 px-10 py-5 bg-green-500 text-slate-900 font-black rounded-2xl hover:scale-105 transition-all shadow-xl shadow-green-200 uppercase tracking-tighter"
              >
                Join the Inner Circle
              </Link>
            </motion.div>
          </div>
        </div>
      </main>

      <SharedFooter />
    </div>
  );
}
