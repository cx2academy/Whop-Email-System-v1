'use client';

import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Search, 
  ChevronRight, 
  TrendingUp, 
  Target, 
  Users
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { SharedFooter } from "@/components/ui/shared-footer";
import { useBetaPopup } from "@/components/ui/beta-popup-context";

export default function BlogPage() {
  const { show: showBetaPopup, showWaitlist } = useBetaPopup();
  const posts = [
    {
      title: "How to Build a High-LTV Whop Funnel from Scratch",
      category: "Strategy",
      author: "RevTray Engineering",
      date: "May 02, 2026",
      readTime: "8 min read",
      image: "https://picsum.photos/seed/strategy/800/400"
    },
    {
      title: "Why Most Whop Creators Fail After Their First Viral Hit",
      category: "Case Study",
      author: "Growth Team",
      date: "April 25, 2026",
      readTime: "6 min read",
      image: "https://picsum.photos/seed/fail/800/400"
    },
    {
      title: "The Psychology of Re-Engagement: Turning Churned Users into Lifelong Advocates",
      category: "AI Insights",
      author: "Data Science",
      date: "April 18, 2026",
      readTime: "12 min read",
      image: "https://picsum.photos/seed/psychology/800/400"
    }
  ];

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-green-100 selection:text-green-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-xl bg-zinc-50 group-hover:bg-zinc-100 transition-colors">
              <ArrowLeft size={18} className="text-zinc-900" />
            </div>
            <span className="text-sm font-bold text-zinc-900 tracking-tight">Main Dashboard</span>
          </Link>
          <div className="flex items-center gap-6">
            <button 
              onClick={showWaitlist}
              className="px-6 py-2.5 bg-zinc-900 text-white text-xs font-black uppercase tracking-tighter rounded-full hover:scale-105 transition-all cursor-pointer"
            >
              Get Beta Access
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-40 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="max-w-3xl mb-24">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest mb-6"
            >
              <TrendingUp className="w-3 h-3" />
              Creator Insights
            </motion.div>
            <h1 className="text-6xl font-black text-zinc-900 tracking-tight leading-[0.9] mb-8">
              The Creator <br />
              <span className="text-zinc-400">Survival Guide.</span>
            </h1>
            <p className="text-xl text-zinc-500 font-medium max-w-2xl">
              We share the data-driven strategies we use to stabilize Whop stores and maximize LTV across our entire network.
            </p>
          </div>

          {/* Search/Filter Bar */}
          <div className="flex flex-col md:flex-row items-center gap-4 mb-16 p-2 bg-zinc-50 rounded-2xl border border-zinc-100">
             <div className="flex-1 flex items-center gap-4 px-4">
                <Search size={18} className="text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Search articles, case studies, and guides..." 
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full text-zinc-900 placeholder:text-zinc-400"
                />
             </div>
             <div className="flex items-center gap-2 pr-2">
                {['All', 'Strategy', 'Case Studies', 'AI'].map((cat) => (
                  <button key={cat} className="px-4 py-2 hover:bg-white rounded-xl text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-all">
                    {cat}
                  </button>
                ))}
             </div>
          </div>

          {/* Blog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-32">
            {posts.map((post, i) => (
              <motion.article 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group cursor-pointer"
                onClick={showBetaPopup}
              >
                <div className="relative aspect-[16/10] bg-zinc-100 rounded-[2rem] overflow-hidden mb-6 border border-zinc-200">
                  <Image 
                    src={post.image} 
                    alt={post.title} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-white ring-1 ring-black/5 rounded-full text-[10px] font-black uppercase tracking-widest text-zinc-900">
                     {post.category}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">
                   <span>{post.date}</span>
                   <div className="w-1 h-1 bg-zinc-300 rounded-full" />
                   <span>{post.readTime}</span>
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-4 leading-tight group-hover:text-green-600 transition-colors line-clamp-2">
                   {post.title}
                </h3>
                <div className="flex items-center gap-3">
                   <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden">
                      <Image src={post.image} alt={post.author} width={24} height={24} className="grayscale" referrerPolicy="no-referrer" />
                   </div>
                   <span className="text-xs font-bold text-zinc-500">{post.author}</span>
                </div>
              </motion.article>
            ))}
          </div>

          {/* Featured Sections (SEO Boosters) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="p-12 bg-zinc-900 rounded-[3rem] text-white">
                <Target className="w-8 h-8 text-green-500 mb-6" />
                <h3 className="text-3xl font-black mb-4">Mastering Recurring Revenue</h3>
                <p className="text-zinc-400 font-medium mb-10">Download our internal handbook on how to turn viral traffic into 12-month retention loops.</p>
                <button 
                   onClick={showBetaPopup}
                   className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-green-500 hover:text-green-400 transition-colors cursor-pointer"
                >
                   Get the Handbook <ChevronRight size={14} />
                </button>
             </div>
             <div className="p-12 bg-zinc-50 rounded-[3rem] border border-zinc-100">
                <Users className="w-8 h-8 text-indigo-500 mb-6" />
                <h3 className="text-3xl font-black text-zinc-900 mb-4">The Whop Council</h3>
                <p className="text-zinc-500 font-medium mb-10">Join our private network of high-volume creators to share alpha on retention and growth.</p>
                <button 
                   onClick={showBetaPopup}
                   className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-400 transition-colors cursor-pointer"
                >
                   Apply to Join <ChevronRight size={14} />
                </button>
             </div>
          </div>
        </div>
      </main>

      <SharedFooter />
    </div>
  );
}
