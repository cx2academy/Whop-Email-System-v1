'use client';

export function CommandPaletteTrigger() {
  return (
    <button
      className="hidden items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300 sm:flex"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
    >
      <span>Search commands</span>
      <kbd className="rounded px-1 py-0.5 text-[10px] font-mono text-zinc-600" style={{ background: 'rgba(255,255,255,0.06)' }}>⌘K</kbd>
    </button>
  );
}
