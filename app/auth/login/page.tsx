/**
 * app/auth/login/page.tsx
 * RevTray login — value-first headline, Whop OAuth dominant
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from './login-form';
import { Logo } from '@/components/ui/logo';

export const metadata: Metadata = { title: 'Sign in to RevTray' };

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { callbackUrl, error } = await searchParams;

  return (
    <main className="flex min-h-screen bg-[#090A0C] text-white overflow-hidden">
      {/* Left Side: Brand & Value Prop */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center p-12 border-r border-white/5">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-[#22C55E]/10 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-[#22C55E]/5 blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-xl">
          <Link href="/" className="flex items-center gap-3 mb-16">
            <Logo size={40} />
            <span className="text-2xl font-bold tracking-tight font-display">RevTray</span>
          </Link>

          <h1 className="text-6xl font-bold leading-[0.9] tracking-tighter font-display mb-8">
            STOP GUESSING.<br />
            <span className="text-[#22C55E]">START EARNING.</span>
          </h1>
          
          <p className="text-xl text-gray-400 font-medium leading-relaxed mb-12">
            The only email marketing engine built specifically for Whop creators. 
            Sync your audience and see the revenue in real-time.
          </p>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="text-2xl font-bold font-display text-white mb-1">98%</div>
              <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Delivery Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-display text-white mb-1">15m</div>
              <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Setup Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="lg:hidden absolute top-8 left-8">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={32} />
            <span className="text-lg font-bold tracking-tight font-display">RevTray</span>
          </Link>
        </div>

        <div className="w-full max-w-[400px]">
          <div className="bg-[#0D0F12] border border-white/5 rounded-3xl p-8 sm:p-10 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold font-display mb-2">Welcome back</h2>
              <p className="text-gray-500 text-sm">Connect your Whop account to access your dashboard.</p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error === 'OAuthAccountNotLinked'
                  ? 'An account with this email already exists. Sign in with email instead.'
                  : error === 'CredentialsSignin'
                  ? 'Incorrect email or password.'
                  : 'Something went wrong. Please try again.'}
              </div>
            )}

            <LoginForm callbackUrl={callbackUrl} />
          </div>

          {!process.env.NEXT_PUBLIC_BETA_MODE || process.env.NEXT_PUBLIC_BETA_MODE !== 'true' ? (
            <p className="mt-8 text-center text-sm text-gray-600">
              New to RevTray?{' '}
              <Link href="/auth/register" className="text-[#22C55E] font-semibold hover:underline">
                Create an account
              </Link>
            </p>
          ) : (
            <p className="mt-8 text-center text-sm text-gray-600">
              Private Beta access only.{' '}
              <Link href="/" className="text-zinc-400 font-medium hover:text-white transition-colors">
                Join waitlist
              </Link>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
