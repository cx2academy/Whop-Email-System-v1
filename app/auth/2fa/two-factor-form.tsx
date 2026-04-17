"use client";

import { useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { verifyLogin2fa } from "@/lib/user/2fa-actions";

export function TwoFactorForm() {
  return (
    <SessionProvider>
      <TwoFactorFormInner />
    </SessionProvider>
  );
}

function TwoFactorFormInner() {
  const [isLoading, setIsLoading] = useState(false);
  const { update } = useSession();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await verifyLogin2fa(formData);
      if (res.success) {
        toast.success("Identity verified");
        // Update the session to set twoFactorVerified = true
        await update({ twoFactorVerified: true });
        router.push("/dashboard");
      } else {
        toast.error(res.error || "Invalid verification code");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E]">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-white">Two-Factor Authentication</h1>
        <p className="text-sm text-gray-500">
          Your account is protected with 2FA. Please enter the code from your authenticator app.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
            Verification Code
          </label>
          <input
            name="token"
            type="text"
            required
            autoFocus
            maxLength={6}
            pattern="\d*"
            className="w-full text-center text-3xl font-mono tracking-[0.4em] h-14 rounded-xl border border-white/10 bg-white/5 text-white focus:border-[#22C55E]/50 focus:ring-1 focus:ring-[#22C55E]/50 outline-none transition-all"
            placeholder="000000"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#22C55E] h-12 text-sm font-bold text-white transition-all hover:bg-[#1eb054] disabled:opacity-50 shadow-[0_4px_12px_rgba(34,197,94,0.2)]"
        >
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify Identity"}
        </button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => window.location.href = "/auth/login"}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Back to Login
        </button>
      </div>
    </form>
  );
}
