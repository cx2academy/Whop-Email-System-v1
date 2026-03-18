/**
 * app/page.tsx
 * RevTray landing page — production build.
 */

'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  useEffect(() => {

    // Nav scroll
    const nav = document.getElementById('nav');
    let ticking = false;
    const onScroll = () => {
      if (!nav) return;
      if (window.scrollY > 32) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
      ticking = false;
    };
    const handleScroll = () => {
      if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Scroll reveal
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));

    // Bar fill animation
    const barObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.querySelectorAll<HTMLElement>('.rcb-fill[data-w]').forEach((b: HTMLElement) => {
            setTimeout(() => { b.style.width = (b.dataset.w ?? '0') + '%'; }, 180);
          });
          barObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    const revCard = document.querySelector('.rev-card');
    if (revCard) barObs.observe(revCard);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      revealObs.disconnect();
      barObs.disconnect();
    };
  }, []);

  return (
    <>
      <style>{`

/* ─────────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────────── */
:root {
  --ink:        #09090B;
  --ink-mid:    #52525B;
  --ink-faint:  #71717A;
  --ink-ghost:  #A1A1AA;
  --surface:    #FAFAF9;
  --white:      #ffffff;
  --border:     #E4E4E7;
  --border-light: #F4F4F5;

  --green:      #16A34A;
  --green-bright: #22C55E;
  --green-glow: rgba(34,197,94,.28);

  --dark:       #09090B;
  --dark-2:     #0C1828;
  --dark-3:     #090F1C;
  --dark-4:     #0F1825;

  --font-display: 'Bricolage Grotesque', system-ui, sans-serif;
  --font-body:    'DM Sans', system-ui, sans-serif;

  --sp-1: 8px;   --sp-2: 16px;  --sp-3: 24px;
  --sp-4: 32px;  --sp-5: 48px;  --sp-6: 64px;
  --sp-7: 80px;  --sp-8: 96px;

  --r-sm: 8px;  --r-md: 12px;  --r-lg: 16px;
}

/* ─────────────────────────────────────────────────────────────
   RESET + BASE
───────────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--font-body);
  background: var(--surface);
  color: var(--ink);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overflow-x: hidden;
}
h1, h2, h3 { font-family: var(--font-display); letter-spacing: -0.035em; line-height: 1.08; }
img { display: block; max-width: 100%; }

/* ─────────────────────────────────────────────────────────────
   NAV
───────────────────────────────────────────────────────────── */
#nav {
  position: fixed; top: 0; left: 0; right: 0; z-index: 100;
  height: 60px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 6%;
  background: transparent;
  transition: background 0.35s ease, border-color 0.35s ease,
              box-shadow 0.35s ease, backdrop-filter 0.35s ease;
  border-bottom: 1px solid transparent;
}
#nav.scrolled {
  background: rgba(250,250,249,0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-color: var(--border);
  box-shadow: 0 1px 0 rgba(0,0,0,0.04);
}
.nav-logo {
  display: flex; align-items: center; gap: 9px;
  font-family: var(--font-display);
  font-size: 18px; font-weight: 800; letter-spacing: -0.04em;
  text-decoration: none;
  color: #fff;
  transition: color 0.3s, opacity 0.15s;
}
.nav-logo:hover { opacity: 0.85; }
#nav.scrolled .nav-logo { color: var(--ink); }
/* nav-mark replaced by inline SVG logo */'
/* On dark bg: SVG is visible as-is. On light nav: adjust opacity slightly */
#nav.scrolled .nav-logo svg { opacity: 0.92; }
.nav-links { display: flex; gap: 28px; list-style: none; }
.nav-links a {
  font-size: 13px; font-weight: 500; text-decoration: none;
  transition: color 0.2s;
}
#nav:not(.scrolled) .nav-links a { color: rgba(255,255,255,.5); }
#nav:not(.scrolled) .nav-links a:hover { color: #fff; }
#nav.scrolled .nav-links a { color: var(--ink-faint); }
#nav.scrolled .nav-links a:hover { color: var(--ink); }
.nav-cta {
  padding: 7px 17px; border-radius: 7px;
  font-size: 13px; font-weight: 600; text-decoration: none;
  transition: all 0.2s;
}
#nav:not(.scrolled) .nav-cta { background: rgba(255,255,255,.1); color: #fff; border: 1px solid rgba(255,255,255,.15); }
#nav:not(.scrolled) .nav-cta:hover { background: rgba(255,255,255,.18); }
#nav.scrolled .nav-cta { background: var(--ink); color: #fff; }
#nav.scrolled .nav-cta:hover { background: #18181B; transform: translateY(-1px); }

/* ─────────────────────────────────────────────────────────────
   HERO
───────────────────────────────────────────────────────────── */
.hero {
  background: var(--dark);
  padding: 140px 6% 80px;
  position: relative; overflow: visible;
  display: flex; flex-direction: column; align-items: center;
}
/* Radial glow */
.hero-glow {
  position: absolute; top: -140px; left: 50%; transform: translateX(-50%);
  width: 960px; height: 720px;
  background: radial-gradient(ellipse 52% 44% at 50% 0%, rgba(34,197,94,.13) 0%, transparent 70%);
  pointer-events: none;
}
/* Subtle grid */
.hero-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,.016) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.016) 1px, transparent 1px);
  background-size: 72px 72px;
  pointer-events: none;
  mask-image: radial-gradient(ellipse 75% 55% at 50% 0%, black 0%, transparent 80%);
}
/* hero-ombre removed — external .ombre div handles transition */

/* Hero text block */
.hero-body {
  position: relative; z-index: 2;
  text-align: center; max-width: 860px; margin: 0 auto;
}
/* Entrance animations */
.hero-body > * { opacity: 0; transform: translateY(18px); animation: fade-up 0.65s ease forwards; }
.hero-tag   { animation-delay: 0.05s; }
.hero-h1    { animation-delay: 0.18s; }
.hero-sub   { animation-delay: 0.30s; }
.hero-ctas  { animation-delay: 0.40s; }
.hero-note  { animation-delay: 0.48s; }
@keyframes fade-up {
  to { opacity: 1; transform: translateY(0); }
}

.hero-tag {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 12px; font-weight: 600; color: rgba(255,255,255,.48);
  margin-bottom: 28px; letter-spacing: 0.01em;
}
.tag-dot {
  width: 5px; height: 5px; background: var(--green-bright);
  border-radius: 50%;
  animation: tag-pulse 2.2s cubic-bezier(.4,0,.6,1) infinite;
}
@keyframes tag-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(1.6)} }

.hero-h1 {
  font-size: clamp(48px, 6vw, 84px);
  font-weight: 800; color: #fff; line-height: 1.01;
  letter-spacing: -0.05em; margin-bottom: 22px;
}
.hero-h1 mark {
  background: none; padding: 0;
  color: var(--green-bright);
  position: relative; display: inline-block;
}
.hero-h1 mark::after {
  content: '';
  display: block; position: absolute;
  bottom: -3px; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, var(--green-bright) 0%, transparent 80%);
  border-radius: 2px; opacity: 0.5;
}
.hero-sub {
  font-size: clamp(16px, 1.7vw, 18px); color: rgba(255,255,255,.44);
  line-height: 1.7; max-width: 480px; margin: 0 auto 36px;
}
.hero-ctas {
  display: flex; justify-content: center; gap: 10px;
  margin-bottom: 18px; flex-wrap: wrap;
}
.btn-primary {
  background: var(--green-bright); color: #fff;
  padding: 13px 26px; border-radius: 10px;
  font-size: 14px; font-weight: 700; text-decoration: none;
  display: inline-flex; align-items: center; gap: 7px;
  box-shadow: 0 4px 18px var(--green-glow);
  transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
  border: 1px solid transparent;
}
.btn-primary:hover {
  background: var(--green); transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(34,197,94,.38);
}
.btn-primary:active { transform: scale(0.98); }
.btn-ghost {
  background: transparent; color: rgba(255,255,255,.58);
  padding: 13px 22px; border-radius: 10px;
  font-size: 14px; font-weight: 500; text-decoration: none;
  border: 1px solid rgba(255,255,255,.12);
  transition: border-color 0.15s, color 0.15s, transform 0.15s;
}
.btn-ghost:hover { border-color: rgba(255,255,255,.3); color: #fff; transform: translateY(-1px); }
.hero-note { font-size: 12px; color: rgba(255,255,255,.22); margin-bottom: var(--sp-5); }

/* ─────────────────────────────────────────────────────────────
   DASHBOARD MOCK
───────────────────────────────────────────────────────────── */
.hero-db {
  width: 100%; max-width: 980px; margin: 0 auto;
  position: relative; z-index: 2;
  opacity: 0; transform: translateY(24px);
  animation: fade-up 0.8s ease 0.55s forwards;
}
/* Subtle glow behind dashboard */
.hero-db::before {
  content: '';
  position: absolute; bottom: -40px; left: 10%; right: 10%; height: 80px;
  background: radial-gradient(ellipse, rgba(34,197,94,.18) 0%, transparent 70%);
  filter: blur(16px); pointer-events: none; z-index: -1;
}
.db-chrome {
  background: var(--dark-4); border-radius: 13px 13px 0 0;
  padding: 11px 16px;
  display: flex; align-items: center; gap: 7px;
  border: 1px solid rgba(255,255,255,.08); border-bottom: none;
}
.dc-dots { display: flex; gap: 6px; }
.dc-dot { width: 10px; height: 10px; border-radius: 50%; }
.dc-url {
  flex: 1; background: rgba(255,255,255,.04);
  height: 22px; border-radius: 5px; margin: 0 16px;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; color: rgba(255,255,255,.2);
  border: 1px solid rgba(255,255,255,.05);
}
.db-shell {
  border: 1px solid rgba(255,255,255,.07); border-top: none;
  border-radius: 0 0 13px 13px; overflow: hidden;
  display: grid; grid-template-columns: 172px 1fr;
  min-height: 420px;
}

/* Sidebar */
.db-side {
  background: var(--dark-3);
  border-right: 1px solid rgba(255,255,255,.05);
  display: flex; flex-direction: column;
}
.dbs-logo {
  padding: 13px 14px 14px;
  display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid rgba(255,255,255,.04);
}
/* dbs-mark replaced by inline SVG */
.dbs-name {
  font-family: var(--font-display); font-size: 13px;
  font-weight: 800; color: #fff; letter-spacing: -0.03em;
}
.dbs-items { padding: 8px 0; flex: 1; }
.dbs-item {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 14px; font-size: 11.5px;
  color: rgba(255,255,255,.32);
  cursor: pointer; transition: all 0.12s;
  position: relative; user-select: none;
}
.dbs-item svg { width: 13px; height: 13px; flex-shrink: 0; }
.dbs-item:hover { color: rgba(255,255,255,.62); background: rgba(255,255,255,.03); }
.dbs-item.active {
  color: #4ADE80; background: rgba(34,197,94,.08); font-weight: 500;
}
.dbs-item.active::after {
  content: ''; position: absolute; right: 0; top: 5px; bottom: 5px;
  width: 2px; background: var(--green-bright); border-radius: 1px 0 0 1px;
  box-shadow: -3px 0 10px rgba(34,197,94,.3);
}

/* Main panel */
.db-main {
  background: var(--dark-2);
  padding: 18px;
  display: flex; flex-direction: column; gap: 12px;
}
.dbm-top {
  display: flex; align-items: center; justify-content: space-between;
}
.dbm-title {
  font-family: var(--font-display); font-size: 15px;
  font-weight: 700; color: #fff; letter-spacing: -0.025em;
}
.dbm-btn {
  background: var(--green-bright); color: #fff;
  padding: 6px 13px; border-radius: 7px;
  font-size: 10px; font-weight: 600;
  cursor: pointer; border: none;
  font-family: var(--font-body);
  display: flex; align-items: center; gap: 4px;
  transition: background 0.12s;
}
.dbm-btn:hover { background: var(--green); }

/* KPIs */
.dbm-kpis { display: grid; grid-template-columns: repeat(3,1fr); gap: 9px; }
.kpi {
  background: rgba(255,255,255,.035);
  border: 1px solid rgba(255,255,255,.06);
  border-radius: 8px; padding: 10px 12px;
  transition: border-color 0.15s, background 0.15s;
  cursor: default;
}
.kpi:hover { border-color: rgba(255,255,255,.1); background: rgba(255,255,255,.048); }
.kpi-lbl {
  font-size: 9px; color: rgba(255,255,255,.28);
  text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px;
}
.kpi-val {
  font-family: var(--font-display); font-size: 21px;
  font-weight: 700; color: #fff; letter-spacing: -0.03em; line-height: 1;
}
.kpi-val.green { color: #4ADE80; }
.kpi-delta { font-size: 9px; color: #4ADE80; margin-top: 3px; }
.kpi-delta.muted { color: rgba(255,255,255,.2); }

/* Table */
.dbm-tbl {
  background: rgba(0,0,0,.16); border-radius: 8px;
  overflow: hidden; border: 1px solid rgba(255,255,255,.05);
}
.tbl-cols { grid-template-columns: 1fr 62px 60px 74px 56px; }
.tbl-head {
  display: grid; padding: 7px 12px;
  font-size: 9px; color: rgba(255,255,255,.2);
  font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
  border-bottom: 1px solid rgba(255,255,255,.05);
}
.tbl-row {
  display: grid; padding: 9px 12px;
  font-size: 10px; color: rgba(255,255,255,.58);
  border-bottom: 1px solid rgba(255,255,255,.04);
  align-items: center; cursor: default;
  transition: background 0.1s;
}
.tbl-row:last-child { border-bottom: none; }
.tbl-row:hover { background: rgba(255,255,255,.027); }
.tr-name { color: rgba(255,255,255,.88); font-weight: 500; font-size: 11px; }
.tr-sub  { font-size: 9px; color: rgba(255,255,255,.27); margin-top: 1px; }
.tr-rev  { color: #4ADE80; font-weight: 700; font-family: var(--font-display); font-size: 11px; letter-spacing: -0.02em; }
.tr-rate-high { color: #4ADE80; font-weight: 500; }
.tr-rate-mid  { color: rgba(255,255,255,.55); }
.tr-muted     { color: rgba(255,255,255,.18); }
.badge-sent {
  background: rgba(99,102,241,.16); color: #A5B4FC;
  border-radius: 100px; padding: 2px 8px;
  font-size: 9px; font-weight: 600; display: inline-block;
}
.badge-draft {
  background: rgba(255,255,255,.06); color: rgba(255,255,255,.32);
  border-radius: 100px; padding: 2px 8px;
  font-size: 9px; display: inline-block;
}

/* ─────────────────────────────────────────────────────────────
   OMBRE + STATS
───────────────────────────────────────────────────────────── */
.ombre { height: 120px; background: linear-gradient(to bottom, var(--dark) 0%, var(--surface) 100%); margin-top: -1px; position: relative; z-index: 1; }

.stats {
  background: var(--surface); padding: 48px 6%;
  border-bottom: 1px solid var(--border);
}
.stats-row {
  max-width: 900px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
}
.stat { flex: 1; text-align: center; padding: 8px 0; }
.stat-n {
  font-family: var(--font-display); font-size: 38px; font-weight: 800;
  letter-spacing: -0.04em; color: var(--ink); line-height: 1;
}
.stat-n em { font-style: normal; color: var(--green); }
.stat-lbl { font-size: 13px; color: var(--ink-faint); margin-top: 5px; line-height: 1.4; }
.stat-ctx { font-size: 11px; color: var(--ink-ghost); margin-top: 3px; }
.stat-div { width: 1px; height: 40px; background: var(--border); flex-shrink: 0; }

/* ─────────────────────────────────────────────────────────────
   FEATURES GRID
───────────────────────────────────────────────────────────── */
.features { background: var(--white); padding: var(--sp-8) 6%; }
.feat-max { max-width: 1040px; margin: 0 auto; }
.feat-intro {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: var(--sp-7); margin-bottom: var(--sp-6); align-items: end;
}
.feat-intro h2 {
  font-size: clamp(28px, 3vw, 44px); font-weight: 800;
  color: var(--ink); letter-spacing: -0.04em;
}
.feat-intro p { font-size: 16px; color: var(--ink-mid); line-height: 1.7; }
.feat-grid {
  display: grid; grid-template-columns: repeat(2,1fr);
  gap: 1px; background: var(--border);
  border: 1px solid var(--border); border-radius: var(--r-lg);
  overflow: hidden;
}
.fg-cell {
  background: var(--white); padding: 32px;
  transition: background 0.15s;
  cursor: default;
}
.fg-cell:hover { background: var(--surface); }
.fg-num {
  font-family: var(--font-display); font-size: 11px;
  font-weight: 700; color: var(--ink-ghost);
  margin-bottom: 18px;
  display: flex; align-items: center; gap: 8px;
}
.fg-num::after { content: ''; flex: 1; height: 1px; background: var(--border-light); }
.fg-cell h3 {
  font-family: var(--font-display); font-size: 18px;
  font-weight: 700; color: var(--ink);
  letter-spacing: -0.025em; margin-bottom: 10px;
}
.fg-cell p { font-size: 14px; color: var(--ink-mid); line-height: 1.65; }

/* ─────────────────────────────────────────────────────────────
   DARK FEATURE SECTIONS
───────────────────────────────────────────────────────────── */
.dark-feat {
  background: var(--dark); padding: var(--sp-7) 6%;
  position: relative; overflow: hidden;
}
.dark-feat + .dark-feat { border-top: 1px solid rgba(255,255,255,.06); padding-top: 64px; }
.df-inner {
  max-width: 1040px; margin: 0 auto;
  display: grid; grid-template-columns: 1fr 1fr;
  gap: var(--sp-7); align-items: center;
}
.df-inner.rev { /* normal order */ }
.df-inner.ai  { /* text on right, card on left */ }
/* For AI section: swap column order */
.df-inner.ai .df-text  { order: 2; }
.df-inner.ai .df-visual { order: 1; }

.df-eyebrow {
  font-size: 11px; font-weight: 700; color: var(--green-bright);
  text-transform: uppercase; letter-spacing: .12em; margin-bottom: 14px;
}
.df-h {
  font-size: clamp(26px, 3vw, 42px); font-weight: 800;
  color: #fff; letter-spacing: -0.035em; line-height: 1.08; margin-bottom: 14px;
}
.df-p { font-size: 15px; color: rgba(255,255,255,.44); line-height: 1.7; margin-bottom: 28px; }
.df-points { display: flex; flex-direction: column; gap: 12px; }
.df-point { display: flex; align-items: flex-start; gap: 10px; }
.df-dot {
  width: 6px; height: 6px; background: var(--green-bright);
  border-radius: 50%; margin-top: 6px; flex-shrink: 0;
}
.df-point span { font-size: 14px; color: rgba(255,255,255,.52); line-height: 1.55; }

/* Revenue card */
.rev-card {
  background: rgba(255,255,255,.04);
  border: 1px solid rgba(255,255,255,.08);
  border-radius: var(--r-lg); padding: 26px;
  position: relative; overflow: hidden;
  transition: border-color 0.2s;
}
.rev-card:hover { border-color: rgba(34,197,94,.22); }
.rev-card-glow {
  position: absolute; top: -60px; right: -60px;
  width: 220px; height: 220px;
  background: radial-gradient(circle, rgba(34,197,94,.11) 0%, transparent 65%);
  pointer-events: none;
}
.rc-lbl { font-size: 11px; color: rgba(255,255,255,.28); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 8px; }
.rc-num {
  font-family: var(--font-display); font-size: 52px;
  font-weight: 800; color: #22C55E; letter-spacing: -0.04em;
  line-height: 1; margin-bottom: 4px;
}
.rc-delta { font-size: 12px; color: rgba(255,255,255,.32); margin-bottom: 24px; }
.rc-delta em { font-style: normal; color: #4ADE80; }
.rc-bars-lbl {
  font-size: 9px; color: rgba(255,255,255,.22);
  font-weight: 600; text-transform: uppercase; letter-spacing: .06em;
  display: flex; justify-content: space-between; margin-bottom: 8px;
}
.rc-bars { display: flex; flex-direction: column; gap: 7px; margin-bottom: 18px; }
.rcb { display: flex; align-items: center; gap: 8px; }
.rcb-name { font-size: 10px; color: rgba(255,255,255,.42); width: 112px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rcb-track { flex: 1; height: 4px; background: rgba(255,255,255,.06); border-radius: 100px; overflow: hidden; }
.rcb-fill { height: 100%; background: linear-gradient(90deg, #22C55E, #4ADE80); border-radius: 100px; transition: width 1.4s cubic-bezier(.16,1,.3,1); }
.rcb-val { font-size: 10px; color: #4ADE80; font-weight: 700; width: 36px; text-align: right; flex-shrink: 0; font-family: var(--font-display); }
.rc-footer {
  display: flex; justify-content: space-between; align-items: center;
  border-top: 1px solid rgba(255,255,255,.06); padding-top: 12px;
}
.rc-footer-l { font-size: 10px; color: rgba(255,255,255,.26); }
.live-badge {
  background: rgba(34,197,94,.1); color: #4ADE80;
  padding: 3px 10px; border-radius: 100px;
  font-size: 10px; font-weight: 700;
  display: flex; align-items: center; gap: 5px;
}
.live-dot {
  width: 5px; height: 5px; background: #22C55E; border-radius: 50%;
  animation: tag-pulse 2s ease infinite;
}

/* AI card */
.ai-card {
  background: rgba(99,102,241,.07);
  border: 1px solid rgba(99,102,241,.16);
  border-radius: var(--r-md); padding: 16px;
}
.ai-card-head {
  font-size: 11px; font-weight: 700; color: #A5B4FC;
  margin-bottom: 12px;
  display: flex; align-items: center; gap: 6px;
}
.ai-card-head svg { width: 11px; height: 11px; }
.ai-row {
  background: rgba(255,255,255,.04); border-radius: 7px;
  padding: 9px 11px;
  display: flex; align-items: center; gap: 9px;
  margin-bottom: 6px; transition: background 0.12s; cursor: default;
}
.ai-row:last-child { margin-bottom: 0; }
.ai-row:hover { background: rgba(255,255,255,.07); }
.ai-n {
  width: 20px; height: 20px; border-radius: 50%;
  font-size: 9px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ai-text { font-size: 11px; color: rgba(255,255,255,.7); line-height: 1.4; flex: 1; }
.ai-act {
  font-size: 9px; font-weight: 700;
  padding: 3px 8px; border-radius: 5px;
  cursor: pointer; flex-shrink: 0;
  transition: opacity 0.12s;
}
.ai-act:hover { opacity: 0.75; }

/* ─────────────────────────────────────────────────────────────
   TESTIMONIALS
───────────────────────────────────────────────────────────── */
.testi {
  background: var(--surface); padding: var(--sp-8) 6%;
  border-top: 1px solid var(--border);
}
.testi-inner { max-width: 740px; margin: 0 auto; text-align: center; }
.testi-stars { color: #F59E0B; font-size: 13px; letter-spacing: 3px; margin-bottom: 20px; }
.testi-quote {
  font-family: var(--font-display);
  font-size: clamp(20px, 2.4vw, 29px); font-weight: 700;
  color: var(--ink); line-height: 1.42; letter-spacing: -0.025em;
  margin-bottom: 22px;
}
.testi-quote em { font-style: normal; color: var(--green); }
.testi-author {
  display: flex; align-items: center; justify-content: center;
  gap: 12px; margin-bottom: var(--sp-5);
}
.testi-av {
  width: 40px; height: 40px; border-radius: 50%;
  background: #F0FDF4; border: 1px solid #BBF7D0;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-display); font-size: 13px; font-weight: 700; color: var(--green);
  flex-shrink: 0;
}
.testi-name { font-size: 14px; font-weight: 600; color: var(--ink); text-align: left; }
.testi-role { font-size: 12px; color: var(--ink-faint); text-align: left; margin-top: 1px; }
.testi-mini { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.tm {
  background: var(--white); border: 1px solid var(--border);
  border-radius: var(--r-md); padding: 22px;
  text-align: left; transition: border-color 0.15s, transform 0.15s;
}
.tm:hover { border-color: #BBF7D0; transform: translateY(-2px); }
.tm-stars { color: #F59E0B; font-size: 11px; letter-spacing: 2px; margin-bottom: 10px; }
.tm-q { font-size: 14px; color: var(--ink-mid); line-height: 1.65; }
.tm-q strong { color: var(--green); font-weight: 600; }
.tm-author { font-size: 12px; color: var(--ink-ghost); margin-top: 12px; }

/* ─────────────────────────────────────────────────────────────
   CTA
───────────────────────────────────────────────────────────── */
.cta-section {
  background: var(--dark); padding: var(--sp-8) 6%;
  text-align: center; position: relative; overflow: hidden;
}
.cta-section::before {
  content: '';
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: radial-gradient(ellipse 50% 65% at 50% 0%, rgba(34,197,94,.08) 0%, transparent 70%);
  pointer-events: none;
}
.cta-label {
  font-size: 11px; font-weight: 700; color: rgba(255,255,255,.28);
  text-transform: uppercase; letter-spacing: .12em;
  margin-bottom: 16px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
}
.cta-label::before, .cta-label::after {
  content: ''; width: 28px; height: 1px; background: rgba(255,255,255,.1);
}
.cta-h {
  font-family: var(--font-display);
  font-size: clamp(34px, 4.5vw, 62px); font-weight: 800;
  color: #fff; letter-spacing: -0.045em;
  max-width: 680px; margin: 0 auto 18px; line-height: 1.06;
}
.cta-h em { font-style: normal; color: var(--green-bright); }
.cta-sub {
  font-size: 17px; color: rgba(255,255,255,.4);
  max-width: 400px; margin: 0 auto 32px; line-height: 1.6;
}
.btn-cta {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--green-bright); color: #fff;
  padding: 15px 32px; border-radius: 10px;
  font-size: 15px; font-weight: 700; text-decoration: none;
  box-shadow: 0 4px 20px rgba(34,197,94,.3);
  transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
}
.btn-cta:hover {
  background: var(--green); transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(34,197,94,.4);
}
.btn-cta:active { transform: scale(0.98); }
.cta-foot { margin-top: 14px; font-size: 12px; color: rgba(255,255,255,.2); }

/* ─────────────────────────────────────────────────────────────
   FOOTER
───────────────────────────────────────────────────────────── */
footer {
  background: #060A10;
  border-top: 1px solid rgba(255,255,255,.05);
  padding: 52px 6% 28px;
}
.footer-grid {
  max-width: 1040px; margin: 0 auto;
  display: grid; grid-template-columns: 210px 1fr 1fr 1fr;
  gap: 48px; margin-bottom: 36px;
}
.footer-brand-logo {
  display: flex; align-items: center; gap: 8px;
  font-family: var(--font-display); font-size: 16px;
  font-weight: 800; color: #fff; letter-spacing: -0.04em;
  margin-bottom: 10px;
}
/* footer-brand-mark replaced by inline SVG */
.footer-brand p { font-size: 13px; color: rgba(255,255,255,.3); line-height: 1.65; max-width: 185px; }
.footer-col h4 {
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .09em; color: rgba(255,255,255,.2); margin-bottom: 12px;
}
.footer-col a {
  display: block; font-size: 13px; color: rgba(255,255,255,.38);
  text-decoration: none; margin-bottom: 9px;
  transition: color 0.15s;
}
.footer-col a:hover { color: rgba(255,255,255,.78); }
.footer-bot {
  max-width: 1040px; margin: 0 auto;
  padding-top: 20px; border-top: 1px solid rgba(255,255,255,.05);
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12px; color: rgba(255,255,255,.2);
}

/* ─────────────────────────────────────────────────────────────
   SCROLL REVEAL
───────────────────────────────────────────────────────────── */
.reveal {
  opacity: 0; transform: translateY(22px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.reveal.in { opacity: 1; transform: translateY(0); }
.reveal-d1 { transition-delay: 0.08s; }
.reveal-d2 { transition-delay: 0.16s; }
.reveal-d3 { transition-delay: 0.24s; }

/* ─────────────────────────────────────────────────────────────
   RESPONSIVE
───────────────────────────────────────────────────────────── */
@media (max-width: 960px) {
  .feat-intro { grid-template-columns: 1fr; gap: 20px; margin-bottom: 40px; }
  .df-inner { grid-template-columns: 1fr; gap: 40px; }
  .df-inner.ai .df-text  { order: unset; }
  .df-inner.ai .df-visual { order: unset; }
  .testi-mini { grid-template-columns: 1fr; }
  .footer-grid { grid-template-columns: 1fr 1fr; }
  .db-shell { grid-template-columns: 1fr; }
  .db-side { display: none; }
}
@media (max-width: 700px) {
  .feat-grid { grid-template-columns: 1fr; }
  .stats-row { flex-wrap: wrap; }
  .stat-div { display: none; }
  .stat { min-width: 45%; border-top: 1px solid var(--border); padding-top: 16px; }
  .nav-links { display: none; }
  .footer-grid { grid-template-columns: 1fr; }
  .footer-bot { flex-direction: column; gap: 6px; text-align: center; }
}

      `}</style>

<nav id="nav">
  <Link href="/" className="nav-logo">
    <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
        <defs>
          <linearGradient id="rt-ring-g" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A3E635"/>
            <stop offset="100%" stopColor="#16A34A"/>
          </linearGradient>
          <linearGradient id="rt-plane-g" x1="30" y1="10" x2="85" y2="75" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#D9F99D"/>
            <stop offset="60%" stopColor="#22C55E"/>
            <stop offset="100%" stopColor="#15803D"/>
          </linearGradient>
        </defs>
        {/* Orbital ring — thick, open at upper-right, with swoosh tail */}
        <path d="M72 18 A38 38 0 1 0 88 58 Q94 72 82 82 Q68 92 50 88" stroke="url(#rt-ring-g)" strokeWidth="6" fill="none" strokeLinecap="round"/>
        {/* Paper airplane — pointing upper-right */}
        <path d="M85 15 L32 46 L44 58 L52 80 L63 62 Z" fill="url(#rt-plane-g)"/>
        {/* Fold crease */}
        <path d="M44 58 L85 15" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    RevTray
  </Link>
  <ul className="nav-links">
    <li><a href="#features">Features</a></li>
    <li><a href="#revenue">Revenue</a></li>
    <li><a href="#ai">AI tools</a></li>
  </ul>
  <Link href="/auth/login" className="nav-cta">Start free →</Link>
</nav>


<section className="hero">
  <div className="hero-glow"></div>
  <div className="hero-grid"></div>

  <div className="hero-body">
    <div className="hero-tag">
      <div className="tag-dot"></div>
      Built for Whop creators
    </div>
    <h1 className="hero-h1">Know which emails<br/>make you <mark>money</mark>.</h1>
    <p className="hero-sub">The only email platform that connects your campaigns directly to Whop revenue — so you know what converts and what doesn't.</p>
    <div className="hero-ctas">
      <Link href="/auth/login" className="btn-primary">
        Create free account
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h8M8 4l3 3-3 3"/></svg>
      </Link>
      <a href="#features" className="btn-ghost">See how it works</a>
    </div>
    <p className="hero-note">Free to start · No credit card · Connects to Whop in 2 minutes</p>
  </div>

  
  <div className="hero-db">
    <div className="db-chrome">
      <div className="dc-dots">
        <div className="dc-dot" style={{background:"#FF5F57"}}></div>
        <div className="dc-dot" style={{background:"#FFBD2E"}}></div>
        <div className="dc-dot" style={{background:"#28CA41"}}></div>
      </div>
      <div className="dc-url">app.revtray.com/dashboard/campaigns</div>
    </div>
    <div className="db-shell">
      
      <div className="db-side">
        <div className="dbs-logo">
          <svg width="20" height="20" viewBox="0 0 100 100" fill="none" style={{flexShrink:0}}>
              <defs>
                <linearGradient id="rt-ring-sb" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#A3E635"/><stop offset="100%" stopColor="#16A34A"/>
                </linearGradient>
                <linearGradient id="rt-plane-sb" x1="30" y1="10" x2="85" y2="75" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#D9F99D"/><stop offset="60%" stopColor="#22C55E"/><stop offset="100%" stopColor="#15803D"/>
                </linearGradient>
              </defs>
              <path d="M72 18 A38 38 0 1 0 88 58 Q94 72 82 82 Q68 92 50 88" stroke="url(#rt-ring-sb)" strokeWidth="6" fill="none" strokeLinecap="round"/>
              <path d="M85 15 L32 46 L44 58 L52 80 L63 62 Z" fill="url(#rt-plane-sb)"/>
              <path d="M44 58 L85 15" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          <div className="dbs-name">RevTray</div>
        </div>
        <div className="dbs-items">
          <div className="dbs-item">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="8" y="1.5" width="4.5" height="4.5" rx="1"/><rect x="1.5" y="8" width="4.5" height="4.5" rx="1"/><rect x="8" y="8" width="4.5" height="4.5" rx="1"/></svg>
            Dashboard
          </div>
          <div className="dbs-item active">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><rect x="1.5" y="4" width="11" height="8" rx="1.5"/><path d="M1.5 6.5h11"/></svg>
            Campaigns
          </div>
          <div className="dbs-item">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><circle cx="6" cy="5" r="2.8"/><path d="M1 12c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5"/></svg>
            Contacts
          </div>
          <div className="dbs-item">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"><path d="M2 10l3.5-5 2.5 3.2 4-6.2"/></svg>
            Revenue
          </div>
          <div className="dbs-item">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><path d="M7 1.5a4.5 4.5 0 0 1 4.5 4.5v3.5a1.5 1.5 0 0 1-3 0V6a1.5 1.5 0 0 0-3 0v3.5a1.5 1.5 0 0 1-3 0V6A4.5 4.5 0 0 1 7 1.5z"/></svg>
            Automations
          </div>
          <div className="dbs-item">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"><circle cx="7" cy="7" r="5.5"/><path d="M7 4v3.5l2 1.5"/></svg>
            Analytics
          </div>
        </div>
      </div>
      
      <div className="db-main">
        <div className="dbm-top">
          <div className="dbm-title">Campaigns</div>
          <button className="dbm-btn">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4.5 1v7M1 4.5h7"/></svg>
            New Campaign
          </button>
        </div>
        <div className="dbm-kpis">
          <div className="kpi">
            <div className="kpi-lbl">Revenue attributed</div>
            <div className="kpi-val green">$47,823</div>
            <div className="kpi-delta">↑ $3,240 this week</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Total sent</div>
            <div className="kpi-val">48,291</div>
            <div className="kpi-delta muted">5 campaigns</div>
          </div>
          <div className="kpi">
            <div className="kpi-lbl">Avg open rate</div>
            <div className="kpi-val">34.2%</div>
            <div className="kpi-delta">↑ 4.1% vs last month</div>
          </div>
        </div>
        <div className="dbm-tbl">
          <div className="tbl-head tbl-cols">
            <div>Campaign</div><div>Status</div><div>Opens</div><div>Revenue</div><div>$/sent</div>
          </div>
          <div className="tbl-row tbl-cols">
            <div><div className="tr-name">Real Estate Masterclass</div><div className="tr-sub">Dec 12 · 12,430 recipients</div></div>
            <div><span className="badge-sent">Sent</span></div>
            <div className="tr-rate-high">38.4%</div>
            <div className="tr-rev">$18,240</div>
            <div style={{fontSize:"9px",color:"rgba(255,255,255,.26)"}}>$1.47</div>
          </div>
          <div className="tbl-row tbl-cols">
            <div><div className="tr-name">5-Day Deal Sequence</div><div className="tr-sub">Dec 8 · 10,891 recipients</div></div>
            <div><span className="badge-sent">Sent</span></div>
            <div className="tr-rate-high">42.1%</div>
            <div className="tr-rev">$11,700</div>
            <div style={{fontSize:"9px",color:"rgba(255,255,255,.26)"}}>$1.07</div>
          </div>
          <div className="tbl-row tbl-cols">
            <div><div className="tr-name">Flash Sale — 48hrs Only</div><div className="tr-sub">Dec 4 · 8,204 recipients</div></div>
            <div><span className="badge-sent">Sent</span></div>
            <div className="tr-rate-mid">29.8%</div>
            <div className="tr-rev">$9,340</div>
            <div style={{fontSize:"9px",color:"rgba(255,255,255,.26)"}}>$1.14</div>
          </div>
          <div className="tbl-row tbl-cols">
            <div><div className="tr-name">January Newsletter</div><div className="tr-sub">Draft · Scheduled Jan 3</div></div>
            <div><span className="badge-draft">Draft</span></div>
            <div className="tr-muted">—</div>
            <div className="tr-muted">—</div>
            <div className="tr-muted" style={{fontSize:"9px"}}>—</div>
          </div>
        </div>
      </div>
    </div>
  </div>

</section>


<div className="ombre"></div>
<section className="stats">
  <div className="stats-row">
    <div className="stat reveal">
      <div className="stat-n"><em>$2.4M</em></div>
      <div className="stat-lbl">Revenue attributed to email</div>
      <div className="stat-ctx">Tracked across all creators</div>
    </div>
    <div className="stat-div"></div>
    <div className="stat reveal reveal-d1">
      <div className="stat-n">400+</div>
      <div className="stat-lbl">Whop creators using RevTray</div>
      <div className="stat-ctx">Courses, communities, products</div>
    </div>
    <div className="stat-div"></div>
    <div className="stat reveal reveal-d2">
      <div className="stat-n">34%</div>
      <div className="stat-lbl">Average email open rate</div>
      <div className="stat-ctx">vs. 21% industry average</div>
    </div>
    <div className="stat-div"></div>
    <div className="stat reveal reveal-d3">
      <div className="stat-n"><em>5x</em></div>
      <div className="stat-lbl">ROI vs traditional tools</div>
      <div className="stat-ctx">When you know what works</div>
    </div>
  </div>
</section>


<section className="features" id="features">
  <div className="feat-max">
    <div className="feat-intro reveal">
      <h2>Every tool you need to grow revenue through email.</h2>
      <p>RevTray is built around one core idea: Whop creators deserve to know exactly what their emails earn — not just how many people opened them.</p>
    </div>
    <div className="feat-grid">
      <div className="fg-cell reveal">
        <div className="fg-num">01</div>
        <h3>Revenue attribution</h3>
        <p>Every campaign shows exactly how much revenue it generated. Whop purchases within 7 days of a click are attributed automatically — no setup required.</p>
      </div>
      <div className="fg-cell reveal reveal-d1">
        <div className="fg-num">02</div>
        <h3>AI sequence builder</h3>
        <p>Describe your product once. Get a 5-email launch sequence using Story → Value → Proof → Offer → Urgency frameworks. Real strategy, not filler.</p>
      </div>
      <div className="fg-cell reveal">
        <div className="fg-num">03</div>
        <h3>Whop native sync</h3>
        <p>Your members sync automatically. New joins, cancellations, tag changes — RevTray stays in sync without any manual work or CSV exports.</p>
      </div>
      <div className="fg-cell reveal reveal-d1">
        <div className="fg-num">04</div>
        <h3>Smart segmentation</h3>
        <p>Target buyers vs. free members, recent openers, high-value subscribers. Send relevant emails — not generic blasts to everyone.</p>
      </div>
      <div className="fg-cell reveal">
        <div className="fg-num">05</div>
        <h3>Automation sequences</h3>
        <p>Welcome flows, purchase follow-ups, re-engagement. Triggered automatically by what members do on Whop.</p>
      </div>
      <div className="fg-cell reveal reveal-d1">
        <div className="fg-num">06</div>
        <h3>Deliverability tools</h3>
        <p>Spam score analysis, domain authentication, warmup schedules. Built to reach the inbox — not the promotions tab.</p>
      </div>
    </div>
  </div>
</section>


<section className="dark-feat" id="revenue">
  <div className="df-inner rev">
    <div className="df-text reveal">
      <div className="df-eyebrow">Revenue Attribution</div>
      <h2 className="df-h">Stop guessing which email made the sale.</h2>
      <p className="df-p">Every click is tracked. Every Whop purchase is matched. Your dashboard shows the revenue number next to every campaign — automatically, in real time.</p>
      <div className="df-points">
        <div className="df-point"><div className="df-dot"></div><span>7-day attribution window — any purchase after a click is credited to that campaign</span></div>
        <div className="df-point"><div className="df-dot"></div><span>Per-campaign revenue breakdown with revenue-per-email-sent</span></div>
        <div className="df-point"><div className="df-dot"></div><span>Real-time Whop webhook — new purchases appear in your dashboard within seconds</span></div>
      </div>
    </div>
    <div className="df-visual reveal reveal-d2">
      <div className="rev-card">
        <div className="rev-card-glow"></div>
        <div className="rc-lbl">Total revenue from email</div>
        <div className="rc-num">$49,783</div>
        <div className="rc-delta">this month · <em>↑ 28%</em> vs last month</div>
        <div className="rc-bars-lbl"><span>Top campaigns</span><span>Revenue</span></div>
        <div className="rc-bars">
          <div className="rcb"><div className="rcb-name">Masterclass launch</div><div className="rcb-track"><div className="rcb-fill" data-w="92" style={{width:"0%"}}></div></div><div className="rcb-val">$18.2k</div></div>
          <div className="rcb"><div className="rcb-name">5-day deal sequence</div><div className="rcb-track"><div className="rcb-fill" data-w="64" style={{width:"0%"}}></div></div><div className="rcb-val">$11.7k</div></div>
          <div className="rcb"><div className="rcb-name">Flash sale — 48hrs</div><div className="rcb-track"><div className="rcb-fill" data-w="51" style={{width:"0%"}}></div></div><div className="rcb-val">$9.3k</div></div>
          <div className="rcb"><div className="rcb-name">New member welcome</div><div className="rcb-track"><div className="rcb-fill" data-w="38" style={{width:"0%"}}></div></div><div className="rcb-val">$7.1k</div></div>
        </div>
        <div className="rc-footer">
          <div className="rc-footer-l">Last purchase: 4 minutes ago</div>
          <div className="live-badge"><div className="live-dot"></div>Live</div>
        </div>
      </div>
    </div>
  </div>
</section>


<section className="dark-feat" id="ai">
  <div className="df-inner ai">
    <div className="df-text reveal">
      <div className="df-eyebrow">AI Tools</div>
      <h2 className="df-h">A strategist. Not a text generator.</h2>
      <p className="df-p">Generate complete launch sequences using proven frameworks. Real email strategy tailored to your product and audience — not generic filler content.</p>
      <div className="df-points">
        <div className="df-point"><div className="df-dot"></div><span>5-email sequence from a one-sentence brief — Story → Value → Proof → Offer → Urgency</span></div>
        <div className="df-point"><div className="df-dot"></div><span>Subject line scorer — rates 1-10, gives 3 alternatives with conversion reasoning</span></div>
        <div className="df-point"><div className="df-dot"></div><span>Engagement predictor — estimate open rate and conversions before you send</span></div>
      </div>
    </div>
    <div className="df-visual reveal reveal-d1">
      <div className="ai-card">
        <div className="ai-card-head">
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 1l1.2 3.5H11L8 6.8l1.2 3.7L6 8.4 2.8 10.5 4 6.8 1 4.5h3.8L6 1z"/></svg>
          AI Sequence Builder
        </div>
        <div className="ai-row">
          <div className="ai-n" style={{background:"rgba(99,102,241,.2)",color:"#A5B4FC"}}>1</div>
          <div className="ai-text">My first wholesale deal made $12k with $0 down</div>
          <div className="ai-act" style={{background:"rgba(99,102,241,.15)",color:"#A5B4FC"}}>Write</div>
        </div>
        <div className="ai-row">
          <div className="ai-n" style={{background:"rgba(59,130,246,.2)",color:"#93C5FD"}}>2</div>
          <div className="ai-text">The 3-step system I use to find deals every week</div>
          <div className="ai-act" style={{background:"rgba(59,130,246,.15)",color:"#93C5FD"}}>Write</div>
        </div>
        <div className="ai-row">
          <div className="ai-n" style={{background:"rgba(34,197,94,.15)",color:"#4ADE80"}}>3</div>
          <div className="ai-text">How Marcus closed his first deal in 31 days</div>
          <div className="ai-act" style={{background:"rgba(34,197,94,.12)",color:"#4ADE80"}}>Write</div>
        </div>
        <div className="ai-row">
          <div className="ai-n" style={{background:"rgba(251,191,36,.15)",color:"#FCD34D"}}>4</div>
          <div className="ai-text">Doors open: Real Estate Masterclass enrollment</div>
          <div className="ai-act" style={{background:"rgba(251,191,36,.12)",color:"#FCD34D"}}>Write</div>
        </div>
        <div className="ai-row">
          <div className="ai-n" style={{background:"rgba(239,68,68,.15)",color:"#FCA5A5"}}>5</div>
          <div className="ai-text">Last chance — enrollment closes tonight at midnight</div>
          <div className="ai-act" style={{background:"rgba(239,68,68,.12)",color:"#FCA5A5"}}>Write</div>
        </div>
      </div>
    </div>
  </div>
</section>


<section className="testi">
  <div className="testi-inner">
    <div className="testi-stars">★★★★★</div>
    <p className="testi-quote reveal">"I sent one campaign to 3,200 subscribers and immediately saw <em>$4,200 attributed to that single email</em>. I've never had that kind of visibility before — I knew exactly what was working."</p>
    <div className="testi-author reveal">
      <div className="testi-av">JM</div>
      <div>
        <div className="testi-name">Jordan M.</div>
        <div className="testi-role">Real estate educator · 3,200 members on Whop</div>
      </div>
    </div>
    <div className="testi-mini">
      <div className="tm reveal">
        <div className="tm-stars">★★★★★</div>
        <p className="tm-q">"Described my fitness course in 3 sentences and got a <strong>complete 5-email launch plan</strong> that genuinely sounded like me. Sent the whole sequence the same afternoon."</p>
        <div className="tm-author">Taylor C. · Fitness coach · 1,800 Whop members</div>
      </div>
      <div className="tm reveal reveal-d1">
        <div className="tm-stars">★★★★★</div>
        <p className="tm-q">"Finally a tool that syncs with Whop automatically. My entire audience was imported and ready to email <strong>in under 5 minutes</strong>. No CSV exports, no broken imports."</p>
        <div className="tm-author">Ryan B. · Stock trading community · 5,100 Whop members</div>
      </div>
    </div>
  </div>
</section>


<section className="cta-section">
  <div className="cta-label">Start for free</div>
  <h2 className="cta-h reveal">Know which emails<br/>make you <em>money</em>.</h2>
  <p className="cta-sub reveal">Connect your Whop store, import your audience, and send your first revenue-attributed campaign — free.</p>
  <Link href="/auth/login" className="btn-cta reveal">
    Create free account
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h8M8 4l3 3-3 3"/></svg>
  </Link>
  <p className="cta-foot">Free to start · No credit card required · Connects to Whop in 2 minutes</p>
</section>


<footer>
  <div className="footer-grid">
    <div className="footer-brand">
      <div className="footer-brand-logo">
        <svg width="26" height="26" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id="rt-ring-ft" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#A3E635"/><stop offset="100%" stopColor="#16A34A"/>
            </linearGradient>
            <linearGradient id="rt-plane-ft" x1="30" y1="10" x2="85" y2="75" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#D9F99D"/><stop offset="60%" stopColor="#22C55E"/><stop offset="100%" stopColor="#15803D"/>
            </linearGradient>
          </defs>
          <path d="M72 18 A38 38 0 1 0 88 58 Q94 72 82 82 Q68 92 50 88" stroke="url(#rt-ring-ft)" strokeWidth="6" fill="none" strokeLinecap="round"/>
          <path d="M85 15 L32 46 L44 58 L52 80 L63 62 Z" fill="url(#rt-plane-ft)"/>
          <path d="M44 58 L85 15" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        RevTray
      </div>
      <p>Email marketing built for Whop creators. Send smarter. Earn more.</p>
    </div>
    <div className="footer-col">
      <h4>Product</h4>
      <a href="#">Campaigns</a>
      <a href="#">AI Tools</a>
      <a href="#">Revenue</a>
      <a href="#">Automations</a>
      <a href="#">Templates</a>
    </div>
    <div className="footer-col">
      <h4>Resources</h4>
      <a href="#">Documentation</a>
      <a href="#">API Reference</a>
      <a href="#">Blog</a>
      <a href="#">Changelog</a>
    </div>
    <div className="footer-col">
      <h4>Company</h4>
      <a href="#">About</a>
      <a href="#">Pricing</a>
      <a href="#">Privacy Policy</a>
      <a href="#">Terms of Service</a>
    </div>
  </div>
  <div className="footer-bot">
    <div>© 2025 RevTray. All rights reserved.</div>
    <div>Built for Whop creators</div>
  </div>
</footer>
    </>
  );
}
