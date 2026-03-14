'use client';

/**
 * components/email-editor/visual-editor.tsx
 *
 * Visual email editor with formatting toolbar.
 * Uses contenteditable + execCommand — no external dependencies.
 * Syncs innerHTML to the parent's htmlBody state on every change.
 */

import { useRef, useEffect, useCallback } from 'react';
import {
  BoldIcon, ItalicIcon, UnderlineIcon, Heading2Icon, ListIcon,
  ListOrderedIcon, LinkIcon, MinusIcon, ImageIcon,
} from 'lucide-react';

interface Props {
  value: string;
  onChange: (html: string) => void;
}

// Button / callout block templates
const BLOCKS = {
  button: `<div style="text-align:center;margin:24px 0;"><a href="https://example.com" style="display:inline-block;background:#2563eb;color:#fff;font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none;">Click here</a></div>`,
  divider: `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />`,
  callout: `<div style="background:#f0f9ff;border-left:4px solid #2563eb;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;"><p style="margin:0;color:#1e40af;font-size:14px;">✨ <strong>Note:</strong> Add your callout text here.</p></div>`,
  image: `<div style="text-align:center;margin:24px 0;"><img src="https://via.placeholder.com/560x280?text=Your+Image" alt="Email image" style="max-width:100%;border-radius:8px;" /></div>`,
};

export function VisualEditor({ value, onChange }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync external value → DOM on mount only (don't overwrite cursor position on every keystroke)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    onChange(el.innerHTML);
  }, [onChange]);

  function exec(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    handleInput();
  }

  function insertBlock(html: string) {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    handleInput();
  }

  function insertLink() {
    const url = prompt('Enter URL:', 'https://');
    if (url) exec('createLink', url);
  }

  const toolbarBtnCls = 'flex h-7 w-7 items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors';

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-border px-2 py-1.5 flex-wrap">
        {/* Text formatting */}
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }} className={toolbarBtnCls} title="Bold">
          <BoldIcon className="h-3.5 w-3.5" />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }} className={toolbarBtnCls} title="Italic">
          <ItalicIcon className="h-3.5 w-3.5" />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('underline'); }} className={toolbarBtnCls} title="Underline">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1.5 h-4 w-px bg-border" />

        {/* Heading */}
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', 'h2'); }} className={toolbarBtnCls} title="Heading">
          <Heading2Icon className="h-3.5 w-3.5" />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('formatBlock', 'p'); }} className={`${toolbarBtnCls} text-xs font-medium`} title="Paragraph">
          P
        </button>

        <div className="mx-1.5 h-4 w-px bg-border" />

        {/* Lists */}
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }} className={toolbarBtnCls} title="Bullet list">
          <ListIcon className="h-3.5 w-3.5" />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); exec('insertOrderedList'); }} className={toolbarBtnCls} title="Numbered list">
          <ListOrderedIcon className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1.5 h-4 w-px bg-border" />

        {/* Link */}
        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertLink(); }} className={toolbarBtnCls} title="Insert link">
          <LinkIcon className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1.5 h-4 w-px bg-border" />

        {/* Block inserts */}
        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertBlock(BLOCKS.button); }} className={`${toolbarBtnCls} w-auto px-2 text-[11px] font-semibold`} title="Insert button block">
          Button
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertBlock(BLOCKS.callout); }} className={`${toolbarBtnCls} w-auto px-2 text-[11px] font-semibold`} title="Insert callout">
          Callout
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertBlock(BLOCKS.image); }} className={toolbarBtnCls} title="Insert image block">
          <ImageIcon className="h-3.5 w-3.5" />
        </button>
        <button type="button" onMouseDown={(e) => { e.preventDefault(); insertBlock(BLOCKS.divider); }} className={toolbarBtnCls} title="Insert divider">
          <MinusIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={handleInput}
        className="flex-1 overflow-y-auto px-5 py-4 text-sm text-foreground focus:outline-none leading-relaxed min-h-[380px]"
        style={{ fontFamily: 'inherit' }}
        data-placeholder="Start writing your email..."
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
        [contenteditable] h1 { font-size: 1.5rem; font-weight: 700; margin: 0.75rem 0; }
        [contenteditable] h2 { font-size: 1.25rem; font-weight: 600; margin: 0.75rem 0; }
        [contenteditable] h3 { font-size: 1.1rem; font-weight: 600; margin: 0.5rem 0; }
        [contenteditable] p  { margin: 0.5rem 0; }
        [contenteditable] ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        [contenteditable] ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        [contenteditable] a  { color: hsl(var(--primary)); text-decoration: underline; }
        [contenteditable] hr { border: none; border-top: 1px solid hsl(var(--border)); margin: 1.5rem 0; }
        [contenteditable] blockquote { border-left: 3px solid hsl(var(--primary)); padding-left: 1rem; color: hsl(var(--muted-foreground)); margin: 0.75rem 0; }
      `}</style>
    </div>
  );
}
