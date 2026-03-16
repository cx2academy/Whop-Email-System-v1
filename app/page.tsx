/**
 * app/page.tsx
 * RevTray marketing landing page — dark theme.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  useEffect(() => {
    // Scroll reveal
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('rt-visible'); }),
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.rt-fade').forEach((el) => obs.observe(el));

    // Bar animations
    const barObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).querySelectorAll<HTMLElement>('.rt-bar-fill').forEach((b) => {
            setTimeout(() => { b.style.width = (b.dataset.width ?? '0') + '%'; }, 200);
          });
          barObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    const rw = document.querySelector('.rt-rev-widget');
    if (rw) barObs.observe(rw);

    // Counter animation
    function animCount(el: HTMLElement, end: number, pfx: string, dur: number) {
      let v = 0;
      const step = end / (dur / 16);
      const tick = () => {
        v = Math.min(v + step, end);
        el.textContent = pfx + Math.round(v).toLocaleString();
        if (v < end) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    const hcEl = document.getElementById('rt-hc');
    if (hcEl) {
      const hcObs = new IntersectionObserver((e) => {
        if (e[0].isIntersecting) { animCount(hcEl, 47823, '$', 1800); hcObs.disconnect(); }
      }, { threshold: 0.5 });
      hcObs.observe(hcEl);
    }
    const rcEl = document.getElementById('rt-rc');
    if (rcEl) {
      const rcObs = new IntersectionObserver((e) => {
        if (e[0].isIntersecting) { animCount(rcEl, 49783, '$', 2000); rcObs.disconnect(); }
      }, { threshold: 0.3 });
      rcObs.observe(rcEl);
    }

    return () => { obs.disconnect(); barObs.disconnect(); };
  }, []);

  return (
    <>
      <style>{`
        /* ── RevTray Landing — scoped styles ── */
        :root {
          --rt-bg: #0A0E1A; --rt-card: #111827; --rt-dark: #060D18; --rt-darker: #0D1625;
          --rt-green: #10B981; --rt-green-light: rgba(16,185,129,0.12); --rt-green-dark: #059669;
          --rt-indigo: #6366F1; --rt-indigo-light: rgba(99,102,241,0.15);
          --rt-text: #E2E8F0; --rt-mid: #9CA3AF; --rt-light: #4B5563;
          --rt-border: #1F2937; --rt-r: 14px;
        }
        .rt-page { font-family:'DM Sans',system-ui,sans-serif; background:var(--rt-bg); color:var(--rt-text); line-height:1.6; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
        .rt-page h1,.rt-page h2,.rt-page h3 { font-family:'Bricolage Grotesque',system-ui,sans-serif; letter-spacing:-0.03em; }
        .rt-container { max-width:1120px; margin:0 auto; }

        /* Nav */
        .rt-nav { position:fixed; top:0; left:0; right:0; z-index:100; background:rgba(10,14,26,0.88); backdrop-filter:blur(12px); border-bottom:1px solid var(--rt-border); padding:0 5%; height:60px; display:flex; align-items:center; justify-content:space-between; }
        .rt-logo { display:flex; align-items:center; gap:8px; font-family:'Bricolage Grotesque',sans-serif; font-size:20px; font-weight:800; color:var(--rt-text); text-decoration:none; letter-spacing:-0.04em; }
        .rt-logo-mark { width:28px; height:28px; background:var(--rt-green); border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:14px; color:white; font-weight:800; }
        .rt-nav-links { display:flex; align-items:center; gap:32px; list-style:none; }
        .rt-nav-links a { font-size:14px; font-weight:500; color:var(--rt-mid); text-decoration:none; transition:color .15s; }
        .rt-nav-links a:hover { color:var(--rt-text); }
        .rt-nav-cta { background:var(--rt-green) !important; color:white !important; padding:8px 18px; border-radius:8px; font-size:14px; font-weight:600; text-decoration:none; transition:opacity .15s; }
        .rt-nav-cta:hover { opacity:.88; }

        /* Animations */
        .rt-fade { opacity:0; transform:translateY(24px); transition:opacity .6s,transform .6s; }
        .rt-fade.rt-visible { opacity:1; transform:translateY(0); }
        .rt-s1{transition-delay:.1s} .rt-s2{transition-delay:.2s} .rt-s3{transition-delay:.3s} .rt-s4{transition-delay:.4s} .rt-s5{transition-delay:.5s}
        @keyframes rt-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.3)}}
        .rt-pulse{animation:rt-pulse 2s infinite}

        /* Sections */
        .rt-section { padding:100px 5%; }
        .rt-eyebrow { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--rt-green-dark); margin-bottom:16px; }
        .rt-h2 { font-size:clamp(32px,4vw,52px); font-weight:800; color:var(--rt-text); max-width:640px; margin-bottom:20px; }
        .rt-sub { font-size:17px; color:var(--rt-mid); max-width:520px; line-height:1.65; margin-bottom:48px; }

        /* Hero */
        .rt-hero { padding:160px 5% 80px; text-align:center; position:relative; overflow:hidden; }
        .rt-hero::before { content:''; position:absolute; top:-200px; left:50%; transform:translateX(-50%); width:900px; height:900px; background:radial-gradient(circle,rgba(16,185,129,.07) 0%,transparent 70%); pointer-events:none; }
        .rt-badge { display:inline-flex; align-items:center; gap:6px; background:rgba(16,185,129,.1); color:var(--rt-green); border:1px solid rgba(16,185,129,.25); border-radius:100px; padding:5px 14px; font-size:13px; font-weight:600; margin-bottom:28px; }
        .rt-hero h1 { font-size:clamp(44px,7vw,80px); font-weight:800; max-width:900px; margin:0 auto 24px; }
        .rt-hero h1 .rt-hl { color:var(--rt-green); }
        .rt-hero-sub { font-size:clamp(16px,2vw,20px); color:var(--rt-mid); max-width:560px; margin:0 auto 44px; }
        .rt-hero-actions { display:flex; align-items:center; justify-content:center; gap:12px; margin-bottom:24px; flex-wrap:wrap; }
        .rt-hero-note { font-size:13px; color:var(--rt-light); }

        /* Buttons */
        .rt-btn-primary { background:#0F172A; color:white; padding:14px 28px; border-radius:10px; font-size:15px; font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:8px; transition:transform .15s,box-shadow .15s; box-shadow:0 4px 14px rgba(0,0,0,.4); border:1px solid rgba(255,255,255,.1); }
        .rt-btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.5); }
        .rt-btn-secondary { background:rgba(255,255,255,.06); color:var(--rt-text); padding:14px 28px; border-radius:10px; font-size:15px; font-weight:500; text-decoration:none; display:inline-flex; align-items:center; gap:8px; border:1px solid rgba(255,255,255,.1); transition:background .15s; }
        .rt-btn-secondary:hover { background:rgba(255,255,255,.1); }
        .rt-btn-green { background:var(--rt-green); color:white; padding:16px 36px; border-radius:10px; font-size:16px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 20px rgba(16,185,129,.35); transition:transform .15s,box-shadow .15s; }
        .rt-btn-green:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(16,185,129,.5); }
        .rt-btn-ghost { background:rgba(255,255,255,.08); color:rgba(255,255,255,.85); padding:16px 36px; border-radius:10px; font-size:16px; font-weight:500; text-decoration:none; display:inline-flex; align-items:center; gap:8px; border:1px solid rgba(255,255,255,.1); transition:background .15s; }
        .rt-btn-ghost:hover { background:rgba(255,255,255,.12); }

        /* Dashboard mock */
        .rt-dash-wrap { padding:0 5% 80px; }
        .rt-dash-outer { max-width:960px; margin:0 auto; position:relative; }
        .rt-dash-glow { position:absolute; inset:-40px; background:radial-gradient(ellipse at center,rgba(16,185,129,.07) 0%,transparent 70%); pointer-events:none; }
        .rt-dash-frame { background:var(--rt-dark); border-radius:16px; padding:1px; box-shadow:0 12px 48px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.06); overflow:hidden; }
        .rt-db-titlebar { background:#141D2E; padding:12px 16px; display:flex; align-items:center; gap:8px; border-bottom:1px solid rgba(255,255,255,.05); }
        .rt-dot{width:11px;height:11px;border-radius:50%} .rt-dr{background:#FF5F57} .rt-dy{background:#FFBD2E} .rt-dg{background:#28CA41}
        .rt-db-url { flex:1; text-align:center; font-size:12px; color:rgba(255,255,255,.25); }
        .rt-db-inner { display:grid; grid-template-columns:200px 1fr; min-height:460px; }
        .rt-db-sidebar { background:#0D1625; padding:20px 0; border-right:1px solid rgba(255,255,255,.05); }
        .rt-db-logo { padding:4px 20px 20px; font-family:'Bricolage Grotesque',sans-serif; font-size:16px; font-weight:800; color:white; letter-spacing:-.03em; display:flex; align-items:center; gap:8px; }
        .rt-db-logo-icon { width:22px; height:22px; background:var(--rt-green); border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:11px; color:white; font-weight:800; }
        .rt-db-nav { padding:8px 20px; font-size:13px; color:rgba(255,255,255,.4); display:flex; align-items:center; gap:9px; }
        .rt-db-nav.rt-active { background:rgba(16,185,129,.1); color:#4ADE80; border-right:2px solid var(--rt-green); }
        .rt-db-main { background:#0F1929; padding:24px; overflow:hidden; }
        .rt-db-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; }
        .rt-db-title { font-size:18px; font-weight:700; color:white; font-family:'Bricolage Grotesque',sans-serif; letter-spacing:-.02em; }
        .rt-db-btn { background:var(--rt-green); color:white; padding:7px 16px; border-radius:7px; font-size:12px; font-weight:600; }
        .rt-db-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; }
        .rt-db-stat { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.06); border-radius:10px; padding:14px 16px; }
        .rt-db-lbl { font-size:11px; color:rgba(255,255,255,.35); font-weight:500; text-transform:uppercase; letter-spacing:.05em; margin-bottom:6px; }
        .rt-db-val { font-size:22px; font-weight:700; color:white; font-family:'Bricolage Grotesque',sans-serif; letter-spacing:-.03em; }
        .rt-db-val.g { color:#4ADE80; }
        .rt-db-delta { font-size:11px; color:#4ADE80; font-weight:500; margin-top:2px; }
        .rt-db-th { display:grid; grid-template-columns:1fr 80px 70px 90px 80px; padding:8px 12px; font-size:11px; color:rgba(255,255,255,.25); font-weight:500; text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid rgba(255,255,255,.05); }
        .rt-db-row { display:grid; grid-template-columns:1fr 80px 70px 90px 80px; padding:12px; font-size:13px; color:rgba(255,255,255,.7); border-bottom:1px solid rgba(255,255,255,.04); align-items:center; transition:background .1s; }
        .rt-db-row:hover { background:rgba(255,255,255,.03); }
        .rt-cn { color:rgba(255,255,255,.88); font-weight:500; }
        .rt-cs { font-size:11px; color:rgba(255,255,255,.28); margin-top:1px; }
        .rt-b-sent { display:inline-block; background:rgba(99,102,241,.18); color:#A5B4FC; border-radius:100px; padding:2px 8px; font-size:11px; font-weight:600; }
        .rt-b-draft { display:inline-block; background:rgba(255,255,255,.07); color:rgba(255,255,255,.35); border-radius:100px; padding:2px 8px; font-size:11px; }
        .rt-rev-cell { color:#4ADE80; font-weight:700; font-family:'Bricolage Grotesque',sans-serif; letter-spacing:-.02em; }

        /* Stats bar */
        .rt-stats-bar { padding:48px 5%; background:var(--rt-card); border-top:1px solid var(--rt-border); border-bottom:1px solid var(--rt-border); }
        .rt-stats-grid { max-width:1000px; margin:0 auto; display:grid; grid-template-columns:repeat(4,1fr); gap:40px; text-align:center; }
        .rt-sn { font-family:'Bricolage Grotesque',sans-serif; font-size:40px; font-weight:800; letter-spacing:-.04em; color:var(--rt-text); line-height:1; }
        .rt-sn .g { color:var(--rt-green); }
        .rt-sl { font-size:14px; color:var(--rt-mid); margin-top:6px; }

        /* Pain cards */
        .rt-pain-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .rt-pain-card { background:var(--rt-card); border:1px solid var(--rt-border); border-radius:var(--rt-r); padding:28px; position:relative; overflow:hidden; }
        .rt-pain-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#FF5F57,#FF8C6B); }
        .rt-pain-icon { font-size:24px; margin-bottom:14px; display:block; }
        .rt-pain-card h3 { font-size:16px; font-weight:700; color:var(--rt-text); margin-bottom:8px; letter-spacing:-.02em; }
        .rt-pain-card p { font-size:14px; color:var(--rt-mid); line-height:1.6; }

        /* Solution dark */
        .rt-sol-section { background:var(--rt-darker); padding:100px 5%; position:relative; overflow:hidden; }
        .rt-sol-section::before { content:''; position:absolute; bottom:-300px; right:-200px; width:700px; height:700px; background:radial-gradient(circle,rgba(16,185,129,.1) 0%,transparent 60%); pointer-events:none; }
        .rt-sol-section .rt-eyebrow { color:var(--rt-green); }
        .rt-sol-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; max-width:1120px; margin:0 auto; }
        .rt-sol-card { background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07); border-radius:var(--rt-r); padding:32px; transition:border-color .2s,background .2s; }
        .rt-sol-card:hover { background:rgba(255,255,255,.05); border-color:rgba(16,185,129,.25); }
        .rt-sol-icon { width:44px; height:44px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:20px; margin-bottom:16px; }
        .rt-ig{background:rgba(16,185,129,.12)} .rt-ii{background:rgba(99,102,241,.12)} .rt-ia{background:rgba(251,191,36,.12)} .rt-ir{background:rgba(251,113,133,.12)}
        .rt-sol-card h3 { font-size:18px; font-weight:700; color:white; margin-bottom:8px; letter-spacing:-.02em; }
        .rt-sol-card p { font-size:14px; color:rgba(255,255,255,.5); line-height:1.65; }

        /* Features */
        .rt-feat-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .rt-feat-card { background:var(--rt-card); border:1px solid var(--rt-border); border-radius:var(--rt-r); padding:28px; transition:transform .2s,box-shadow .2s,border-color .2s; }
        .rt-feat-card:hover { transform:translateY(-3px); box-shadow:0 8px 32px rgba(0,0,0,.4); border-color:#374151; }
        .rt-feat-tag { display:inline-block; background:var(--rt-indigo-light); color:var(--rt-indigo); padding:3px 10px; border-radius:100px; font-size:11px; font-weight:700; letter-spacing:.04em; text-transform:uppercase; margin-bottom:14px; }
        .rt-feat-tag.g { background:rgba(16,185,129,.12); color:var(--rt-green); }
        .rt-feat-card h3 { font-size:17px; font-weight:700; color:var(--rt-text); margin-bottom:8px; letter-spacing:-.02em; }
        .rt-feat-card p { font-size:14px; color:var(--rt-mid); line-height:1.65; }

        /* Revenue section */
        .rt-rev-section { background:var(--rt-darker); border-top:1px solid var(--rt-border); border-bottom:1px solid var(--rt-border); padding:100px 5%; }
        .rt-rev-inner { max-width:1120px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center; }
        .rt-rev-steps { margin-top:40px; display:flex; flex-direction:column; gap:24px; }
        .rt-rev-step { display:flex; gap:16px; align-items:flex-start; }
        .rt-step-num { width:32px; height:32px; border-radius:50%; background:rgba(16,185,129,.12); color:var(--rt-green); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; flex-shrink:0; font-family:'Bricolage Grotesque',sans-serif; }
        .rt-step-text h4 { font-size:15px; font-weight:700; color:var(--rt-text); margin-bottom:4px; letter-spacing:-.02em; }
        .rt-step-text p { font-size:14px; color:var(--rt-mid); line-height:1.6; }
        .rt-rev-widget { background:rgba(255,255,255,.02); border:1px solid rgba(255,255,255,.06); border-radius:16px; padding:28px; position:relative; overflow:hidden; }
        .rt-rev-widget::before { content:''; position:absolute; top:-100px; right:-100px; width:300px; height:300px; background:radial-gradient(circle,rgba(16,185,129,.1) 0%,transparent 60%); }
        .rt-rw-lbl { font-size:12px; color:rgba(255,255,255,.35); font-weight:500; text-transform:uppercase; letter-spacing:.08em; margin-bottom:8px; }
        .rt-rw-num { font-family:'Bricolage Grotesque',sans-serif; font-size:52px; font-weight:800; color:#4ADE80; letter-spacing:-.04em; line-height:1; margin-bottom:4px; }
        .rt-rw-delta { font-size:13px; color:rgba(255,255,255,.4); margin-bottom:28px; }
        .rt-rw-delta span { color:#4ADE80; font-weight:600; }
        .rt-rw-bar-hdr { font-size:11px; color:rgba(255,255,255,.3); font-weight:500; margin-bottom:8px; display:flex; justify-content:space-between; }
        .rt-rw-bars { display:flex; flex-direction:column; gap:8px; margin-bottom:20px; }
        .rt-rw-bar-row { display:flex; align-items:center; gap:10px; }
        .rt-rw-bar-name { font-size:12px; color:rgba(255,255,255,.5); width:140px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-shrink:0; }
        .rt-rw-bar-track { flex:1; height:6px; background:rgba(255,255,255,.05); border-radius:100px; overflow:hidden; }
        .rt-rw-bar-fill { height:100%; background:linear-gradient(90deg,var(--rt-green),#34D399); border-radius:100px; transition:width 1.5s cubic-bezier(.16,1,.3,1); }
        .rt-rw-bar-val { font-size:12px; color:#4ADE80; font-weight:700; width:48px; text-align:right; font-family:'Bricolage Grotesque',sans-serif; flex-shrink:0; }

        /* AI section */
        .rt-ai-inner { max-width:1120px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:center; }
        .rt-ai-visual { background:var(--rt-card); border:1px solid var(--rt-border); border-radius:var(--rt-r); overflow:hidden; }
        .rt-ai-hdr { background:var(--rt-indigo); padding:14px 20px; display:flex; align-items:center; gap:8px; }
        .rt-ai-hdr-title { font-size:13px; font-weight:700; color:white; }
        .rt-ai-badge { background:rgba(255,255,255,.2); color:white; padding:2px 8px; border-radius:100px; font-size:10px; font-weight:700; text-transform:uppercase; }
        .rt-ai-body { padding:20px; }
        .rt-ai-brief { background:rgba(255,255,255,.03); border:1px solid var(--rt-border); border-radius:10px; padding:14px 16px; margin-bottom:16px; }
        .rt-ai-brief-lbl { font-size:11px; font-weight:600; color:var(--rt-light); text-transform:uppercase; letter-spacing:.06em; margin-bottom:8px; }
        .rt-ai-brief-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .rt-ai-brief-item { font-size:13px; color:var(--rt-mid); }
        .rt-ai-brief-item span { color:var(--rt-light); }
        .rt-ai-seq-lbl { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--rt-light); margin-bottom:10px; }
        .rt-ai-seq { display:flex; flex-direction:column; gap:8px; }
        .rt-ai-card { background:rgba(255,255,255,.03); border:1px solid var(--rt-border); border-radius:10px; padding:12px 16px; display:flex; align-items:center; gap:12px; transition:border-color .15s; }
        .rt-ai-card:hover { border-color:var(--rt-indigo); }
        .rt-ai-num { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; flex-shrink:0; font-family:'Bricolage Grotesque',sans-serif; }
        .n1{background:var(--rt-indigo-light);color:var(--rt-indigo)} .n2{background:rgba(59,130,246,.15);color:#60A5FA} .n3{background:rgba(16,185,129,.12);color:var(--rt-green)} .n4{background:rgba(251,191,36,.12);color:#FBBF24} .n5{background:rgba(239,68,68,.12);color:#F87171}
        .rt-ai-info { flex:1; }
        .rt-ai-type { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--rt-light); margin-bottom:2px; }
        .rt-ai-subj { font-size:13px; font-weight:600; color:var(--rt-text); letter-spacing:-.01em; }
        .rt-ai-write-btn { background:var(--rt-indigo); color:white; padding:5px 12px; border-radius:6px; font-size:11px; font-weight:700; white-space:nowrap; }

        /* Testimonials */
        .rt-testi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .rt-testi-card { background:var(--rt-card); border:1px solid var(--rt-border); border-radius:var(--rt-r); padding:28px; display:flex; flex-direction:column; }
        .rt-stars { color:#F59E0B; font-size:14px; letter-spacing:1px; margin-bottom:14px; }
        .rt-quote { font-size:15px; color:#D1D5DB; line-height:1.65; flex:1; margin-bottom:20px; font-style:italic; }
        .rt-quote strong { font-style:normal; color:var(--rt-green); }
        .rt-testi-author { display:flex; align-items:center; gap:12px; padding-top:16px; border-top:1px solid var(--rt-border); }
        .rt-avatar { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800; flex-shrink:0; font-family:'Bricolage Grotesque',sans-serif; }
        .av-g{background:rgba(16,185,129,.15);color:var(--rt-green)} .av-i{background:var(--rt-indigo-light);color:var(--rt-indigo)} .av-a{background:rgba(251,191,36,.15);color:#FBBF24}
        .rt-author-name { font-size:14px; font-weight:700; color:var(--rt-text); letter-spacing:-.01em; }
        .rt-author-title { font-size:12px; color:var(--rt-light); }

        /* CTA */
        .rt-cta-section { background:var(--rt-darker); padding:100px 5%; text-align:center; position:relative; overflow:hidden; }
        .rt-cta-section::before { content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:800px; height:400px; background:radial-gradient(ellipse,rgba(16,185,129,.12) 0%,transparent 60%); pointer-events:none; }
        .rt-cta-section h2 { font-size:clamp(36px,5vw,64px); font-weight:800; color:white; max-width:740px; margin:0 auto 20px; letter-spacing:-.04em; }
        .rt-cta-section p { font-size:18px; color:rgba(255,255,255,.5); max-width:480px; margin:0 auto 44px; }
        .rt-cta-acts { display:flex; align-items:center; justify-content:center; gap:16px; flex-wrap:wrap; }
        .rt-cta-note { margin-top:20px; font-size:13px; color:rgba(255,255,255,.25); }

        /* Footer */
        footer.rt-footer { background:#060D18; padding:60px 5% 40px; border-top:1px solid rgba(255,255,255,.04); }
        .rt-footer-top { max-width:1120px; margin:0 auto; display:grid; grid-template-columns:240px 1fr 1fr 1fr; gap:60px; margin-bottom:48px; }
        .rt-footer-brand p { font-size:14px; color:rgba(255,255,255,.35); margin-top:12px; line-height:1.65; }
        .rt-footer-col h4 { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:rgba(255,255,255,.25); margin-bottom:16px; }
        .rt-footer-col a { display:block; font-size:14px; color:rgba(255,255,255,.4); text-decoration:none; margin-bottom:10px; transition:color .15s; }
        .rt-footer-col a:hover { color:rgba(255,255,255,.8); }
        .rt-footer-bot { max-width:1120px; margin:0 auto; border-top:1px solid rgba(255,255,255,.04); padding-top:24px; display:flex; justify-content:space-between; align-items:center; font-size:13px; color:rgba(255,255,255,.2); }
        .rt-fdot { color:var(--rt-green); }

        /* Responsive */
        @media(max-width:900px){
          .rt-stats-grid{grid-template-columns:repeat(2,1fr)}
          .rt-pain-grid,.rt-sol-grid,.rt-feat-grid,.rt-testi-grid{grid-template-columns:1fr}
          .rt-rev-inner,.rt-ai-inner{grid-template-columns:1fr;gap:40px}
          .rt-db-inner{grid-template-columns:1fr}
          .rt-db-sidebar{display:none}
          .rt-footer-top{grid-template-columns:1fr 1fr}
          .rt-nav-links{display:none}
        }
        @media(max-width:560px){
          .rt-stats-grid,.rt-footer-top{grid-template-columns:1fr}
          .rt-db-stats{grid-template-columns:1fr 1fr}
        }
      `}</style>

      <div className="rt-page">
        {/* NAV */}
        <nav className="rt-nav">
          <a href="/" className="rt-logo"><div className="rt-logo-mark">R</div>RevTray</a>
          <ul className="rt-nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#revenue">Revenue</a></li>
            <li><a href="#ai">AI Tools</a></li>
            <li><Link href="/auth/login" className="rt-nav-cta">Start Free →</Link></li>
          </ul>
        </nav>

        {/* HERO */}
        <section className="rt-hero">
          <div className="rt-badge"><div className="rt-pulse" style={{width:7,height:7,background:'#10B981',borderRadius:'50%'}} />Built for Whop Creators</div>
          <h1>Know exactly which<br/>emails make you <span className="rt-hl">money</span>.</h1>
          <p className="rt-hero-sub">RevTray is the only email platform that connects your campaigns directly to Whop revenue — so you know which emails convert and which ones waste your time.</p>
          <div className="rt-hero-actions">
            <Link href="/auth/login" className="rt-btn-primary">
              Start for free
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <a href="#revenue" className="rt-btn-secondary">See how it works</a>
          </div>
          <p className="rt-hero-note">Trusted by 400+ Whop creators · Free to start · No credit card required</p>
        </section>

        {/* MOCK DASHBOARD */}
        <div className="rt-dash-wrap">
          <div className="rt-dash-outer rt-fade">
            <div className="rt-dash-glow" />
            <div className="rt-dash-frame">
              <div className="rt-db-titlebar">
                <div className="rt-dot rt-dr"/><div className="rt-dot rt-dy"/><div className="rt-dot rt-dg"/>
                <div className="rt-db-url">app.revtray.com/dashboard</div>
              </div>
              <div className="rt-db-inner">
                <div className="rt-db-sidebar">
                  <div className="rt-db-logo"><div className="rt-db-logo-icon">R</div>RevTray</div>
                  <div className="rt-db-nav">Dashboard</div>
                  <div className="rt-db-nav rt-active">Campaigns</div>
                  <div className="rt-db-nav">Contacts</div>
                  <div className="rt-db-nav">Revenue</div>
                  <div className="rt-db-nav">Automations</div>
                </div>
                <div className="rt-db-main">
                  <div className="rt-db-head"><div className="rt-db-title">Campaigns</div><div className="rt-db-btn">+ New Campaign</div></div>
                  <div className="rt-db-stats">
                    <div className="rt-db-stat"><div className="rt-db-lbl">Revenue attributed</div><div className="rt-db-val g" id="rt-hc">$0</div><div className="rt-db-delta">↑ $3,240 this week</div></div>
                    <div className="rt-db-stat"><div className="rt-db-lbl">Total sent</div><div className="rt-db-val">48,291</div><div className="rt-db-delta" style={{color:'rgba(255,255,255,.25)'}}>5 campaigns</div></div>
                    <div className="rt-db-stat"><div className="rt-db-lbl">Avg open rate</div><div className="rt-db-val">34.2%</div><div className="rt-db-delta">↑ 4.1% vs last</div></div>
                  </div>
                  <div className="rt-db-th"><div>Campaign</div><div>Status</div><div>Opens</div><div>Revenue</div><div>Per email</div></div>
                  <div className="rt-db-row"><div><div className="rt-cn">Real Estate Masterclass Launch</div><div className="rt-cs">Sent Dec 12 · 12,430 recipients</div></div><div><span className="rt-b-sent">Sent</span></div><div>38.4%</div><div className="rt-rev-cell">$18,240</div><div style={{color:'rgba(255,255,255,.3)',fontSize:12}}>$1.47</div></div>
                  <div className="rt-db-row"><div><div className="rt-cn">5-day deal closing sequence</div><div className="rt-cs">Sent Dec 8 · 10,891 recipients</div></div><div><span className="rt-b-sent">Sent</span></div><div>42.1%</div><div className="rt-rev-cell">$11,700</div><div style={{color:'rgba(255,255,255,.3)',fontSize:12}}>$1.07</div></div>
                  <div className="rt-db-row"><div><div className="rt-cn">Flash sale — 48hrs only</div><div className="rt-cs">Sent Dec 4 · 8,200 recipients</div></div><div><span className="rt-b-sent">Sent</span></div><div>29.8%</div><div className="rt-rev-cell">$9,340</div><div style={{color:'rgba(255,255,255,.3)',fontSize:12}}>$1.14</div></div>
                  <div className="rt-db-row"><div><div className="rt-cn">January launch — case study</div><div className="rt-cs">Draft · Ready to send</div></div><div><span className="rt-b-draft">Draft</span></div><div style={{color:'rgba(255,255,255,.2)'}}>—</div><div style={{color:'rgba(255,255,255,.2)'}}>—</div><div style={{color:'rgba(255,255,255,.2)',fontSize:12}}>—</div></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STATS BAR */}
        <div className="rt-stats-bar">
          <div className="rt-stats-grid rt-container">
            <div className="rt-fade"><div className="rt-sn"><span className="g">$2.4M</span></div><div className="rt-sl">Revenue attributed to date</div></div>
            <div className="rt-fade rt-s1"><div className="rt-sn">400+</div><div className="rt-sl">Whop creators using RevTray</div></div>
            <div className="rt-fade rt-s2"><div className="rt-sn">34%</div><div className="rt-sl">Average email open rate</div></div>
            <div className="rt-fade rt-s3"><div className="rt-sn"><span className="g">5x</span></div><div className="rt-sl">ROI vs traditional email tools</div></div>
          </div>
        </div>

        {/* PROBLEM */}
        <section className="rt-section" id="features" style={{background:'#0A0E1A'}}>
          <div className="rt-container">
            <div className="rt-fade"><div className="rt-eyebrow">The Problem</div><h2 className="rt-h2">You're sending emails into the dark.</h2><p className="rt-sub">Every other email tool shows you open rates and click rates. But none of them can tell you what actually matters — how much money your emails made.</p></div>
            <div className="rt-pain-grid">
              <div className="rt-pain-card rt-fade rt-s1"><span className="rt-pain-icon">📊</span><h3>Open rates don't pay bills</h3><p>A 40% open rate sounds great, but if those opens aren't converting to sales, it's a vanity metric. You need to see revenue, not reads.</p></div>
              <div className="rt-pain-card rt-fade rt-s2"><span className="rt-pain-icon">🔌</span><h3>Your tools don't talk to Whop</h3><p>Mailchimp and ConvertKit have no idea your audience is on Whop. You're manually exporting CSVs, losing data, and breaking your workflow every week.</p></div>
              <div className="rt-pain-card rt-fade rt-s3"><span className="rt-pain-icon">🎲</span><h3>Guessing what to send next</h3><p>Without knowing which content generates sales, you're guessing every time. You could be sending the wrong emails to the wrong people and never know it.</p></div>
            </div>
          </div>
        </section>

        {/* SOLUTION */}
        <section className="rt-sol-section">
          <div className="rt-container">
            <div className="rt-fade"><div className="rt-eyebrow">The Solution</div><h2 className="rt-h2" style={{color:'white'}}>Email marketing connected to your Whop business.</h2><p className="rt-sub" style={{color:'rgba(255,255,255,.55)'}}>RevTray syncs your Whop audience automatically and tracks every dollar your emails generate — so you can send with confidence.</p></div>
            <div className="rt-sol-grid">
              <div className="rt-sol-card rt-fade rt-s1"><div className="rt-sol-icon rt-ig">💰</div><h3>Revenue attribution</h3><p>See exactly how much money each campaign generated. When a subscriber buys after clicking your email, that sale is attributed to your campaign automatically.</p></div>
              <div className="rt-sol-card rt-fade rt-s2"><div className="rt-sol-icon rt-ii">✦</div><h3>AI campaign builder</h3><p>Describe your product and goal once. The AI generates a complete 5-email launch sequence using the Story → Value → Proof → Offer → Urgency framework.</p></div>
              <div className="rt-sol-card rt-fade rt-s3"><div className="rt-sol-icon rt-ia">⚡</div><h3>Whop native sync</h3><p>Connect once and your entire Whop member list syncs automatically. New members, cancellations — all handled without any CSV exports.</p></div>
              <div className="rt-sol-card rt-fade rt-s4"><div className="rt-sol-icon rt-ir">📬</div><h3>Smart segmentation</h3><p>Target buyers vs. free members, people who opened last 30 days, high-value subscribers — then send campaigns that are actually relevant to each group.</p></div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="rt-section" id="revenue" style={{background:'#0A0E1A'}}>
          <div className="rt-container">
            <div className="rt-fade" style={{maxWidth:600,marginBottom:56}}><div className="rt-eyebrow">Features</div><h2 className="rt-h2">Everything you need to grow revenue through email.</h2></div>
            <div className="rt-feat-grid">
              <div className="rt-feat-card rt-fade rt-s1"><div className="rt-feat-tag g">Core</div><h3>Campaign builder</h3><p>Visual editor or HTML. Live inbox preview with mobile/desktop toggle shows you exactly what subscribers will see before you send.</p></div>
              <div className="rt-feat-card rt-fade rt-s2"><div className="rt-feat-tag g">Core</div><h3>A/B subject testing</h3><p>Test two subject lines on a 50/50 split. See which version drives more opens and revenue — not just clicks.</p></div>
              <div className="rt-feat-card rt-fade rt-s3"><div className="rt-feat-tag">AI</div><h3>Subject line optimizer</h3><p>Paste your subject line. The AI scores it 1-10, explains what's weak, and gives you 3 better alternatives with conversion reasoning.</p></div>
              <div className="rt-feat-card rt-fade rt-s4"><div className="rt-feat-tag">AI</div><h3>Copy reviewer</h3><p>AI reads your email paragraph by paragraph and shows Before/After rewrites focused on benefits, not features, and stronger CTAs.</p></div>
              <div className="rt-feat-card rt-fade rt-s5"><div className="rt-feat-tag g">Core</div><h3>Automation sequences</h3><p>Welcome new members automatically. Build multi-step sequences triggered by joins, purchases, or custom events.</p></div>
              <div className="rt-feat-card rt-fade rt-s1"><div className="rt-feat-tag">Power</div><h3>Deliverability tools</h3><p>Spam score analysis, domain authentication checker, and sending warmup schedules so your emails actually reach the inbox.</p></div>
            </div>
          </div>
        </section>

        {/* REVENUE */}
        <section className="rt-rev-section">
          <div className="rt-rev-inner">
            <div className="rt-fade">
              <div className="rt-eyebrow">Revenue Attribution</div>
              <h2 className="rt-h2">See which emails make money. Stop guessing.</h2>
              <p className="rt-sub">RevTray connects to your Whop store via webhook. Every time a subscriber makes a purchase within 7 days of clicking your email, the revenue is attributed to that campaign.</p>
              <div className="rt-rev-steps">
                <div className="rt-rev-step"><div className="rt-step-num">1</div><div className="rt-step-text"><h4>Subscriber clicks your email link</h4><p>Every link in your campaigns is automatically tracked with a unique identifier per subscriber.</p></div></div>
                <div className="rt-rev-step"><div className="rt-step-num">2</div><div className="rt-step-text"><h4>They purchase on Whop within 7 days</h4><p>Whop fires a webhook to RevTray with the purchase details including amount and email address.</p></div></div>
                <div className="rt-rev-step"><div className="rt-step-num">3</div><div className="rt-step-text"><h4>Revenue is attributed automatically</h4><p>RevTray matches the purchase to the last email clicked and adds it to your campaign revenue total instantly.</p></div></div>
              </div>
            </div>
            <div className="rt-rev-widget rt-fade rt-s2 rt-rev-widget">
              <div className="rt-rw-lbl">Total revenue from email</div>
              <div className="rt-rw-num" id="rt-rc">$0</div>
              <div className="rt-rw-delta">this month · <span>↑ 28% vs last month</span></div>
              <div className="rt-rw-bar-hdr"><span>Top campaigns by revenue</span><span>Revenue</span></div>
              <div className="rt-rw-bars">
                {[['Masterclass launch email','92','$18.2k'],['5-day deal sequence','64','$11.7k'],['Flash sale — 48hrs','51','$9.3k'],['New member welcome','38','$7.1k'],['Community upsell','19','$3.5k']].map(([name,w,val]) => (
                  <div className="rt-rw-bar-row" key={name}>
                    <div className="rt-rw-bar-name">{name}</div>
                    <div className="rt-rw-bar-track"><div className="rt-rw-bar-fill" data-width={w} style={{width:0}} /></div>
                    <div className="rt-rw-bar-val">{val}</div>
                  </div>
                ))}
              </div>
              <div style={{borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{fontSize:12,color:'rgba(255,255,255,.3)'}}>Last purchase: 4 minutes ago</div>
                <div style={{background:'rgba(16,185,129,.12)',color:'#4ADE80',padding:'4px 12px',borderRadius:100,fontSize:12,fontWeight:700}}>Live</div>
              </div>
            </div>
          </div>
        </section>

        {/* AI SECTION */}
        <section className="rt-section" id="ai" style={{background:'#0D1625'}}>
          <div className="rt-ai-inner">
            <div className="rt-ai-visual rt-fade">
              <div className="rt-ai-hdr">
                <span style={{color:'white',fontSize:14}}>✦</span>
                <div className="rt-ai-hdr-title">AI Sequence Builder</div>
                <div className="rt-ai-badge">Beta</div>
              </div>
              <div className="rt-ai-body">
                <div className="rt-ai-brief">
                  <div className="rt-ai-brief-lbl">Campaign brief</div>
                  <div className="rt-ai-brief-grid">
                    <div className="rt-ai-brief-item"><span>Product:</span> Real estate course</div>
                    <div className="rt-ai-brief-item"><span>Audience:</span> Beginner investors</div>
                    <div className="rt-ai-brief-item"><span>Goal:</span> Sell the course</div>
                    <div className="rt-ai-brief-item"><span>Tone:</span> Casual</div>
                  </div>
                </div>
                <div className="rt-ai-seq-lbl">Generated sequence · Story → Value → Proof → Offer → Urgency</div>
                <div className="rt-ai-seq">
                  {[['n1','Story / Hook','My first wholesale deal made $12k with $0 down'],['n2','Value lesson','The 3-step system beginners use to find their first deal'],['n3','Social proof','How Marcus closed his first deal in 31 days'],['n4','Offer','Doors open: Real Estate Wholesaling Masterclass'],['n5','Urgency','Last chance — enrollment closes tonight at midnight']].map(([cls,type,subj],i) => (
                    <div className="rt-ai-card" key={i}>
                      <div className={`rt-ai-num ${cls}`}>{i+1}</div>
                      <div className="rt-ai-info"><div className="rt-ai-type">{type}</div><div className="rt-ai-subj">{subj}</div></div>
                      <div className="rt-ai-write-btn">Write ✦</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rt-fade rt-s2">
              <div className="rt-eyebrow">AI Tools</div>
              <h2 className="rt-h2">A strategist, not just a text generator.</h2>
              <p className="rt-sub">RevTray's AI is trained on proven email marketing frameworks — it generates campaigns that follow real launch strategies, not generic content.</p>
              <div style={{display:'flex',flexDirection:'column',gap:20,marginTop:36}}>
                {[['✦','rgba(16,185,129,.12)','One-click full drafts','Click "Write" on any email in your sequence — the AI generates a complete draft using your campaign brief. No blank pages.'],['📈','rgba(99,102,241,.15)','Engagement predictor','Before you send, the AI estimates your open rate, click rate, and conversion range vs. industry benchmarks — plus one quick fix to improve it.'],['🎯','rgba(251,191,36,.12)','Proven launch frameworks','Story → Value → Proof → Offer → Urgency. Every sequence follows frameworks that have generated millions for creators.']].map(([icon,bg,title,desc]) => (
                  <div key={title as string} style={{display:'flex',gap:14,alignItems:'flex-start'}}>
                    <div style={{width:36,height:36,borderRadius:9,background:bg as string,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:16}}>{icon}</div>
                    <div><div style={{fontSize:15,fontWeight:700,color:' #E2E8F0',marginBottom:4,letterSpacing:'-.02em'}}>{title as string}</div><div style={{fontSize:14,color:'#9CA3AF',lineHeight:1.6}}>{desc as string}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="rt-section" style={{background:'#0A0E1A',borderTop:'1px solid #1F2937'}}>
          <div className="rt-container">
            <div className="rt-fade" style={{textAlign:'center',marginBottom:56}}><div className="rt-eyebrow" style={{textAlign:'center'}}>From Creators</div><h2 className="rt-h2" style={{margin:'0 auto',textAlign:'center',maxWidth:600}}>What RevTray creators are saying</h2></div>
            <div className="rt-testi-grid">
              <div className="rt-testi-card rt-fade rt-s1"><div className="rt-stars">★★★★★</div><p className="rt-quote">"I sent one campaign and could immediately see <strong>$4,200 attributed to that email</strong>. I've never had that visibility before."</p><div className="rt-testi-author"><div className="rt-avatar av-g">JM</div><div><div className="rt-author-name">Jordan M.</div><div className="rt-author-title">Real estate educator · 3,200 members</div></div></div></div>
              <div className="rt-testi-card rt-fade rt-s2"><div className="rt-stars">★★★★★</div><p className="rt-quote">"The AI sequence builder is insane. I described my course in 3 sentences and got a <strong>complete 5-email launch plan</strong> with subject lines that sounded like me."</p><div className="rt-testi-author"><div className="rt-avatar av-i">TC</div><div><div className="rt-author-name">Taylor C.</div><div className="rt-author-title">Fitness coach · 1,800 members</div></div></div></div>
              <div className="rt-testi-card rt-fade rt-s3"><div className="rt-stars">★★★★★</div><p className="rt-quote">"Finally an email tool that syncs with Whop automatically. My whole audience was ready to email <strong>in under 5 minutes</strong>."</p><div className="rt-testi-author"><div className="rt-avatar av-a">RB</div><div><div className="rt-author-name">Ryan B.</div><div className="rt-author-title">Stock trader · 5,100 members</div></div></div></div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="rt-cta-section">
          <div className="rt-container">
            <h2 className="rt-fade">Start knowing which<br/>emails make you money.</h2>
            <p className="rt-fade rt-s1">Connect your Whop store, import your audience, and send your first revenue-attributed campaign — free.</p>
            <div className="rt-cta-acts rt-fade rt-s2">
              <Link href="/auth/login" className="rt-btn-green">Create free account <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></Link>
              <a href="#features" className="rt-btn-ghost">Learn more</a>
            </div>
            <p className="rt-cta-note rt-fade rt-s3">Free to start · Connects to Whop in minutes · No credit card required</p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="rt-footer">
          <div className="rt-footer-top">
            <div className="rt-footer-brand">
              <div className="rt-logo"><div className="rt-logo-mark">R</div>RevTray</div>
              <p>Email marketing built for Whop creators. Send smarter. Earn more.</p>
            </div>
            <div className="rt-footer-col"><h4>Product</h4><a href="#">Campaigns</a><a href="#">AI Tools</a><a href="#">Revenue Analytics</a><a href="#">Automations</a></div>
            <div className="rt-footer-col"><h4>Resources</h4><a href="#">Documentation</a><a href="#">API Reference</a><a href="#">Templates</a><a href="#">Blog</a></div>
            <div className="rt-footer-col"><h4>Company</h4><a href="#">About</a><a href="#">Pricing</a><a href="#">Privacy Policy</a><a href="#">Terms of Service</a></div>
          </div>
          <div className="rt-footer-bot">
            <div>© 2025 RevTray. All rights reserved.</div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>Built for Whop creators <span className="rt-fdot">•</span> Revenue-first email marketing</div>
          </div>
        </footer>
      </div>
    </>
  );
}
