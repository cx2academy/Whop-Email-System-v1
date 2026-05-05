"use client";

import { useState } from "react";
import { ShieldCheck, Smartphone, QrCode, ArrowRight, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { generate2faSecret, enable2fa, disable2fa } from "@/lib/user/2fa-actions";
import Image from "next/image";

interface TwoFactorSetupProps {
  isEnabled: boolean;
}

export function TwoFactorSetup({ isEnabled }: TwoFactorSetupProps) {
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function startEnrollment() {
    setIsLoading(true);
    try {
      const res = await generate2faSecret();
      if (res.success) {
        setSetupData(res.data);
        setIsEnrolling(true);
        setStep(1);
      } else {
        toast.error(res.error || "Failed to start 2FA setup");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!setupData) return;

    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("secret", setupData.secret);

    try {
      const res = await enable2fa(formData);
      if (res.success) {
        toast.success("2FA enabled successfully");
        setIsEnrolling(false);
        setSetupData(null);
      } else {
        toast.error(res.error || "Invalid verification code");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDisable() {
    if (!confirm("Are you sure you want to disable 2FA? This will make your account less secure.")) return;
    
    setIsLoading(true);
    try {
      const res = await disable2fa();
      if (res.success) {
        toast.success("2FA disabled");
      } else {
        toast.error(res.error || "Failed to disable 2FA");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  const copySecret = () => {
    if (!setupData) return;
    navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wrapperClasses = "rounded-xl border p-5 transition-all";
  const borderClasses = isEnabled ? "border-[#22C55E]/30 bg-[#22C55E]/5" : "border-white/10 bg-white/5";

  if (!isEnrolling) {
    return (
      <div className={`${wrapperClasses} ${borderClasses}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${isEnabled ? "bg-[#22C55E]/20 text-[#22C55E]" : "bg-white/10 text-gray-400"}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Two-Factor Authentication</p>
              <p className="text-xs text-gray-500">
                {isEnabled ? "Your account is protected with 2FA." : "Add an extra layer of security to your account."}
              </p>
            </div>
          </div>
          <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isEnabled ? "bg-[#22C55E]/20 text-[#22C55E]" : "bg-gray-500/20 text-gray-500 border border-gray-500/30"}`}>
            {isEnabled ? "Enabled" : "Disabled"}
          </div>
        </div>

        {isEnabled ? (
          <button
            onClick={handleDisable}
            disabled={isLoading}
            className="text-xs font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
          >
            Disable 2FA
          </button>
        ) : (
          <button
            onClick={startEnrollment}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-white/15 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Smartphone className="h-3 w-3" />}
            Enable 2FA
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-white">Secure Your Account</h3>
        <button 
          onClick={() => { setIsEnrolling(false); setSetupData(null); }}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Cancel
        </button>
      </div>

      <div className="flex gap-2 mb-8">
        {[1, 2].map((s) => (
          <div 
            key={s} 
            className={`h-1.5 flex-1 rounded-full transition-all ${step >= s ? "bg-[#22C55E]" : "bg-white/10"}`} 
          />
        ))}
      </div>

      {step === 1 && setupData && (
        <div className="space-y-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-2xl bg-white p-3 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <Image 
                src={setupData.qrCodeUrl} 
                alt="2FA QR Code" 
                width={160} 
                height={160}
                className="rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-white">Scan this QR Code</p>
              <p className="text-xs text-gray-500 max-w-[240px]">
                Use an authenticator app like Google Authenticator or Authy to scan the code.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-black/20 p-4">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Manual Entry Key</p>
            <div className="flex items-center justify-between">
              <code className="text-sm font-mono text-[#22C55E] tracking-wider">{setupData.secret}</code>
              <button 
                onClick={copySecret}
                className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-[#22C55E]" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#22C55E] h-11 text-sm font-bold text-white transition-all hover:bg-[#1eb054] shadow-[0_4px_12px_rgba(34,197,94,0.2)]"
          >
            I've scanned it <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E]">
              <QrCode className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Enter verification code</h4>
            <p className="text-xs text-gray-500">
              Enter the 6-digit code currently shown in your authenticator app.
            </p>
          </div>

          <input
            name="token"
            type="text"
            required
            autoFocus
            maxLength={6}
            pattern="\d*"
            className="w-full text-center text-2xl font-mono tracking-[0.5em] h-14 rounded-xl border border-white/10 bg-white/5 text-white focus:border-[#22C55E]/50 focus:ring-1 focus:ring-[#22C55E]/50 outline-none transition-all"
            placeholder="000000"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-xl border border-white/10 h-11 text-xs font-bold text-gray-400 hover:bg-white/5 transition-all"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-[#22C55E] h-11 text-sm font-bold text-white transition-all hover:bg-[#1eb054] disabled:opacity-50 shadow-[0_4px_12px_rgba(34,197,94,0.2)]"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Enable"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
