'use client';

/**
 * components/email-editor/visual-editor.tsx
 * Minimal toolbar — primary tools visible, advanced in "More" dropdown.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import { BoldIcon, ItalicIcon, LinkIcon, MinusIcon, ImageIcon, ChevronDownIcon, Heading2Icon, UnderlineIcon, ListIcon, ListOrderedIcon } from 'lucide-react';

interface Props { value: string; onChange: (html: string) => void; }

const BUTTON_BLOCK  = `<div style="text-align:center;margin:28px 0;"><a href="https://example.com" style="display:inline-block;background:#2563eb;color:#fff;font-weight:600;font-size:15px;padding:13px 30px;border-radius:8px;text-decoration:none;">Click here →</a></div>`;
const DIVIDER_BLOCK = `<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />`;
const CALLOUT_BLOCK = `<div style="background:#f0f9ff;border-left:4px solid #2563eb;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;"><p style="margin:0;color:#1e40af;font-size:14px;">✨ Add your callout text here.</p></div>`;
const IMAGE_BLOCK   = `<div style="text-align:center;margin:24px 0;"><img src="https://via.placeholder.com/560x280?text=Your+Image" alt="" style="max-width:100%;border-radius:8px;" /></div>`;

export function VisualEditor({ value, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    const el = editorRef.current;
    if (el && el.innerHTML !== value) el.innerHTML = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = useCallback(() => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  function exec(cmd: string, val?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    sync();
  }

  function insert(html: string) {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    sync();
    setShowMore(false);
  }

  function insertLink() {
    const url = prompt('URL:', 'https://');
    if (url) exec('createLink', url);
  }

  const Btn = ({ onPress, title, children }: { onPress: () => void; title: string; children: React.ReactNode }) => (
    <button type="button" title={title} onMouseDown={(e) => { e.preventDefault(); onPress(); }}
      className="flex h-7 w-7 items-center justify-center rounded transition-colors" style={{ color: "#6B7280" }}>
      {children}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-3 py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#111827" }}>
        <Btn onPress={() => exec('bold')} title="Bold"><BoldIcon className="h-3.5 w-3.5" /></Btn>
        <Btn onPress={() => exec('italic')} title="Italic"><ItalicIcon className="h-3.5 w-3.5" /></Btn>
        <Btn onPress={insertLink} title="Link"><LinkIcon className="h-3.5 w-3.5" /></Btn>
        <div className="mx-2 h-4 w-px bg-border" />
        <Btn onPress={() => insert(BUTTON_BLOCK)} title="Button block">
          <span className="text-[11px] font-semibold">Btn</span>
        </Btn>
        <Btn onPress={() => insert(IMAGE_BLOCK)} title="Image block"><ImageIcon className="h-3.5 w-3.5" /></Btn>
        <Btn onPress={() => insert(DIVIDER_BLOCK)} title="Divider"><MinusIcon className="h-3.5 w-3.5" /></Btn>
        <div className="mx-2 h-4 w-px bg-border" />
        <div className="relative">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); setShowMore((s) => !s); }}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            More <ChevronDownIcon className="h-3 w-3" />
          </button>
          {showMore && (
            <div className="absolute left-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-lg shadow-xl py-1" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)" }}>
              {[
                { label: 'Heading',     icon: <Heading2Icon className="h-3.5 w-3.5" />,    fn: () => exec('formatBlock', 'h2') },
                { label: 'Underline',   icon: <UnderlineIcon className="h-3.5 w-3.5" />,   fn: () => exec('underline') },
                { label: 'Bullet list', icon: <ListIcon className="h-3.5 w-3.5" />,         fn: () => exec('insertUnorderedList') },
                { label: 'Number list', icon: <ListOrderedIcon className="h-3.5 w-3.5" />,  fn: () => exec('insertOrderedList') },
                { label: 'Callout',     icon: <span className="text-[11px]">✨</span>,      fn: () => insert(CALLOUT_BLOCK) },
              ].map(({ label, icon, fn }) => (
                <button key={label} type="button"
                  onMouseDown={(e) => { e.preventDefault(); fn(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs transition-colors" style={{ color: "#9CA3AF" }}>
                  <span className="text-muted-foreground">{icon}</span>{label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Writing surface */}
      <div ref={editorRef} contentEditable suppressContentEditableWarning
        onInput={sync} onBlur={sync} onClick={() => setShowMore(false)}
        data-placeholder="Start writing your email…"
        className="flex-1 overflow-y-auto px-7 py-6 text-[15px] leading-7 focus:outline-none min-h-[440px]" style={{ color: "#E2E8F0", background: "#0D1625", caretColor: "#22C55E" }}
      />

      <style jsx>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: hsl(var(--muted-foreground)); pointer-events: none; }
        [contenteditable] h2 { font-size: 1.2rem; font-weight: 600; margin: 1rem 0 0.4rem; line-height: 1.3; }
        [contenteditable] p  { margin: 0 0 0.75rem; }
        [contenteditable] ul { list-style: disc;    padding-left: 1.5rem; margin: 0 0 0.75rem; }
        [contenteditable] ol { list-style: decimal; padding-left: 1.5rem; margin: 0 0 0.75rem; }
        [contenteditable] a  { color: hsl(var(--primary)); text-decoration: underline; }
        [contenteditable] hr { border: none; border-top: 1px solid hsl(var(--border)); margin: 1.5rem 0; }
      `}</style>
    </div>
  );
}
