/**
 * components/email-editor/block-editor/html.ts
 *
 * Converts between Block[] and email HTML strings.
 *
 * blocksToHtml — renders blocks as email-safe HTML (inline styles only)
 * htmlToBlocks — parses HTML back into blocks (used on initial load + AI output)
 *
 * Both are pure functions with no React dependency — safe to import anywhere.
 */

import type { Block, HeadingBlock, TextBlock, ButtonBlock, ImageBlock } from './types';
import { uid } from './types';

// ── blocksToHtml ──────────────────────────────────────────────────────────────

const BASE_FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

export function blocksToHtml(blocks: Block[]): string {
  if (!blocks.length) return '';

  return blocks.map((b) => {
    switch (b.type) {
      case 'heading': {
        const sizes = { 1: '28px', 2: '22px', 3: '18px' };
        return `<h${b.level} style="font-family:${BASE_FONT};font-size:${sizes[b.level]};font-weight:700;color:#111827;margin:0 0 14px;line-height:1.2">${escHtml(b.content)}</h${b.level}>`;
      }

      case 'text': {
        // content may include inline formatting tags — don't double-escape
        return `<p style="font-family:${BASE_FONT};font-size:15px;line-height:1.75;color:#374151;margin:0 0 14px">${b.content}</p>`;
      }

      case 'button': {
        const alignStyle = b.align === 'center' ? 'text-align:center' : b.align === 'right' ? 'text-align:right' : 'text-align:left';
        return `<p style="${alignStyle};margin:24px 0"><a href="${escAttr(b.url)}" style="display:inline-block;background:${escAttr(b.color)};color:#ffffff;font-family:${BASE_FONT};font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none">${escHtml(b.text)}</a></p>`;
      }

      case 'image': {
        if (!b.src) return '';
        return `<p style="text-align:center;margin:20px 0"><img src="${escAttr(b.src)}" alt="${escAttr(b.alt)}" style="max-width:100%;height:auto;border-radius:8px" /></p>`;
      }

      case 'divider': {
        return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0" />`;
      }

      case 'spacer': {
        return `<div style="height:${b.height}px;line-height:${b.height}px">&nbsp;</div>`;
      }

      default:
        return '';
    }
  }).filter(Boolean).join('\n');
}

// ── htmlToBlocks ──────────────────────────────────────────────────────────────

/**
 * Parses an HTML string into blocks.
 * Runs client-side only (uses DOMParser).
 * Falls back to a single text block on any parse error.
 */
export function htmlToBlocks(html: string): Block[] {
  if (!html || !html.trim()) return [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const blocks: Block[] = [];

    function processNode(node: Element): void {
      const tag = node.tagName?.toLowerCase();
      if (!tag) return;

      // Headings
      if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
        const level = parseInt(tag[1], 10) as 1 | 2 | 3;
        const content = node.textContent?.trim() || '';
        if (content) blocks.push({ id: uid(), type: 'heading', content, level });
        return;
      }

      // HR → divider
      if (tag === 'hr') {
        blocks.push({ id: uid(), type: 'divider' });
        return;
      }

      // Spacer divs (empty or just &nbsp;)
      if (tag === 'div') {
        const style = (node as HTMLElement).style;
        const hasHeight = style?.height || node.getAttribute('style')?.includes('height:');
        const isEmpty = !node.textContent?.trim() || node.textContent === '\u00a0';
        if (hasHeight && isEmpty) {
          const h = parseInt(style?.height || '24', 10);
          blocks.push({ id: uid(), type: 'spacer', height: isNaN(h) ? 24 : h });
          return;
        }
        // Otherwise process children
        Array.from(node.children).forEach(processNode);
        return;
      }

      // Paragraphs — check for button or image inside
      if (tag === 'p') {
        // Button: a link with background style
        const link = node.querySelector('a') as HTMLAnchorElement | null;
        if (link) {
          const bg = link.style?.background || link.style?.backgroundColor || '#22C55E';
          const hasColor = bg && bg !== 'transparent' && bg !== 'none';
          if (hasColor) {
            const pStyle = (node as HTMLElement).style?.textAlign || 'center';
            const align: ButtonBlock['align'] =
              pStyle === 'right' ? 'right' : pStyle === 'left' ? 'left' : 'center';
            blocks.push({
              id: uid(), type: 'button',
              text: link.textContent?.trim() || 'Click here',
              url: link.getAttribute('href') || '#',
              color: bg,
              align,
            });
            return;
          }
        }

        // Image inside a paragraph
        const img = node.querySelector('img') as HTMLImageElement | null;
        if (img) {
          blocks.push({
            id: uid(), type: 'image',
            src: img.getAttribute('src') || '',
            alt: img.getAttribute('alt') || '',
          });
          return;
        }

        // Regular text paragraph
        const inner = node.innerHTML?.trim();
        if (inner) {
          blocks.push({ id: uid(), type: 'text', content: inner });
        }
        return;
      }

      // Standalone img
      if (tag === 'img') {
        blocks.push({
          id: uid(), type: 'image',
          src: (node as HTMLImageElement).getAttribute('src') || '',
          alt: (node as HTMLImageElement).getAttribute('alt') || '',
        });
        return;
      }

      // Blockquote or other block elements — treat as text
      if (['blockquote', 'section', 'article', 'main'].includes(tag)) {
        const inner = node.innerHTML?.trim();
        if (inner) blocks.push({ id: uid(), type: 'text', content: inner });
        return;
      }

      // Table wrapper divs and other containers — recurse
      if (['table', 'tbody', 'tr', 'td', 'th'].includes(tag)) return; // skip email tables

      // Anything else with children — recurse
      if (node.children.length > 0) {
        Array.from(node.children).forEach(processNode);
      } else {
        const text = node.textContent?.trim();
        if (text) blocks.push({ id: uid(), type: 'text', content: text });
      }
    }

    Array.from(doc.body.children).forEach(processNode);
    return blocks.length > 0 ? blocks : [];
  } catch {
    // Fallback: single text block with raw content (stripped tags)
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return text ? [{ id: uid(), type: 'text', content: text }] : [];
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
