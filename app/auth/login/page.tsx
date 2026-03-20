/**
 * app/auth/login/page.tsx
 * RevTray login — value-first headline, Whop OAuth dominant
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in to RevTray' };

interface LoginPageProps {
  searchParams: { callbackUrl?: string; error?: string };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <main
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ background: 'var(--surface-app)' }}
    >
      <div className="w-full max-w-[380px]">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: 'var(--brand)' }}
            >
              <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
                <path d="M72 18 A38 38 0 1 0 88 58 Q94 72 82 82 Q68 92 50 88" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round"/>
                <path d="M85 15 L32 46 L44 58 L52 80 L63 62 Z" fill="white"/>
              </svg>
            </div>
            <span
              className="text-xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
            >
              RevTray
            </span>
          </Link>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-card-md"
          style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
        >
          {/* Headline */}
          <div className="mb-8">
            <h1
              className="text-2xl font-bold mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              See what your emails earn.
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Connect your Whop account to get started.
            </p>
          </div>

          {/* Error */}
          {searchParams.error && (
            <div
              className="mb-5 rounded-lg px-4 py-3 text-sm"
              style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#DC2626' }}
            >
              {searchParams.error === 'OAuthAccountNotLinked'
                ? 'An account with this email already exists. Sign in with email instead.'
                : searchParams.error === 'CredentialsSignin'
                ? 'Incorrect email or password.'
                : 'Something went wrong. Please try again.'}
            </div>
          )}

          <LoginForm callbackUrl={searchParams.callbackUrl} />
        </div>

        {/* Register */}
        <p className="mt-5 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/register"
            className="font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--brand)' }}
          >
            Create one free
          </Link>
        </p>
      </div>
    </main>
  );
}
