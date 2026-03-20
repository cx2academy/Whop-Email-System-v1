'use client';

/**
 * app/auth/login/login-form.tsx
 * RevTray login form — Whop OAuth is the one action. Email login is progressive disclosure.
 */

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface LoginFormProps {
  callbackUrl?: string;
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const redirectTo = callbackUrl ?? '/dashboard';

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
      {/* Primary action: Whop OAuth */}
      <button
        onClick={handleWhopLogin}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        style={{ background: 'var(--brand)', boxShadow: '0 2px 8px rgba(34,197,94,0.25)' }}
      >
        <WhopIcon />
        {isLoading && !showEmail ? 'Connecting...' : 'Continue with Whop'}
      </button>

      {/* Progressive disclosure: email login */}
      {!showEmail ? (
        <p className="text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
          >
            Sign in with email instead
          </button>
        </p>
      ) : (
        <>
          <div className="relative flex items-center gap-3 my-4">
            <div className="h-px flex-1" style={{ background: 'var(--sidebar-border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>or</span>
            <div className="h-px flex-1" style={{ background: 'var(--sidebar-border)' }} />
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-3">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
                Email
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
                className="w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-all disabled:opacity-50"
                style={{
                  border: '1.5px solid var(--sidebar-border)',
                  background: 'var(--surface-card)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--sidebar-border)')}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
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
                className="w-full rounded-lg px-3.5 py-2.5 text-sm focus:outline-none transition-all disabled:opacity-50"
                style={{
                  border: '1.5px solid var(--sidebar-border)',
                  background: 'var(--surface-card)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--brand)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--sidebar-border)')}
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: '#DC2626' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl py-2.5 text-sm font-medium transition-all hover:bg-[#F3F4F6] disabled:opacity-50"
              style={{ border: '1.5px solid var(--sidebar-border)', color: 'var(--text-primary)' }}
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
