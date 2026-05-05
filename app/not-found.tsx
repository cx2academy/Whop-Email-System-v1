/**
 * app/not-found.tsx
 *
 * Global 404 page.
 */

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page Not Found",
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#09090B] px-4 text-center selection:bg-green-500/30">
      <div className="relative mb-8">
        <p className="text-[12rem] font-black text-white/5 leading-none select-none">404</p>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 bg-green-500/10 rounded-full blur-2xl animate-pulse"></div>
        </div>
      </div>
      
      <h1 className="mb-3 text-3xl font-extrabold text-white tracking-tight">Lost in the tray?</h1>
      <p className="mb-10 text-zinc-400 max-w-xs mx-auto leading-relaxed">
        The page you're looking for has been archived or never existed. Let's get you back to making money.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center bg-green-500 hover:bg-green-400 text-black px-8 py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-3 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
