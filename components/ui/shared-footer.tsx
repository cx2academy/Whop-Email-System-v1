'use client';

import Link from "next/link";
import { Logo } from "./logo";
import { useBetaPopup } from "./beta-popup-context";

export function SharedFooter() {
  const { show: showBetaPopup, showWaitlist } = useBetaPopup();

  return (
    <footer className="bg-white pt-24 pb-12 px-6 border-t border-zinc-100">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-12 gap-12 lg:gap-24 mb-24">
        <div className="col-span-2 md:col-span-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-xl font-black text-zinc-900 mb-6 hover:opacity-80 transition-opacity"
          >
            <Logo size={28} />
            <span className="tracking-tighter">RevTray</span>
          </Link>
          <p className="text-zinc-500 text-sm leading-relaxed max-w-xs mb-8 font-medium">
            The AI-powered revenue engine built exclusively for Whop creators. Maximize LTV. Eliminate silent cancellations.
          </p>
          <div className="flex gap-4">
            {["twitter", "github", "discord"].map((social) => (
              <button
                key={social}
                onClick={showBetaPopup}
                className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center hover:bg-zinc-100 transition-colors group cursor-pointer"
              >
                <div className="w-5 h-5 bg-zinc-400 group-hover:bg-zinc-900 transition-colors rounded-sm" />
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-1 md:col-span-2">
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-8">
            Product
          </h4>
          <ul className="space-y-4 text-sm font-medium text-zinc-500">
             <li><Link href="/revenue-recovery" className="hover:text-zinc-900 transition-colors">Recovery Engine</Link></li>
             <li><Link href="/automations" className="hover:text-zinc-900 transition-colors">AI Tools</Link></li>
             <li><Link href="/pricing" className="hover:text-zinc-900 transition-colors">Pricing</Link></li>
             <li><button onClick={showWaitlist} className="hover:text-zinc-900 transition-colors cursor-pointer text-sm font-medium">Beta Access</button></li>
          </ul>
        </div>

        <div className="col-span-1 md:col-span-2">
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-8">
            Resources
          </h4>
          <ul className="space-y-4 text-sm font-medium text-zinc-500">
             <li><Link href="/support" className="hover:text-zinc-900 transition-colors">Support</Link></li>
             <li><Link href="/blog" className="hover:text-zinc-900 transition-colors">Creator Blog</Link></li>
             <li><Link href="/changelog" className="hover:text-zinc-900 transition-colors">Changelog</Link></li>
             <li><Link href="/support" className="hover:text-zinc-900 transition-colors">Documentation</Link></li>
          </ul>
        </div>

        <div className="col-span-2 md:col-span-4">
          <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-8">
            Company
          </h4>
          <ul className="space-y-4 text-sm font-medium text-zinc-500">
             <li><Link href="/about" className="hover:text-zinc-900 transition-colors">About Story</Link></li>
             <li><Link href="/privacy" className="hover:text-zinc-900 transition-colors">Privacy Policy</Link></li>
             <li><Link href="/terms" className="hover:text-zinc-900 transition-colors">Terms of Service</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-10 border-t border-zinc-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col md:flex-row items-center gap-4 text-xs font-medium text-zinc-400">
          <span>&copy; 2026 RevTray Engine. Operating out of Texas.</span>
          <div className="hidden md:block w-1 h-1 rounded-full bg-zinc-200" />
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Systems Operational
          </span>
        </div>
        <div className="flex items-center gap-6 text-xs font-bold text-zinc-400 uppercase tracking-widest">
          <span>Austin, TX</span>
          <div className="w-px h-4 bg-zinc-100" />
          <span>Built for Whop Creators</span>
        </div>
      </div>
    </footer>
  );
}
