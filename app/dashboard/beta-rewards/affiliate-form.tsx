'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Copy, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function WhopAffiliateForm() {
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [affiliateLink, setAffiliateLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    setIsSubmitting(true);
    // Simulate Whop API connection to set up affiliate
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setAffiliateLink(`https://whop.com/checkout/plan_xxx?a=${username.trim()}`);
      toast.success('Affiliate link generated!');
    } catch {
      toast.error('Failed to generate link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (affiliateLink) {
      navigator.clipboard.writeText(affiliateLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied to clipboard');
    }
  };

  if (affiliateLink) {
    return (
      <div className="space-y-4">
        <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Your Tracking Link</label>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={affiliateLink}
            className="flex-1 w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-mono text-zinc-300 focus:outline-none"
          />
          <button 
            onClick={handleCopy}
            className="p-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl flex items-center justify-center shrink-0"
          >
            {copied ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} className="text-zinc-400" />}
          </button>
        </div>
        <p className="text-[10px] text-zinc-500 text-center">
          Share this link to earn 40% recurring on all referrals.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleGenerate} className="space-y-4">
       <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Connect Whop Username</label>
       <div className="flex gap-2">
         <div className="relative flex-1">
           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm font-bold">@</span>
           <input
             type="text"
             value={username}
             onChange={(e) => setUsername(e.target.value)}
             placeholder="your-whop-name"
             className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-8 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
             required
           />
         </div>
         <button
            type="submit"
            disabled={isSubmitting || !username}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center shrink-0 w-[120px]"
         >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Generate'}
         </button>
       </div>
    </form>
  );
}
