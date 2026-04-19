'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { joinWaitlist } from './actions';
import toast from 'react-hot-toast';

export function WaitlistDialog({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: '',
    acceptedPledge: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.acceptedPledge) {
      toast.error('Please accept the Beta Pledge to continue.');
      return;
    }

    setIsSubmitting(true);
    try {
      await joinWaitlist(formData);
      setIsSuccess(true);
      toast.success('You have been added to the waitlist!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to join waitlist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-400" />
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            {isSuccess ? (
              <div className="p-12 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                    <Check size={40} />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Application Received</h2>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    We&apos;ve added you to the private queue. Our team is manually reviewing every application to ensure high-signal testing. Watch your inbox!
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-colors"
                >
                  Got it
                </button>
              </div>
            ) : (
              <div className="p-8 md:p-10">
                <div className="mb-8">
                  <div className="inline-flex items-center gap-2 bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
                    <Sparkles size={12} /> Priority Access
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Apply for the Beta Vault.</h2>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    We are hand-picking our first 100 testers. Tell us why you want early access to RevTray.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Name</label>
                      <input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="John Doe"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500/50 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Email</label>
                      <input
                        required
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@example.com"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 ml-1">Why do you want Beta Access?</label>
                    <textarea
                      required
                      rows={3}
                      value={formData.reason}
                      onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="I run a Whop community and want to track attribution..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-green-500/50 transition-all resize-none"
                    />
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/5 select-none cursor-pointer group" onClick={() => setFormData(p => ({ ...p, acceptedPledge: !p.acceptedPledge }))}>
                    <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center transition-all ${formData.acceptedPledge ? 'bg-green-500 border-green-500' : 'border-zinc-700 bg-transparent'}`}>
                       {formData.acceptedPledge && <Check size={10} className="text-black" />}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-zinc-300 group-hover:text-white transition-colors">The Beta Pledge</div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed">
                        I commit to providing genuine feedback, reporting bugs, and helping harden the RevTray system for the public launch.
                      </p>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Submit Application'}
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
