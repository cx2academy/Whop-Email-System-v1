"use client";

import { useState } from "react";
import { Shield, Key, Eye, EyeOff, Lock } from "lucide-react";
import { changePassword } from "@/lib/user/actions";
import { toast } from "sonner";
import { TwoFactorSetup } from "./two-factor-setup";

interface SecuritySettingsProps {
  twoFactorEnabled: boolean;
}

export function SecuritySettings({ twoFactorEnabled }: SecuritySettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await changePassword(formData);
      if (res.success) {
        toast.success("Password updated successfully");
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error(res.error || "Failed to update password");
      }
    } catch (err) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  const inputClasses = "w-full rounded-xl border border-white/10 bg-white/5 h-10 px-4 text-sm text-white placeholder:text-gray-500 focus:border-[#22C55E]/50 focus:ring-1 focus:ring-[#22C55E]/50 outline-none transition-all";
  const labelClasses = "block text-xs font-medium text-gray-400 mb-1.5";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/5 p-4">
        <div className="mt-0.5 rounded-lg bg-[#22C55E]/10 p-2 text-[#22C55E]">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Password Security</h3>
          <p className="mt-1 text-xs text-gray-400 leading-relaxed">
            Ensure your account is protected by using a strong, unique password.
            We recommend at least 12 characters with a mix of letters, numbers, and symbols.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className={labelClasses}>Current Password</label>
          <div className="relative">
            <input
              name="currentPassword"
              type={showCurrent ? "text" : "password"}
              required
              className={inputClasses}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className={labelClasses}>New Password</label>
          <div className="relative">
            <input
              name="newPassword"
              type={showNew ? "text" : "password"}
              required
              className={inputClasses}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-gray-500">
            Min 8 chars, incl. uppercase, lowercase, number, and symbol.
          </p>
        </div>

        <div>
          <label className={labelClasses}>Confirm New Password</label>
          <div className="relative">
            <input
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              required
              className={inputClasses}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#22C55E] h-10 px-6 text-sm font-bold text-white transition-all hover:bg-[#1eb054] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(34,197,94,0.2)]"
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : (
              <Key className="h-4 w-4" />
            )}
            Update Password
          </button>
        </div>
      </form>

      <div className="pt-6 border-t border-white/5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
          <Lock className="h-4 w-4 text-[#22C55E]" />
          Multi-Factor Authentication
        </h3>
        <TwoFactorSetup isEnabled={twoFactorEnabled} />
      </div>

    </div>
  );
}
