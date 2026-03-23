/**
 * components/email-editor/block-editor/types.ts
 *
 * Block type definitions for the visual email editor.
 * Every email is a flat array of these blocks.
 * Converted to HTML on save, parsed from HTML on load.
 */

export type BlockType = 'heading' | 'text' | 'button' | 'image' | 'divider' | 'spacer';

export interface HeadingBlock {
  id: string;
  type: 'heading';
  content: string;
  level: 1 | 2 | 3;
}

export interface TextBlock {
  id: string;
  type: 'text';
  content: string; // plain text or simple HTML like <strong>, <em>, <a>
}

export interface ButtonBlock {
  id: string;
  type: 'button';
  text: string;
  url: string;
  color: string;  // hex, defaults to workspace brandColor
  align: 'left' | 'center' | 'right';
}

export interface ImageBlock {
  id: string;
  type: 'image';
  src: string;
  alt: string;
}

export interface DividerBlock {
  id: string;
  type: 'divider';
}

export interface SpacerBlock {
  id: string;
  type: 'spacer';
  height: number; // pixels
}

export type Block =
  | HeadingBlock
  | TextBlock
  | ButtonBlock
  | ImageBlock
  | DividerBlock
  | SpacerBlock;

// ── Helpers ───────────────────────────────────────────────────────────────────

let _counter = 0;
export function uid(): string {
  return `blk_${Date.now()}_${++_counter}`;
}

export function defaultBlock(type: BlockType, brandColor = '#22C55E'): Block {
  switch (type) {
    case 'heading':  return { id: uid(), type: 'heading',  content: 'Your headline here', level: 2 };
    case 'text':     return { id: uid(), type: 'text',     content: 'Write your content here.' };
    case 'button':   return { id: uid(), type: 'button',   text: 'Click here →', url: 'https://', color: brandColor, align: 'center' };
    case 'image':    return { id: uid(), type: 'image',    src: '', alt: '' };
    case 'divider':  return { id: uid(), type: 'divider' };
    case 'spacer':   return { id: uid(), type: 'spacer',   height: 24 };
  }
}
