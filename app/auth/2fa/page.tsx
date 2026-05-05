import { Metadata } from "next";
import { TwoFactorForm } from "./two-factor-form";

export const metadata: Metadata = {
  title: "Two-Factor Authentication - RevTray",
  description: "Verify your identity with 2FA",
};

export default function TwoFactorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6" style={{ background: 'var(--surface-app)' }}>
      <div className="w-full max-w-md rounded-2xl p-8 shadow-xl border border-white/5" style={{ background: 'var(--surface-card)' }}>
        <TwoFactorForm />
      </div>
    </div>
  );
}
