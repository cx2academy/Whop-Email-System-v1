"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Mail, ArrowLeft, LogOut } from "lucide-react";

export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#090A0C] px-4 font-sans selection:bg-[#22C55E]/30 selection:text-[#22C55E]">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <Logo size={48} />
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Verify your email
          </h1>
        </div>

        {/* Content Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] p-8 backdrop-blur-sm">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#22C55E]/10 blur-2xl" />
          
          <div className="relative z-10 space-y-6">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#22C55E]/10 text-[#22C55E]">
              <Mail className="h-10 w-10" />
            </div>

            <div className="space-y-3">
              <p className="text-base text-gray-300">
                You're almost there! We've sent a verification link to your email address.
              </p>
              <p className="text-sm text-gray-500">
                Please click the link in your inbox to confirm your account and access your dashboard.
              </p>
            </div>

            <div className="grid gap-4 pt-4">
              <Link
                href="/auth/login"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#22C55E] h-12 text-sm font-bold text-white transition-all hover:bg-[#1eb054] active:scale-[0.98] shadow-[0_0_20px_rgba(34,197,94,0.2)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Login
              </Link>
              
              <button
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 h-12 text-sm font-bold text-white transition-all hover:bg-white/10 active:scale-[0.98]"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <p className="text-xs text-gray-600 uppercase tracking-widest font-bold">
          Check your spam folder if you don't see the email.
        </p>
      </div>
    </div>
  );
}
