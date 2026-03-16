'use client';

/**
 * components/email-editor/visual-editor.tsx
 *
 * Clean document-style writing canvas.
 * White surface, constrained width, generous padding — like Notion/Substack.
 * Minimal toolbar: primary tools visible, advanced in "More ▾" dropdown.
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import {
  BoldIcon, ItalicIcon, LinkIcon, MinusIcon, ImageIcon,
  ChevronDownIcon, Heading2Icon, UnderlineIcon, ListIcon, ListOrderedIcon,
} from 'lucide-react';

interface Props { value: string; onChange: (html: string) => void; }

const BUTTON_BLOCK  = `<p style="text-align:center;margin:24px 0"><a href="https://example.com" style="display:inline-block;background:#22C55E;color:#fff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">Click here →</a></p>`;
const DIVIDER_BLOCK = `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0" />`;
const CALLOUT_BLOCK = `<blockquote style="border-left:3px solid #22C55E;padding:12px 16px;margin:16px 0;background:#f0fdf4;border-radius:0 8px 8px 0;color:#166534">✨ Add your callout text here.</blockquote>`;
const IMAGE_BLOCK   = `<p style="text-align:center;margin:20px 0"><img src="https://via.placeholder.com/560x200?text=Your+Image" alt="" style="max-width:100%;border-radius:8px;" /></p>`;

export function VisualEditor({ value, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showMore, setShowMore] = useState(false);
  const [focused, setFocused] = useState(false);

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

  const TB = ({ onPress, title, children }: { onPress: () => void; title: string; children: React.ReactNode }) => (
    <button
      type="button" title={title}
      onMouseDown={(e) => { e.preventDefault(); onPress(); }}
      className="flex h-7 w-7 items-center justify-center rounded transition-all"
      style={{ color: '#9CA3AF' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.06)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col h-full" style={{ background: '#F9FAFB' }}>

      {/* ── Toolbar ── */}
      <div
        className="flex items-center gap-0.5 px-4 py-2 flex-shrink-0"
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          boxShadow: focused ? '0 1px 0 #22C55E' : '0 1px 0 transparent',
          transition: 'box-shadow 0.2s',
        }}
      >
        {/* Text */}
        <TB onPress={() => exec('bold')} title="Bold"><BoldIcon className="h-3.5 w-3.5" /></TB>
        <TB onPress={() => exec('italic')} title="Italic"><ItalicIcon className="h-3.5 w-3.5" /></TB>
        <TB onPress={insertLink} title="Insert link"><LinkIcon className="h-3.5 w-3.5" /></TB>

        <div className="mx-2 h-4 w-px bg-gray-200" />

        {/* Blocks */}
        <TB onPress={() => insert(BUTTON_BLOCK)} title="Button block">
          <span className="text-[10px] font-bold tracking-tight text-gray-500">BTN</span>
        </TB>
        <TB onPress={() => insert(IMAGE_BLOCK)} title="Image block"><ImageIcon className="h-3.5 w-3.5" /></TB>
        <TB onPress={() => insert(DIVIDER_BLOCK)} title="Divider"><MinusIcon className="h-3.5 w-3.5" /></TB>

        <div className="mx-2 h-4 w-px bg-gray-200" />

        {/* More dropdown */}
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setShowMore(s => !s); }}
            className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
          >
            More <ChevronDownIcon className="h-3 w-3" />
          </button>
          {showMore && (
            <div className="absolute left-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl py-1">
              {[
                { label: 'Heading',     icon: <Heading2Icon className="h-3.5 w-3.5" />,    fn: () => exec('formatBlock', 'h2') },
                { label: 'Underline',   icon: <UnderlineIcon className="h-3.5 w-3.5" />,   fn: () => exec('underline') },
                { label: 'Bullet list', icon: <ListIcon className="h-3.5 w-3.5" />,         fn: () => exec('insertUnorderedList') },
                { label: 'Number list', icon: <ListOrderedIcon className="h-3.5 w-3.5" />,  fn: () => exec('insertOrderedList') },
                { label: 'Callout',     icon: <span className="text-[13px]">✨</span>,      fn: () => insert(CALLOUT_BLOCK) },
              ].map(({ label, icon, fn }) => (
                <button key={label} type="button"
                  onMouseDown={(e) => { e.preventDefault(); fn(); }}
                  className="flex w-full items-center gap-2.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors">
                  <span className="text-gray-400">{icon}</span>{label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Writing canvas ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ background: '#F9FAFB' }}
        onClick={() => { editorRef.current?.focus(); setShowMore(false); }}
      >
        {/* Constrained document surface */}
        <div
          className="mx-auto my-8 rounded-xl overflow-hidden"
          style={{
            maxWidth: 600,
            background: '#FFFFFF',
            boxShadow: focused
              ? '0 0 0 2px rgba(34,197,94,0.3), 0 4px 32px rgba(0,0,0,0.08)'
              : '0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)',
            transition: 'box-shadow 0.2s',
          }}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={sync}
            onBlur={() => { sync(); setFocused(false); }}
            onFocus={() => setFocused(true)}
            onClick={e => e.stopPropagation()}
            data-placeholder="Start writing your email…"
            className="outline-none"
            style={{
              padding: '32px 36px 40px',
              minHeight: 440,
              fontSize: 15,
              lineHeight: 1.75,
              color: '#111827',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            }}
          />
        </div>
      </div>

      <style jsx>{`
        [contenteditable]:empty:before { content: attr(data-placeholder); color: #9CA3AF; pointer-events: none; }
        [contenteditable] h1 { font-size: 1.75rem; font-weight: 700; margin: 0 0 12px; color: #111827; }
        [contenteditable] h2 { font-size: 1.3rem; font-weight: 700; margin: 0 0 10px; color: #111827; }
        [contenteditable] p  { margin: 0 0 14px; }
        [contenteditable] ul { list-style: disc;    padding-left: 20px; margin: 0 0 14px; }
        [contenteditable] ol { list-style: decimal; padding-left: 20px; margin: 0 0 14px; }
        [contenteditable] a  { color: #2563EB; text-decoration: underline; }
        [contenteditable] hr { border: none; border-top: 1px solid #E5E7EB; margin: 20px 0; }
        [contenteditable] blockquote { border-left: 3px solid #22C55E; padding: 10px 14px; margin: 14px 0; background: #F0FDF4; border-radius: 0 6px 6px 0; color: #166534; }
        [contenteditable] strong { font-weight: 600; }
      `}</style>
    </div>
  );
}
