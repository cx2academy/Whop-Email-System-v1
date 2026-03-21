'use client';

/**
 * app/onboarding/ui.tsx
 * Shared primitives — used across every onboarding step.
 * RevTray light design system tokens inline.
 */

import { useState } from 'react';
import { CheckIcon, AlertCircleIcon, LoaderIcon } from 'lucide-react';

// ── Tokens ───────────────────────────────────────────────────────────────────
export const C = {
  brand:       '#22C55E',
  brandHover:  '#16A34A',
  brandTint:   'rgba(34,197,94,0.08)',
  text:        '#0D0F12',
  textSub:     '#5A6472',
  textHint:    '#9AA3AF',
  bg:          '#F7F8FA',
  card:        '#FFFFFF',
  border:      '#E6E8EC',
  red:         '#DC2626',
  redBg:       '#FEF2F2',
  redBorder:   '#FCA5A5',
  green:       '#16A34A',
  greenBg:     '#F0FDF4',
  greenBorder: '#BBF7D0',
};

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 18, color = C.brand }: { size?: number; color?: string }) {
  return (
    <LoaderIcon
      size={size}
      style={{ color, animation: 'spin 0.7s linear infinite', flexShrink: 0 }}
    />
  );
}

// ── Step shell ────────────────────────────────────────────────────────────────
export function Shell({
  step, total, eyebrow, headline, sub, children,
}: {
  step: number; total: number;
  eyebrow?: string; headline: string; sub?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ob-in { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .ob-in { animation: ob-in 0.28s ease forwards; }
      `}</style>

      {/* Top bar */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10,
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px',
        background: 'rgba(247,248,250,0.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: C.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 100 100" fill="none">
              <path d="M72 18 A38 38 0 1 0 88 58 Q94 72 82 82 Q68 92 50 88" stroke="white" strokeWidth="9" fill="none" strokeLinecap="round"/>
              <path d="M85 15 L32 46 L44 58 L52 80 L63 62 Z" fill="white"/>
            </svg>
          </div>
          <span style={{ fontFamily: "'Bricolage Grotesque',system-ui,sans-serif", fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: '-0.03em' }}>
            RevTray
          </span>
        </div>
        {/* Dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} style={{
              height: 5, borderRadius: 99,
              width: i === step - 1 ? 18 : 5,
              background: i < step - 1 ? C.brand : i === step - 1 ? C.brand : C.border,
              opacity: i < step - 1 ? 0.4 : 1,
              transition: 'all 0.25s',
            }} />
          ))}
          <span style={{ fontSize: 11, color: C.textHint, marginLeft: 6 }}>{step}/{total}</span>
        </div>
      </header>

      {/* Content */}
      <main style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 40px',
      }}>
        <div className="ob-in" style={{ width: '100%', maxWidth: 460 }}>
          {eyebrow && (
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: C.brand, margin: '0 0 14px' }}>
              {eyebrow}
            </p>
          )}
          <h1 style={{
            fontFamily: "'Bricolage Grotesque',system-ui,sans-serif",
            fontSize: 'clamp(26px,5vw,34px)', fontWeight: 700,
            color: C.text, letterSpacing: '-0.035em', lineHeight: 1.1,
            margin: sub ? '0 0 10px' : '0 0 28px',
          }}>
            {headline}
          </h1>
          {sub && (
            <p style={{ fontSize: 15, color: C.textSub, lineHeight: 1.65, margin: '0 0 28px' }}>
              {sub}
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {children}
          </div>
        </div>
      </main>
    </>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({
  label, value, onChange, type = 'text', placeholder, hint, autoFocus, disabled,
}: {
  label?: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string;
  autoFocus?: boolean; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: C.textSub }}>{label}</label>}
      <input
        type={type} value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '12px 14px', fontSize: 15,
          border: `1.5px solid ${focused ? C.brand : C.border}`,
          borderRadius: 8, outline: 'none',
          background: disabled ? C.bg : C.card,
          color: C.text, boxSizing: 'border-box',
          fontFamily: 'inherit', transition: 'border-color 0.15s',
          opacity: disabled ? 0.6 : 1,
        }}
      />
      {hint && <p style={{ fontSize: 12, color: C.textHint, margin: 0 }}>{hint}</p>}
    </div>
  );
}

// ── Primary button ────────────────────────────────────────────────────────────
export function Btn({
  label, onClick, loading, disabled, icon,
}: {
  label: string; onClick?: () => void;
  loading?: boolean; disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const off = loading || disabled;
  return (
    <button
      onClick={onClick}
      disabled={off}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: '100%', padding: '13px 24px',
        background: off ? '#9AA3AF' : C.brand,
        color: '#fff', border: 'none', borderRadius: 10,
        fontSize: 15, fontWeight: 600, fontFamily: 'inherit',
        cursor: off ? 'not-allowed' : 'pointer',
        boxShadow: off ? 'none' : '0 2px 10px rgba(34,197,94,0.22)',
        transition: 'all 0.15s',
      }}
    >
      {loading ? <Spinner size={16} color="#fff" /> : icon}
      {label}
    </button>
  );
}

// ── Ghost button ──────────────────────────────────────────────────────────────
export function GhostBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 13, color: C.textHint, fontFamily: 'inherit', padding: '4px 0',
        textAlign: 'center', width: '100%',
      }}
    >
      {label}
    </button>
  );
}

// ── Error / Success banners ───────────────────────────────────────────────────
export function Err({ msg }: { msg: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 8,
      background: C.redBg, border: `1px solid ${C.redBorder}`,
      fontSize: 13, color: C.red,
    }}>
      <AlertCircleIcon size={14} style={{ flexShrink: 0 }} />
      {msg}
    </div>
  );
}

export function Ok({ msg }: { msg: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px', borderRadius: 8,
      background: C.greenBg, border: `1px solid ${C.greenBorder}`,
      fontSize: 13, color: C.green,
    }}>
      <CheckIcon size={14} style={{ flexShrink: 0 }} />
      {msg}
    </div>
  );
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
export function Card({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${accent ? C.greenBorder : C.border}`,
      borderRadius: 10, overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.textHint, margin: 0 }}>
      {children}
    </p>
  );
}
