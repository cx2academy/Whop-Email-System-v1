'use client';

/**
 * app/auth/login/login-form.tsx
 * RevTray login form — Whop OAuth is the one action. Email login is progressive disclosure.
 */

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

interface LoginFormProps {
  callbackUrl?: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = callbackUrl ?? '/dashboard';
  const wasVerified = searchParams.get('verified') === 'true';

  const [isLoading, setIsLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleWhopLogin() {
    setIsLoading(true);
    await signIn('whop', { callbackUrl: redirectTo });
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError('Incorrect email or password.');
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {wasVerified && (
        <div className="mb-6 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 p-4 text-center">
          <p className="text-sm font-medium text-[#22C55E]">Email verified! You can now sign in.</p>
        </div>
      )}
      {/* Primary action: Whop OAuth */}
      <button
        onClick={handleWhopLogin}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-bold text-white transition-all hover:bg-[#16A34A] active:scale-[0.98] disabled:opacity-50"
        style={{ background: '#22C55E' }}
      >
        <WhopIcon />
        {isLoading && !showEmail ? 'Connecting...' : 'Continue with Whop'}
      </button>

      {/* Progressive disclosure: email login */}
      {!showEmail ? (
        <p className="text-center text-sm pt-2">
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            Sign in with email instead
          </button>
        </p>
      ) : (
        <>
          <div className="relative flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-white/5" />
            <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold">or</span>
            <div className="h-px flex-1 bg-white/5" />
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="you@example.com"
                className="w-full rounded-xl px-4 py-3 text-sm bg-white/5 border border-white/10 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#22C55E]/50 transition-all disabled:opacity-50"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 text-sm bg-white/5 border border-white/10 text-white placeholder:text-gray-700 focus:outline-none focus:border-[#22C55E]/50 transition-all disabled:opacity-50"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl py-3 text-sm font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function WhopIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-5h2v2h-2zm0-8h2v6h-2z" />
    </svg>
  );
}
