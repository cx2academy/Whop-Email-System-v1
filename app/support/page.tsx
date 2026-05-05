'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare, BookOpen, HelpCircle } from 'lucide-react';
import { SharedFooter } from '@/components/ui/shared-footer';
import { useBetaPopup } from '@/components/ui/beta-popup-context';

export default function SupportPage() {
  const { show: showBetaPopup, showWaitlist } = useBetaPopup();
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
            <span className="text-sm font-bold text-slate-900 tracking-tight">Main HQ</span>
          </Link>
          <div className="flex items-center gap-6">
            <button 
              onClick={showWaitlist}
              className="px-6 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-tighter rounded-full hover:scale-105 transition-all shadow-xl shadow-slate-200 cursor-pointer font-bold"
            >
              Get Beta Access
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-40 pb-32">
        <div className="max-w-4xl mx-auto px-6">
          <motion.div
            {...fadeInUp}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest mb-6">
               <HelpCircle className="w-3 h-3" />
               Help Center
            </div>
            <h1 className="text-6xl font-black text-slate-900 tracking-tighter mb-6 leading-[0.9]">
               Need a Hand? <br />
               <span className="text-slate-400">We've Got You.</span>
            </h1>
            <p className="text-xl text-slate-500 font-semibold max-w-2xl mx-auto">
              Whether you&apos;re stuck on a setup step or have questions about attribution, our team is here to help you succeed.
            </p>
          </motion.div>
 
          <div className="grid md:grid-cols-2 gap-8 mb-20">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-sm group hover:border-green-500 transition-colors"
            >
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 mb-8 border border-slate-100 group-hover:bg-green-500 group-hover:text-white transition-colors">
                <Mail size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Email Support</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                Send us an email and we&apos;ll get back to you within 24 hours. Perfect for technical questions.
              </p>
              <a href="mailto:support@revtray.com" className="text-slate-900 font-black text-xs uppercase tracking-widest hover:underline">
                support@revtray.com
              </a>
            </motion.div>
 
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-sm group hover:border-indigo-500 transition-colors"
            >
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 mb-8 border border-slate-100 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Community Discord</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                Join our Discord to chat with other Whop creators and get quick help from our core team.
              </p>
              <button 
                onClick={showBetaPopup}
                className="text-slate-900 font-black text-xs uppercase tracking-widest hover:underline cursor-pointer"
              >
                Join our Discord &rarr;
              </button>
            </motion.div>
 
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-sm group hover:border-purple-500 transition-colors"
            >
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 mb-8 border border-slate-100 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                <BookOpen size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Documentation</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                Browse our guides on Whop integration, domain verification, and setting up your first automation.
              </p>
              <button 
                onClick={showBetaPopup}
                className="text-slate-900 font-black text-xs uppercase tracking-widest hover:underline cursor-pointer"
              >
                Read the docs &rarr;
              </button>
            </motion.div>
 
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-sm group hover:border-amber-500 transition-colors"
            >
              <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 mb-8 border border-slate-100 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                <HelpCircle size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">FAQs</h3>
              <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                Quick answers to the most common questions about billing, attribution, and email limits.
              </p>
              <a href="/pricing#faq" className="text-slate-900 font-black text-xs uppercase tracking-widest hover:underline">
                View FAQs &rarr;
              </a>
            </motion.div>
          </div>
 
          <div className="p-12 bg-slate-900 rounded-[3rem] text-center text-white relative overflow-hidden">
            <div className="relative z-10">
              <h4 className="text-2xl font-black mb-4">Need a custom integration?</h4>
              <p className="text-slate-400 font-medium mb-10 max-w-xl mx-auto">
                If you&apos;re a high-volume creator and need help migrating from another platform, let&apos;s talk.
              </p>
              <a href="mailto:sales@revtray.com" className="inline-flex items-center justify-center bg-green-500 hover:bg-green-400 text-slate-900 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-tighter transition-all shadow-xl shadow-green-500/20">
                Contact Sales Team
              </a>
            </div>
          </div>
        </div>
      </main>

      <SharedFooter />
    </div>
  );
}

