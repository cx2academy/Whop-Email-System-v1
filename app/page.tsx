'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  LineChart, Zap, Users, Sparkles, Check, ArrowRight, 
  LayoutDashboard, Mail, PieChart, Plus, MessageSquare 
} from 'lucide-react';

const Logo = ({ className = "" }: { className?: string }) => (
  <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`shrink-0 ${className}`}>
    <defs>
      <linearGradient id="top-flap-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4ADE80" />
        <stop offset="100%" stopColor="#15803D" />
      </linearGradient>
      <linearGradient id="bot-flap-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#4ADE80" />
        <stop offset="100%" stopColor="#22C55E" />
      </linearGradient>
    </defs>
    <g transform="rotate(-12 50 50)">
      {/* Top Flap */}
      <path d="M 5 36 L 50 6 L 95 36 Z" fill="url(#top-flap-grad)" stroke="url(#top-flap-grad)" strokeWidth="2" strokeLinejoin="round" />
      
      {/* Inside Pocket */}
      <path d="M 5 40 L 95 40 L 95 86 L 5 86 Z" fill="#064E3B" stroke="#064E3B" strokeWidth="2" strokeLinejoin="round" />
      
      {/* Left Flap */}
      <path d="M 5 40 L 50 66 L 5 86 Z" fill="#16A34A" stroke="#16A34A" strokeWidth="2" strokeLinejoin="round" />
      
      {/* Right Flap */}
      <path d="M 95 40 L 50 66 L 95 86 Z" fill="#15803D" stroke="#15803D" strokeWidth="2" strokeLinejoin="round" />
      
      {/* Bottom Flap */}
      <path d="M 5 86 L 50 56 L 95 86 Z" fill="url(#bot-flap-grad)" stroke="url(#bot-flap-grad)" strokeWidth="2" strokeLinejoin="round" />
      
      {/* Gap Lines */}
      <path d="M 5 86 L 50 56 L 95 86" fill="none" stroke="#09090B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </svg>
);

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // --- PREVIEW MODE BYPASS ---
    if (process.env.NEXT_PUBLIC_PREVIEW_MODE === "true") {
      router.push('/dashboard');
      return;
    }
    // --- END PREVIEW MODE BYPASS ---

    const handleScroll = () => setIsScrolled(window.scrollY > 32);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-300 font-body selection:bg-green-500/30">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 h-[60px] flex items-center justify-between px-6 transition-all duration-300 ${isScrolled ? 'bg-[#09090B]/80 backdrop-blur-xl border-b border-white/10' : 'bg-transparent'}`}>
        <a href="/" className="flex items-center gap-2 font-display text-lg font-extrabold text-white hover:opacity-80 transition-opacity">
          <Logo /> RevTray
        </a>
        <ul className="hidden md:flex gap-8 text-sm font-medium">
          <li><a href="#features" className="text-zinc-400 hover:text-white transition-colors">Features</a></li>
          <li><a href="#revenue" className="text-zinc-400 hover:text-white transition-colors">Revenue</a></li>
          <li><a href="#ai" className="text-zinc-400 hover:text-white transition-colors">AI tools</a></li>
          <li><a href="#pricing" className="text-zinc-400 hover:text-white transition-colors">Pricing</a></li>
        </ul>
        <a href="/auth/login" className="px-4 py-2 rounded-lg text-sm font-bold bg-white/10 text-white border border-white/10 hover:bg-white/20 transition-colors">
          Start free &rarr;
        </a>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6 flex flex-col items-center overflow-hidden">
        <div className="absolute top-[-140px] left-1/2 -translate-x-1/2 w-[960px] h-[720px] bg-[radial-gradient(ellipse_52%_44%_at_50%_0%,rgba(34,197,94,0.15)_0%,transparent_70%)] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_75%_55%_at_50%_0%,black_0%,transparent_80%)] pointer-events-none"></div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 text-xs font-semibold text-white/50 mb-7 tracking-wide">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            Built for Whop creators
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-5xl md:text-7xl font-extrabold text-white leading-[1.05] tracking-tight mb-6">
            Know which emails<br />make you <span className="relative inline-block text-green-500">money<div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-transparent opacity-50"></div></span>.
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            The only email platform that connects your campaigns directly to Whop revenue — so you know what converts and what doesn't.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
            <a href="/auth/login" className="inline-flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-black px-8 py-4 rounded-xl text-sm font-bold shadow-[0_4px_20px_rgba(34,197,94,0.3)] hover:shadow-[0_6px_24px_rgba(34,197,94,0.4)] transition-all hover:-translate-y-0.5">
              Create free account <ArrowRight size={16} />
            </a>
            <a href="#features" className="inline-flex items-center justify-center gap-2 bg-transparent hover:bg-white/5 text-zinc-300 hover:text-white border border-white/10 hover:border-white/20 px-8 py-4 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5">
              See how it works
            </a>
          </motion.div>
          
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-xs text-zinc-500">
            Free to start &middot; No credit card &middot; Connects to Whop in 2 minutes
          </motion.p>
        </div>

        {/* Dashboard Mockup */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.4 }} className="w-full max-w-5xl mx-auto relative z-10 mt-20">
          <div className="absolute -bottom-10 left-[10%] right-[10%] h-20 bg-[radial-gradient(ellipse,rgba(34,197,94,0.2)_0%,transparent_70%)] blur-2xl pointer-events-none -z-10"></div>
          
          <div className="bg-[#0F1825] rounded-t-xl p-3 flex items-center gap-2 border border-white/10 border-b-0">
            <div className="flex gap-1.5 pl-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#28CA41]"></div>
            </div>
            <div className="flex-1 bg-white/5 h-7 rounded-md mx-4 flex items-center justify-center text-[11px] text-white/40 border border-white/5 font-mono tracking-wide">
              app.revtray.com/dashboard/campaigns
            </div>
          </div>
          
          <div className="border border-white/10 border-t-0 rounded-b-xl overflow-hidden grid grid-cols-1 md:grid-cols-[180px_1fr] min-h-[420px] bg-[#090F1C]">
            <div className="hidden md:flex flex-col bg-[#090F1C] border-r border-white/5">
              <div className="p-4 border-b border-white/5 flex items-center gap-2">
                <Logo className="w-5 h-5" />
                <span className="font-display text-sm font-extrabold text-white">RevTray</span>
              </div>
              <div className="p-2 flex-1 space-y-1">
                {[
                  { icon: LayoutDashboard, label: 'Dashboard' },
                  { icon: Mail, label: 'Campaigns', active: true },
                  { icon: Users, label: 'Contacts' },
                  { icon: LineChart, label: 'Revenue' },
                  { icon: Zap, label: 'Automations' },
                  { icon: PieChart, label: 'Analytics' }
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium cursor-default transition-colors ${item.active ? 'bg-green-500/10 text-green-400 relative' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}>
                    <item.icon size={14} /> {item.label}
                    {item.active && <div className="absolute right-0 top-1.5 bottom-1.5 w-0.5 bg-green-500 rounded-l-full shadow-[-3px_0_10px_rgba(34,197,94,0.3)]"></div>}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-[#0C1828] p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-white">Campaigns</h3>
                <button className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 text-black px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                  <Plus size={14} /> New Campaign
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Revenue attributed</div>
                  <div className="font-display text-2xl font-bold text-green-400 mb-1">$47,823</div>
                  <div className="text-[10px] text-green-500">&uarr; $3,240 this week</div>
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Total sent</div>
                  <div className="font-display text-2xl font-bold text-white mb-1">48,291</div>
                  <div className="text-[10px] text-zinc-500">5 campaigns</div>
                </div>
                <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Avg open rate</div>
                  <div className="font-display text-2xl font-bold text-white mb-1">34.2%</div>
                  <div className="text-[10px] text-green-500">&uarr; 4.1% vs last month</div>
                </div>
              </div>
              
              <div className="bg-black/20 border border-white/5 rounded-xl overflow-hidden">
                <div className="grid grid-cols-[1fr_60px_60px_70px_50px] gap-4 p-3 border-b border-white/5 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                  <div>Campaign</div><div>Status</div><div>Opens</div><div>Revenue</div><div>$/sent</div>
                </div>
                {[
                  { name: 'Real Estate Masterclass', sub: 'Dec 12 · 12,430 recipients', status: 'Sent', opens: '38.4%', rev: '$18,240', rps: '$1.47', high: true },
                  { name: '5-Day Deal Sequence', sub: 'Dec 8 · 10,891 recipients', status: 'Sent', opens: '42.1%', rev: '$11,700', rps: '$1.07', high: true },
                  { name: 'Flash Sale — 48hrs Only', sub: 'Dec 4 · 8,204 recipients', status: 'Sent', opens: '29.8%', rev: '$9,340', rps: '$1.14', high: false },
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_60px_60px_70px_50px] gap-4 p-3 border-b border-white/5 items-center hover:bg-white/[0.02] transition-colors">
                    <div>
                      <div className="text-xs font-medium text-white/90">{row.name}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{row.sub}</div>
                    </div>
                    <div><span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full text-[9px] font-bold">Sent</span></div>
                    <div className={`text-xs ${row.high ? 'text-green-400 font-medium' : 'text-zinc-400'}`}>{row.opens}</div>
                    <div className="text-xs font-display font-bold text-green-400">{row.rev}</div>
                    <div className="text-[10px] text-zinc-600">{row.rps}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Logo Marquee */}
      <section className="py-10 border-y border-white/5 bg-white/[0.01] overflow-hidden">
        <div className="text-center text-[11px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-8">Trusted by 400+ top Whop communities</div>
        <div className="flex whitespace-nowrap">
          <motion.div 
            animate={{ x: ["0%", "-50%"] }} 
            transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
            className="flex gap-16 items-center w-max px-8"
          >
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex gap-16 items-center">
                <span className="text-xl font-display font-bold text-white/20">WealthSquad</span>
                <span className="text-xl font-display font-bold text-white/20">EcomKings</span>
                <span className="text-xl font-display font-bold text-white/20">AlphaPicks</span>
                <span className="text-xl font-display font-bold text-white/20">FitnessPro</span>
                <span className="text-xl font-display font-bold text-white/20">TradeHunters</span>
                <span className="text-xl font-display font-bold text-white/20">CopyCamp</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-6 border-b border-white/5 bg-[#09090B]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 divide-x divide-white/5">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center px-4">
            <div className="font-display text-4xl font-extrabold text-white mb-2"><span className="text-green-500">$2.4M</span></div>
            <div className="text-sm text-zinc-400 mb-1">Revenue attributed</div>
            <div className="text-xs text-zinc-600">Tracked across all creators</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-center px-4">
            <div className="font-display text-4xl font-extrabold text-white mb-2">400+</div>
            <div className="text-sm text-zinc-400 mb-1">Whop creators</div>
            <div className="text-xs text-zinc-600">Courses, communities, products</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-center px-4">
            <div className="font-display text-4xl font-extrabold text-white mb-2">34%</div>
            <div className="text-sm text-zinc-400 mb-1">Avg open rate</div>
            <div className="text-xs text-zinc-600">vs. 21% industry average</div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="text-center px-4">
            <div className="font-display text-4xl font-extrabold text-white mb-2"><span className="text-green-500">5x</span></div>
            <div className="text-sm text-zinc-400 mb-1">ROI vs traditional</div>
            <div className="text-xs text-zinc-600">When you know what works</div>
          </motion.div>
        </div>
      </section>

      {/* Features (Bento Grid) */}
      <section className="py-24 px-6 bg-[#09090B]" id="features">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="grid md:grid-cols-2 gap-12 mb-16 items-end">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">Every tool you need to grow revenue through email.</h2>
            <p className="text-lg text-zinc-400 leading-relaxed">RevTray is built around one core idea: Whop creators deserve to know exactly what their emails earn — not just how many people opened them.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-zinc-900/50 border border-white/10 p-8 rounded-2xl hover:bg-zinc-900 transition-colors md:col-span-2">
              <div className="text-green-500 mb-4"><LineChart size={28} /></div>
              <h3 className="text-xl font-bold text-white mb-3">Revenue attribution</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">Every campaign shows exactly how much revenue it generated. Whop purchases within 7 days of a click are attributed automatically — no setup required.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-zinc-900/50 border border-white/10 p-8 rounded-2xl hover:bg-zinc-900 transition-colors">
              <div className="text-green-500 mb-4"><Sparkles size={28} /></div>
              <h3 className="text-xl font-bold text-white mb-3">AI sequence builder</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">Describe your product once. Get a 5-email launch sequence using proven frameworks.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-zinc-900/50 border border-white/10 p-8 rounded-2xl hover:bg-zinc-900 transition-colors">
              <div className="text-green-500 mb-4"><Users size={28} /></div>
              <h3 className="text-xl font-bold text-white mb-3">Whop native sync</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">Your members sync automatically. New joins, cancellations, tag changes — RevTray stays in sync.</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="bg-zinc-900/50 border border-white/10 p-8 rounded-2xl hover:bg-zinc-900 transition-colors md:col-span-2">
              <div className="text-green-500 mb-4"><Zap size={28} /></div>
              <h3 className="text-xl font-bold text-white mb-3">Smart segmentation & Automations</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">Target buyers vs. free members, recent openers, high-value subscribers. Trigger welcome flows and purchase follow-ups automatically based on what members do on Whop.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Deep Dive: Revenue */}
      <section className="py-24 px-6 relative overflow-hidden border-t border-white/5" id="revenue">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <div className="text-xs font-bold text-green-500 uppercase tracking-[0.12em] mb-4">Revenue Attribution</div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4">Stop guessing which email made the sale.</h2>
            <p className="text-zinc-400 text-lg mb-8 leading-relaxed">Every click is tracked. Every Whop purchase is matched. Your dashboard shows the revenue number next to every campaign — automatically, in real time.</p>
            <ul className="space-y-4">
              <li className="flex gap-3 text-zinc-300"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"></div> 7-day attribution window — any purchase after a click is credited.</li>
              <li className="flex gap-3 text-zinc-300"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"></div> Per-campaign revenue breakdown with revenue-per-email-sent.</li>
              <li className="flex gap-3 text-zinc-300"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"></div> Real-time Whop webhook — new purchases appear in seconds.</li>
            </ul>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="relative">
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 relative overflow-hidden backdrop-blur-sm">
              <div className="absolute -top-16 -right-16 w-56 h-56 bg-[radial-gradient(circle,rgba(34,197,94,0.15)_0%,transparent_65%)] pointer-events-none"></div>
              <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Total revenue from email</div>
              <div className="text-5xl font-display font-extrabold text-green-500 mb-1">$49,783</div>
              <div className="text-sm text-white/40 mb-8">this month &middot; <span className="text-green-400">&uarr; 28%</span> vs last month</div>
              
              <div className="flex justify-between text-[10px] text-white/30 font-semibold uppercase tracking-wider mb-3">
                <span>Top campaigns</span><span>Revenue</span>
              </div>
              <div className="space-y-3 mb-6">
                {[
                  { name: 'Masterclass launch', w: '92%', val: '$18.2k' },
                  { name: '5-day deal sequence', w: '64%', val: '$11.7k' },
                  { name: 'Flash sale — 48hrs', w: '51%', val: '$9.3k' },
                  { name: 'New member welcome', w: '38%', val: '$7.1k' }
                ].map((bar, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="text-xs text-white/50 w-28 truncate">{bar.name}</div>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: bar.w }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 + (i * 0.1) }} className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"></motion.div>
                    </div>
                    <div className="text-xs font-bold text-green-400 w-10 text-right">{bar.val}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <div className="text-[10px] text-white/30">Last purchase: 4 minutes ago</div>
                <div className="flex items-center gap-1.5 bg-green-500/10 text-green-400 px-2.5 py-1 rounded-full text-[10px] font-bold">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div> Live
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Deep Dive: AI */}
      <section className="py-24 px-6 relative overflow-hidden border-t border-white/5" id="ai">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-2 md:order-1 relative">
            <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 mb-4">
                <Sparkles size={14} /> AI Sequence Builder
              </div>
              <div className="space-y-2">
                {[
                  { n: 1, text: 'My first wholesale deal made $12k with $0 down', color: 'indigo' },
                  { n: 2, text: 'The 3-step system I use to find deals every week', color: 'blue' },
                  { n: 3, text: 'How Marcus closed his first deal in 31 days', color: 'green' },
                  { n: 4, text: 'Doors open: Real Estate Masterclass enrollment', color: 'yellow' },
                  { n: 5, text: 'Last chance — enrollment closes tonight at midnight', color: 'red' }
                ].map((row, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-${row.color}-500/20 text-${row.color}-300 shrink-0`}>{row.n}</div>
                    <div className="text-xs text-white/70 flex-1">{row.text}</div>
                    <div className={`text-[9px] font-bold px-2 py-1 rounded bg-${row.color}-500/10 text-${row.color}-300 cursor-pointer hover:opacity-80`}>Write</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="order-1 md:order-2">
            <div className="text-xs font-bold text-green-500 uppercase tracking-[0.12em] mb-4">AI Tools</div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4">A strategist. Not a text generator.</h2>
            <p className="text-zinc-400 text-lg mb-8 leading-relaxed">Generate complete launch sequences using proven frameworks. Real email strategy tailored to your product and audience — not generic filler content.</p>
            <ul className="space-y-4">
              <li className="flex gap-3 text-zinc-300"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"></div> 5-email sequence from a one-sentence brief.</li>
              <li className="flex gap-3 text-zinc-300"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"></div> Subject line scorer — rates 1-10, gives 3 alternatives.</li>
              <li className="flex gap-3 text-zinc-300"><div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 shrink-0"></div> Engagement predictor — estimate open rate before you send.</li>
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Testimonials (Wall of Love) */}
      <section className="py-24 px-6 border-t border-white/5 bg-[#09090B]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4">Trusted by top creators</h2>
            <p className="text-zinc-400 text-lg">Join hundreds of Whop communities scaling their revenue with RevTray.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="bg-zinc-900/40 border border-white/10 p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <img src="https://picsum.photos/seed/jordan/100/100" alt="Jordan M." className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                <div>
                  <div className="text-sm font-bold text-white">Jordan M.</div>
                  <div className="text-xs text-zinc-500">@jordan_realestate</div>
                </div>
                <div className="ml-auto text-[#1DA1F2]"><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg></div>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">I sent one campaign to 3,200 subscribers and immediately saw <span className="text-green-400 font-semibold">$4,200 attributed to that single email</span>. I've never had that kind of visibility before — I knew exactly what was working. RevTray is a gamechanger.</p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="bg-zinc-900/40 border border-white/10 p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <img src="https://picsum.photos/seed/taylor/100/100" alt="Taylor C." className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                <div>
                  <div className="text-sm font-bold text-white">Taylor C.</div>
                  <div className="text-xs text-zinc-500">@taylor_fitness</div>
                </div>
                <div className="ml-auto text-[#1DA1F2]"><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg></div>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">Described my fitness course in 3 sentences and got a <span className="text-white font-semibold">complete 5-email launch plan</span> that genuinely sounded like me. Sent the whole sequence the same afternoon.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="bg-zinc-900/40 border border-white/10 p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <img src="https://picsum.photos/seed/ryan/100/100" alt="Ryan B." className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                <div>
                  <div className="text-sm font-bold text-white">Ryan B.</div>
                  <div className="text-xs text-zinc-500">@ryan_trades</div>
                </div>
                <div className="ml-auto text-[#1DA1F2]"><svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg></div>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">Finally a tool that syncs with Whop automatically. My entire audience was imported and ready to email <span className="text-white font-semibold">in under 5 minutes</span>. No CSV exports, no broken imports.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6 bg-[#060A10] border-t border-white/5" id="pricing">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-bold tracking-widest uppercase px-4 py-1.5 mb-6">Simple Pricing</div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4">Start free. Scale as you grow.</h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">Every plan includes Whop sync, campaign sending, and open/click tracking. Upgrade when you need more.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Free */}
            <div className="bg-zinc-900/30 border border-white/10 rounded-2xl p-8 flex flex-col">
              <div className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2">Free</div>
              <div className="text-4xl font-extrabold text-white mb-1">$0 <span className="text-lg text-zinc-500 font-normal">/mo</span></div>
              <div className="text-sm text-zinc-500 mb-6">For creators just getting started</div>
              <div className="h-px bg-white/10 mb-6"></div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> 500 emails / month</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> 250 contacts</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> 3 campaigns / month</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> 3-day revenue attribution</li>
                <li className="flex items-center gap-3 text-sm text-zinc-600"><Check size={16} className="text-zinc-700 shrink-0" /> Automations</li>
                <li className="flex items-center gap-3 text-sm text-zinc-600"><Check size={16} className="text-zinc-700 shrink-0" /> Segments</li>
              </ul>
              <a href="/auth/login" className="block w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white text-center font-bold rounded-xl transition-colors">Get started free</a>
            </div>

            {/* Starter */}
            <div className="bg-zinc-900/30 border border-white/10 rounded-2xl p-8 flex flex-col">
              <div className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2">Starter</div>
              <div className="text-4xl font-extrabold text-white mb-1">$29 <span className="text-lg text-zinc-500 font-normal">/mo</span></div>
              <div className="text-sm text-zinc-500 mb-6">For growing communities</div>
              <div className="h-px bg-white/10 mb-6"></div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> 5,000 emails / month</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> 2,500 contacts</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> Unlimited campaigns</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> 14-day revenue attribution</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> 3 automations</li>
                <li className="flex items-center gap-3 text-sm text-zinc-600"><Check size={16} className="text-zinc-700 shrink-0" /> A/B testing</li>
              </ul>
              <a href="/auth/login?callbackUrl=%2Fdashboard%2Fsettings%2Fbilling%3Fplan%3DSTARTER" className="block w-full py-3 px-4 bg-green-500 hover:bg-green-400 text-black text-center font-bold rounded-xl transition-colors">Start Starter</a>
            </div>

            {/* Growth */}
            <div className="bg-green-500/5 border border-green-500/30 rounded-2xl p-8 flex flex-col relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">Most Popular</div>
              <div className="text-sm font-bold text-green-400 uppercase tracking-widest mb-2">Growth</div>
              <div className="text-4xl font-extrabold text-white mb-1">$79 <span className="text-lg text-zinc-500 font-normal">/mo</span></div>
              <div className="text-sm text-zinc-500 mb-6">For serious email marketers</div>
              <div className="h-px bg-white/10 mb-6"></div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> 25,000 emails / month</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> 10,000 contacts</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> Unlimited campaigns</li>
                <li className="flex items-center gap-3 text-sm text-white font-semibold"><Check size={16} className="text-green-500 shrink-0" /> Unlimited attribution</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> Unlimited automations</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> A/B testing</li>
              </ul>
              <a href="/auth/login?callbackUrl=%2Fdashboard%2Fsettings%2Fbilling%3Fplan%3DGROWTH" className="block w-full py-3 px-4 bg-green-500 hover:bg-green-400 text-black text-center font-bold rounded-xl transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)]">Start Growth</a>
            </div>

            {/* Scale */}
            <div className="bg-zinc-900/30 border border-white/10 rounded-2xl p-8 flex flex-col">
              <div className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-2">Scale</div>
              <div className="text-4xl font-extrabold text-white mb-1">$199 <span className="text-lg text-zinc-500 font-normal">/mo</span></div>
              <div className="text-sm text-zinc-500 mb-6">For high-volume senders</div>
              <div className="h-px bg-white/10 mb-6"></div>
              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> Unlimited emails</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> Unlimited contacts</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> All Growth features</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> Multiple email providers</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> Priority support</li>
                <li className="flex items-center gap-3 text-sm text-zinc-300"><Check size={16} className="text-green-500 shrink-0" /> Dedicated onboarding</li>
              </ul>
              <a href="/auth/login?callbackUrl=%2Fdashboard%2Fsettings%2Fbilling%3Fplan%3DSCALE" className="block w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-white text-center font-bold rounded-xl transition-colors">Start Scale</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#060A10] border-t border-white/5 pt-20 pb-10 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-12 mb-16">
          <div className="col-span-2">
            <div className="flex items-center gap-2 font-display text-lg font-extrabold text-white mb-4">
              <Logo className="w-6 h-6" /> RevTray
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">Email marketing built for Whop creators. Send smarter. Earn more.</p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-white transition-colors">Campaigns</a></li>
              <li><a href="#" className="hover:text-white transition-colors">AI Tools</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Revenue</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Automations</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Resources</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><a href="#" className="hover:text-white transition-colors">About</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-600">
          <div>&copy; 2026 RevTray. All rights reserved.</div>
          <div>Built for Whop creators</div>
        </div>
      </footer>
    </div>
  );
}
