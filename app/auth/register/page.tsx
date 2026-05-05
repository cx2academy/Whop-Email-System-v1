/**
 * app/auth/register/page.tsx
 *
 * Registration page — creates a new user + workspace in one flow.
 */

import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { RegisterForm } from "./register-form";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Create Account",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const params = await searchParams;
  const isBeta = process.env.NEXT_PUBLIC_BETA_MODE === 'true';
  const inviteCode = params.invite;

  if (isBeta) {
    if (!inviteCode) {
      redirect('/');
    }

    const invite = await db.inviteCode.findUnique({
      where: { code: inviteCode.trim().toUpperCase() }
    });

    if (!invite || (invite.maxUses > 0 && invite.currentUses >= invite.maxUses)) {
      redirect('/');
    }
  }

  return (
    <main className="flex min-h-screen bg-[#090A0C] text-white overflow-hidden">
      {/* Left Side: Brand & Value Prop (Mirroring Login) */}
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

      {/* Right Side: Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        <div className="lg:hidden absolute top-8 left-8">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={32} />
            <span className="text-lg font-bold tracking-tight font-display">RevTray</span>
          </Link>
        </div>

        <div className="w-full max-w-[480px] py-12">
          <div className="bg-[#0D0F12] border border-white/5 rounded-3xl p-8 sm:p-10 shadow-2xl">
            <div className="mb-8">
              <h1 className="text-2xl font-bold font-display text-white mb-2">Create your account</h1>
              <p className="text-gray-500 text-sm">Start sending campaigns to your Whop community</p>
            </div>

            <Suspense fallback={<div className="h-64 flex items-center justify-center text-sm text-gray-500 animate-pulse">Loading form...</div>}>
              <RegisterForm />
            </Suspense>
          </div>

          <p className="mt-8 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-[#22C55E] font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
