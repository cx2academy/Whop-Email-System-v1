'use client';

export function CommandPaletteTrigger() {
  return (
    <button
      className="hidden items-center gap-2 rounded-full px-4 py-1.5 text-xs text-zinc-500 transition-all hover:text-zinc-900 sm:flex"
      style={{ 
        background: 'rgba(255,255,255,0.8)', 
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.04)'
      }}
      onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))}
    >
      <span className="font-medium">Search commands</span>
      <kbd className="rounded-md border border-zinc-200 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400" style={{ background: 'white' }}>⌘K</kbd>
    </button>
  );
}
