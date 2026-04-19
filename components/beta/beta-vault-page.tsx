'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Logo } from '@/components/ui/logo';
import { ArrowRight, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { validateBetaCode } from './actions';
import { WaitlistDialog } from './waitlist-dialog';

export function BetaVaultPage() {
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
      
      router.push(`/auth/login?invite=${encodeURIComponent(code.trim().toUpperCase())}`);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-300 font-body flex flex-col justify-between selection:bg-green-500/30 font-sans">
      <nav className="h-[80px] flex items-center justify-center border-b border-white/5">
        <div className="flex items-center gap-2 font-display text-xl font-extrabold text-white">
          <Logo size={28} /> RevTray
        </div>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[radial-gradient(ellipse_52%_44%_at_50%_50%,rgba(34,197,94,0.08)_0%,transparent_70%)] pointer-events-none"></div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold text-zinc-400 mb-6">
              <Lock size={14} className="text-green-500" /> Private Beta
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
              Unlock the Vault.
            </h1>
            <p className="text-zinc-500 text-sm leading-relaxed">
              RevTray is currently in private beta. Enter your invite code below to unlock registration and BYOK access.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Enter invite code..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isLoading}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-4 text-center text-lg font-mono font-bold text-white uppercase placeholder:text-zinc-700 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all disabled:opacity-50"
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
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:bg-zinc-800 disabled:text-zinc-500 text-black px-8 py-4 rounded-xl font-bold shadow-[0_4px_20px_rgba(34,197,94,0.2)] disabled:shadow-none hover:shadow-[0_6px_24px_rgba(34,197,94,0.3)] transition-all disabled:hover:-translate-y-0"
            >
              {isLoading ? 'Verifying...' : 'Unlock Registration'} <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-8 text-center">
             <button 
               onClick={() => setIsWaitlistOpen(true)}
               className="text-xs text-zinc-600 hover:text-zinc-400 border-b border-transparent hover:border-zinc-500 transition-all pb-0.5"
             >
               Need an invite? Join the waitlist
             </button>
          </div>
        </motion.div>
      </main>

      <WaitlistDialog isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />

      <footer className="h-[60px] flex items-center justify-center border-t border-white/5 text-xs text-zinc-600">
        &copy; {new Date().getFullYear()} RevTray Beta Built by Whop Creators
      </footer>
    </div>
  );
}
