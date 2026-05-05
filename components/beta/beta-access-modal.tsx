'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/ui/logo';
import { ArrowRight, Lock, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { validateBetaCode } from './actions';
import { WaitlistDialog } from './waitlist-dialog';

interface BetaAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BetaAccessModal({ isOpen, onClose }: BetaAccessModalProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!code.trim()) {
        setError('Please enter an invite code.');
        setIsLoading(false);
        return;
      }
      
      await validateBetaCode(code.trim().toUpperCase());
      
      router.push(`/auth/register?invite=${encodeURIComponent(code.trim().toUpperCase())}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.1)] overflow-hidden"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[300px] bg-[radial-gradient(ellipse,rgba(34,197,94,0.05)_0%,transparent:70%)] pointer-events-none"></div>

              <button 
                onClick={onClose}
                className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-10 relative">
                <div className="inline-flex items-center gap-2 bg-zinc-50 border border-zinc-100 px-3 py-1.5 rounded-full text-xs font-bold text-zinc-500 mb-6">
                  <Lock size={14} className="text-green-600" /> Private Beta
                </div>
                <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight mb-4">
                  Unlock Access.
                </h2>
                <p className="text-zinc-500 text-sm leading-relaxed px-4">
                  Enter your invite code to unlock registration. No code? Join the waitlist for the next wave.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 relative">
                <div>
                  <input
                    type="text"
                    placeholder="Enter invite code..."
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl px-4 py-5 text-center text-xl font-mono font-bold text-zinc-900 uppercase placeholder:text-zinc-300 focus:outline-none focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5 transition-all disabled:opacity-50"
                  />
                </div>
                
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-red-500 text-xs font-semibold">
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !code}
                  className="w-full flex items-center justify-center gap-2 bg-[#D9F99D] hover:bg-[#bef264] disabled:bg-zinc-100 disabled:text-zinc-400 text-zinc-900 px-8 py-5 rounded-2xl font-bold transition-all disabled:hover:-translate-y-0"
                >
                  {isLoading ? 'Verifying...' : 'Unlock Registration'} <ArrowRight size={18} />
                </button>
              </form>

              <div className="mt-10 text-center space-y-4 relative">
                 <button 
                   onClick={() => {
                     setIsWaitlistOpen(true);
                   }}
                   className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-all block w-fit mx-auto"
                 >
                   Need an invite? Join the waitlist
                 </button>
                 <button 
                   onClick={() => router.push('/auth/login')}
                   className="text-[11px] font-medium text-zinc-400 hover:text-zinc-600 transition-colors block w-fit mx-auto"
                 >
                   Already a tester? Sign in
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <WaitlistDialog isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />
    </>
  );
}
