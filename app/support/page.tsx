'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeft, Mail, MessageSquare, BookOpen, HelpCircle } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-300 py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white mb-12 transition-colors">
          <ArrowLeft size={16} /> Back to home
        </Link>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">How can we help?</h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Whether you're stuck on a setup step or have questions about attribution, our team is here to help you succeed.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-zinc-900/40 border border-white/10 p-8 rounded-2xl hover:bg-zinc-900 transition-colors"
          >
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center text-green-500 mb-6">
              <Mail size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Email Support</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              Send us an email and we'll get back to you within 24 hours. Perfect for technical questions or account issues.
            </p>
            <a href="mailto:support@revtray.com" className="text-green-500 font-semibold hover:underline">
              support@revtray.com
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-zinc-900/40 border border-white/10 p-8 rounded-2xl hover:bg-zinc-900 transition-colors"
          >
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-6">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Community Discord</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              Join our Discord to chat with other Whop creators and get quick help from our team and the community.
            </p>
            <a href="#" className="text-blue-400 font-semibold hover:underline">
              Join our Discord &rarr;
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-zinc-900/40 border border-white/10 p-8 rounded-2xl hover:bg-zinc-900 transition-colors"
          >
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 mb-6">
              <BookOpen size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Documentation</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              Browse our guides on Whop integration, domain verification, and setting up your first automation.
            </p>
            <a href="#" className="text-purple-400 font-semibold hover:underline">
              Read the docs &rarr;
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-zinc-900/40 border border-white/10 p-8 rounded-2xl hover:bg-zinc-900 transition-colors"
          >
            <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500 mb-6">
              <HelpCircle size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">FAQs</h3>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              Quick answers to the most common questions about billing, attribution, and email limits.
            </p>
            <a href="#" className="text-yellow-400 font-semibold hover:underline">
              View FAQs &rarr;
            </a>
          </motion.div>
        </div>

        <div className="mt-20 p-8 bg-green-500/5 border border-green-500/20 rounded-2xl text-center">
          <h4 className="text-lg font-bold text-white mb-2">Need a custom integration?</h4>
          <p className="text-zinc-400 text-sm mb-6">
            If you're a high-volume creator and need help migrating from another platform, let's talk.
          </p>
          <a href="mailto:sales@revtray.com" className="inline-flex items-center justify-center bg-green-500 hover:bg-green-400 text-black px-6 py-3 rounded-xl text-sm font-bold transition-all">
            Contact Sales
          </a>
        </div>
      </div>
    </div>
  );
}
