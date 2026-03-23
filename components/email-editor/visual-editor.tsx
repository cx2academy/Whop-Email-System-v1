'use client';

/**
 * components/email-editor/visual-editor.tsx
 * Drag-and-drop block editor. Props: { value, onChange }
 * Requires: @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
 *
 * Features:
 * - 7 block types: Heading, Text (rich), Button, Image, Divider, Spacer, Columns
 * - Inline rich text: bold, italic, link via floating toolbar on selection
 * - Pre-made templates
 * - Live preview toggle (iframe)
 * - Variable picker
 * - AI generation
 * - Portal menus (no clipping)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  PlusIcon, GripVerticalIcon, TrashIcon, SparklesIcon, EyeIcon, EyeOffIcon,
  TypeIcon, Heading2Icon, MousePointerClickIcon, ImageIcon, LayoutTemplateIcon,
  MinusIcon, MoveVerticalIcon, XIcon, BoldIcon, ItalicIcon, LinkIcon, Columns2Icon,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type BlockType = 'heading' | 'text' | 'button' | 'image' | 'divider' | 'spacer' | 'columns';

interface HeadingBlock { id: string; type: 'heading'; content: string; level: 1|2|3 }
interface TextBlock    { id: string; type: 'text';    content: string } // stores HTML
interface ButtonBlock  { id: string; type: 'button';  text: string; url: string; color: string; align: 'left'|'center'|'right' }
interface ImageBlock   { id: string; type: 'image';   src: string; alt: string }
interface DividerBlock { id: string; type: 'divider' }
interface SpacerBlock  { id: string; type: 'spacer';  height: number }
interface ColumnsBlock { id: string; type: 'columns'; left: string; right: string } // HTML in each column
type Block = HeadingBlock|TextBlock|ButtonBlock|ImageBlock|DividerBlock|SpacerBlock|ColumnsBlock;

let _n = 0;
function uid() { return `b_${Date.now()}_${++_n}`; }

function makeBlock(type: BlockType): Block {
  switch (type) {
    case 'heading': return { id:uid(), type:'heading', content:'Your headline here', level:2 };
    case 'text':    return { id:uid(), type:'text',    content:'Write your content here.' };
    case 'button':  return { id:uid(), type:'button',  text:'Click here →', url:'https://', color:'#22C55E', align:'center' };
    case 'image':   return { id:uid(), type:'image',   src:'', alt:'' };
    case 'divider': return { id:uid(), type:'divider' };
    case 'spacer':  return { id:uid(), type:'spacer',  height:24 };
    case 'columns': return { id:uid(), type:'columns', left:'Left column content.', right:'Right column content.' };
  }
}

// ── HTML conversion ───────────────────────────────────────────────────────────

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

function blocksToHtml(blocks: Block[]): string {
  return blocks.map(b => {
    switch (b.type) {
      case 'heading': {
        const sz = ({1:'28px',2:'22px',3:'18px'} as Record<number,string>)[b.level];
        return `<h${b.level} style="font-family:${FONT};font-size:${sz};font-weight:700;color:#111827;margin:0 0 14px;line-height:1.2">${b.content}</h${b.level}>`;
      }
      case 'text':
        return `<p style="font-family:${FONT};font-size:15px;line-height:1.75;color:#374151;margin:0 0 14px">${b.content}</p>`;
      case 'button': {
        const al = b.align==='center'?'text-align:center':b.align==='right'?'text-align:right':'text-align:left';
        return `<p style="${al};margin:24px 0"><a href="${ea(b.url)}" style="display:inline-block;background:${ea(b.color)};color:#fff;font-family:${FONT};font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none">${b.text}</a></p>`;
      }
      case 'image':
        return b.src ? `<p style="text-align:center;margin:20px 0"><img src="${ea(b.src)}" alt="${ea(b.alt)}" style="max-width:100%;height:auto;border-radius:8px"/></p>` : '';
      case 'divider':
        return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0"/>`;
      case 'spacer':
        return `<div style="height:${b.height}px;line-height:${b.height}px">&nbsp;</div>`;
      case 'columns':
        return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0"><tr>` +
          `<td width="48%" valign="top" style="font-family:${FONT};font-size:15px;line-height:1.75;color:#374151;padding-right:16px">${b.left}</td>` +
          `<td width="4%" style="font-size:0;line-height:0">&nbsp;</td>` +
          `<td width="48%" valign="top" style="font-family:${FONT};font-size:15px;line-height:1.75;color:#374151">${b.right}</td>` +
          `</tr></table>`;
    }
  }).filter(Boolean).join('\n');
}

function ea(s:string){ return s.replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function htmlToBlocks(html: string): Block[] {
  if (!html?.trim()) return [];
  try {
    const doc = new DOMParser().parseFromString(html,'text/html');
    const out: Block[] = [];
    function walk(el: Element) {
      const tag = el.tagName?.toLowerCase();
      if (!tag) return;
      if (['h1','h2','h3'].includes(tag)) {
        const t = el.textContent?.trim();
        if (t) out.push({ id:uid(), type:'heading', content:t, level:+tag[1] as 1|2|3 });
        return;
      }
      if (tag === 'hr') { out.push({ id:uid(), type:'divider' }); return; }
      if (tag === 'table') {
        const tds = el.querySelectorAll('td');
        if (tds.length >= 2) {
          out.push({ id:uid(), type:'columns', left:tds[0].innerHTML.trim(), right:tds[tds.length-1].innerHTML.trim() });
        }
        return;
      }
      if (tag === 'div') {
        const s = (el as HTMLElement).getAttribute('style') || '';
        if (s.includes('height:') && !el.textContent?.trim().replace('\u00a0','')) {
          const m = s.match(/height:(\d+)/);
          out.push({ id:uid(), type:'spacer', height:m?+m[1]:24 });
          return;
        }
        Array.from(el.children).forEach(walk);
        return;
      }
      if (tag === 'p') {
        const a = el.querySelector('a') as HTMLAnchorElement|null;
        if (a) {
          const bg = a.style.background || a.style.backgroundColor;
          if (bg && bg !== 'none' && bg !== 'transparent') {
            const pa = (el as HTMLElement).style.textAlign;
            out.push({ id:uid(), type:'button', text:a.textContent?.trim()||'Click', url:a.getAttribute('href')||'#', color:bg, align:pa==='right'?'right':pa==='left'?'left':'center' });
            return;
          }
        }
        const img = el.querySelector('img') as HTMLImageElement|null;
        if (img) { out.push({ id:uid(), type:'image', src:img.getAttribute('src')||'', alt:img.getAttribute('alt')||'' }); return; }
        const inner = el.innerHTML?.trim();
        if (inner) out.push({ id:uid(), type:'text', content:inner });
        return;
      }
      if (tag === 'img') {
        out.push({ id:uid(), type:'image', src:(el as HTMLImageElement).getAttribute('src')||'', alt:(el as HTMLImageElement).getAttribute('alt')||'' });
        return;
      }
      if (el.children.length) { Array.from(el.children).forEach(walk); return; }
      const t = el.textContent?.trim();
      if (t) out.push({ id:uid(), type:'text', content:t });
    }
    Array.from(doc.body.children).forEach(walk);
    return out;
  } catch { return []; }
}

// ── Tokens ────────────────────────────────────────────────────────────────────

const BG   = 'var(--surface-app,#F7F8FA)';
const CARD = 'var(--surface-card,#FFFFFF)';
const BD   = 'var(--sidebar-border,#E6E8EC)';
const BR   = 'var(--brand,#22C55E)';
const BBG  = 'rgba(34,197,94,0.07)';
const TX   = 'var(--text-primary,#0D0F12)';
const TX2  = 'var(--text-secondary,#5A6472)';
const TX3  = 'var(--text-tertiary,#9AA3AF)';
const RED  = '#EF4444';
const IS: React.CSSProperties = { width:'100%', padding:'8px 10px', fontSize:13, border:`1px solid ${BD}`, borderRadius:6, outline:'none', fontFamily:'inherit', color:TX, background:CARD, boxSizing:'border-box' };

const BLOCK_TYPES: [BlockType, string, React.ReactNode, string][] = [
  ['heading', 'Heading',  <Heading2Icon size={14}/>,          'Title or section header'],
  ['text',    'Text',     <TypeIcon size={14}/>,              'Paragraph with rich formatting'],
  ['button',  'Button',   <MousePointerClickIcon size={14}/>, 'Call-to-action button'],
  ['image',   'Image',    <ImageIcon size={14}/>,             'Photo or graphic'],
  ['columns', 'Columns',  <Columns2Icon size={14}/>,          'Two-column layout'],
  ['divider', 'Divider',  <MinusIcon size={14}/>,             'Horizontal rule'],
  ['spacer',  'Spacer',   <MoveVerticalIcon size={14}/>,      'Empty vertical space'],
];

// ── Templates ─────────────────────────────────────────────────────────────────

const TEMPLATES: { name: string; desc: string; blocks: () => Block[] }[] = [
  {
    name: 'Welcome email',
    desc: 'Greet new members warmly',
    blocks: () => [
      { id:uid(), type:'heading', content:"Welcome, {{firstName | fallback: 'friend'}}! 👋", level:2 },
      { id:uid(), type:'text',    content:"We're so glad you joined. Here's everything you need to get started and make the most of your membership." },
      { id:uid(), type:'button',  text:'Get started →', url:'https://', color:'#22C55E', align:'center' },
      { id:uid(), type:'divider' },
      { id:uid(), type:'text',    content:'Have questions? Just reply to this email — we read every one.' },
      { id:uid(), type:'text',    content:'– {{senderName}}' },
    ],
  },
  {
    name: 'Announcement',
    desc: 'Share a new drop or update',
    blocks: () => [
      { id:uid(), type:'heading', content:'🚀 Big news from {{companyName}}', level:2 },
      { id:uid(), type:'text',    content:"We've been working on something exciting and it's finally here. Here's what you need to know:" },
      { id:uid(), type:'text',    content:'<strong>What\'s new:</strong> Describe the update or launch here.<br><br><strong>Why it matters:</strong> Explain the benefit to your members.' },
      { id:uid(), type:'button',  text:'Check it out', url:'https://', color:'#22C55E', align:'center' },
      { id:uid(), type:'text',    content:'– {{senderName}}' },
    ],
  },
  {
    name: 'Re-engagement',
    desc: 'Win back inactive members',
    blocks: () => [
      { id:uid(), type:'heading', content:"Hey {{firstName | fallback: 'there'}}, we miss you", level:2 },
      { id:uid(), type:'text',    content:"It's been a while since we've seen you. We wanted to reach out and let you know what you've been missing." },
      { id:uid(), type:'columns', left:'<strong>New content</strong><br>We\'ve added new material since you last visited.', right:'<strong>Community updates</strong><br>Your fellow members have been busy.' },
      { id:uid(), type:'button',  text:'Come back and see', url:'https://', color:'#22C55E', align:'center' },
      { id:uid(), type:'text',    content:'– {{senderName}}' },
    ],
  },
  {
    name: 'Product launch',
    desc: 'Promote a new offer',
    blocks: () => [
      { id:uid(), type:'heading', content:'Introducing something new 🎉', level:2 },
      { id:uid(), type:'text',    content:'After months of work, we\'re finally ready to share this with you. And as a member, you\'re getting first access.' },
      { id:uid(), type:'text',    content:'<strong>What you get:</strong><br>• Benefit one<br>• Benefit two<br>• Benefit three' },
      { id:uid(), type:'button',  text:'Get early access', url:'https://', color:'#22C55E', align:'center' },
      { id:uid(), type:'divider' },
      { id:uid(), type:'text',    content:'<em>This offer expires soon — don\'t miss out.</em>' },
    ],
  },
  {
    name: 'Newsletter',
    desc: 'Weekly update format',
    blocks: () => [
      { id:uid(), type:'heading', content:'This week from {{companyName}}', level:2 },
      { id:uid(), type:'text',    content:"Here's what happened this week and what's worth your attention." },
      { id:uid(), type:'divider' },
      { id:uid(), type:'heading', content:'📌 Top story', level:3 },
      { id:uid(), type:'text',    content:'Write your main story or update here. Keep it focused and valuable.' },
      { id:uid(), type:'heading', content:'📎 Quick links', level:3 },
      { id:uid(), type:'text',    content:'<a href="https://">Link one</a> — Short description<br><a href="https://">Link two</a> — Short description' },
      { id:uid(), type:'divider' },
      { id:uid(), type:'text',    content:'Thanks for reading. See you next week.<br>– {{senderName}}' },
    ],
  },
  {
    name: 'Plain text',
    desc: 'Simple, personal email',
    blocks: () => [
      { id:uid(), type:'text', content:"Hey {{firstName | fallback: 'there'}}," },
      { id:uid(), type:'text', content:'Write your message here as if you\'re sending a personal email. No fancy formatting needed — just say what you want to say.' },
      { id:uid(), type:'text', content:'Let me know if you have any questions.' },
      { id:uid(), type:'text', content:'– {{senderName}}' },
    ],
  },
];

// ── Portal Menu ───────────────────────────────────────────────────────────────

interface MenuPos { top: number; left: number; openUp: boolean; }

function PortalMenu({ pos, onSelect, onClose }: { pos: MenuPos; onSelect:(t:BlockType)=>void; onClose:()=>void }) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('[data-bm]')) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const menuH = BLOCK_TYPES.length * 52 + 32;
  const top = pos.openUp ? pos.top - menuH : pos.top + 4;

  return createPortal(
    <div data-bm="1" style={{ position:'fixed', top, left:pos.left, zIndex:9999, background:CARD, border:`1px solid ${BD}`, borderRadius:10, boxShadow:'0 8px 32px rgba(0,0,0,0.12)', padding:6, minWidth:220 }}>
      <p style={{ fontSize:10, fontWeight:700, color:TX3, textTransform:'uppercase', letterSpacing:'0.07em', padding:'4px 8px 6px', margin:0 }}>Add block</p>
      {BLOCK_TYPES.map(([type, label, icon, desc]) => (
        <button key={type}
          onMouseDown={e => { e.preventDefault(); onSelect(type); }}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:7, border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
          onMouseEnter={e => (e.currentTarget.style.background = BG)}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <span style={{ color:TX2 }}>{icon}</span>
          <div>
            <p style={{ fontSize:13, fontWeight:600, color:TX, margin:0 }}>{label}</p>
            <p style={{ fontSize:11, color:TX3, margin:0 }}>{desc}</p>
          </div>
        </button>
      ))}
    </div>,
    document.body
  );
}

function AddBlockButton({ label, onSelect, style, children }: {
  label?: string; onSelect:(t:BlockType)=>void; style?: React.CSSProperties; children?: React.ReactNode;
}) {
  const [pos, setPos] = useState<MenuPos|null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  function toggle() {
    if (pos) { setPos(null); return; }
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    setPos({ top: r.bottom, left: r.left, openUp: window.innerHeight - r.bottom < 380 });
  }
  return (
    <>
      <button ref={ref} onClick={toggle} style={style}>
        {children ?? <><PlusIcon size={13}/> {label ?? 'Add block'}</>}
      </button>
      {pos && <PortalMenu pos={pos} onSelect={t => { onSelect(t); setPos(null); }} onClose={() => setPos(null)} />}
    </>
  );
}

// ── Template modal ────────────────────────────────────────────────────────────

function TemplateModal({ onSelect, onClose }: { onSelect:(blocks:Block[])=>void; onClose:()=>void }) {
  return createPortal(
    <div style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={onClose}
    >
      <div style={{ background:CARD, borderRadius:16, padding:24, maxWidth:620, width:'100%', maxHeight:'80vh', overflow:'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:700, color:TX, margin:0, fontFamily:"'Bricolage Grotesque',system-ui,sans-serif" }}>Choose a template</h2>
            <p style={{ fontSize:13, color:TX2, margin:'4px 0 0' }}>Start with a pre-built layout, then customise it</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:TX3 }}><XIcon size={18}/></button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {TEMPLATES.map(t => (
            <button key={t.name}
              onClick={() => { onSelect(t.blocks()); onClose(); }}
              style={{ textAlign:'left', padding:'16px', borderRadius:10, border:`1px solid ${BD}`, background:'none', cursor:'pointer', fontFamily:'inherit', transition:'border-color 0.12s,background 0.12s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = BR; (e.currentTarget as HTMLElement).style.background = BBG; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = BD; (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              <p style={{ fontSize:14, fontWeight:700, color:TX, margin:'0 0 4px' }}>{t.name}</p>
              <p style={{ fontSize:12, color:TX3, margin:0 }}>{t.desc}</p>
            </button>
          ))}
          {/* Blank */}
          <button
            onClick={() => { onSelect([]); onClose(); }}
            style={{ textAlign:'left', padding:'16px', borderRadius:10, border:`1px dashed ${BD}`, background:'none', cursor:'pointer', fontFamily:'inherit', transition:'border-color 0.12s' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = BR)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = BD)}
          >
            <p style={{ fontSize:14, fontWeight:700, color:TX, margin:'0 0 4px' }}>Blank</p>
            <p style={{ fontSize:12, color:TX3, margin:0 }}>Start from scratch</p>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props { value: string; onChange: (html: string) => void; }

export function VisualEditor({ value, onChange }: Props) {
  const [blocks,       setBlocks]       = useState<Block[]>([]);
  const [selId,        setSelId]        = useState<string|null>(null);
  const [showAI,       setShowAI]       = useState(false);
  const [showTemplates,setShowTemplates]= useState(false);
  const [showPreview,  setShowPreview]  = useState(false);
  const [previewHtml,  setPreviewHtml]  = useState('');
  const [aiProd,  setAiProd]  = useState('');
  const [aiAud,   setAiAud]   = useState('');
  const [aiGoal,  setAiGoal]  = useState('');
  const [aiLoad,  setAiLoad]  = useState(false);
  const [aiErr,   setAiErr]   = useState('');
  const inited = useRef(false);

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const p = htmlToBlocks(value);
    const initial = p.length > 0 ? p : [
      { id:uid(), type:'heading' as const, content:"Hello {{firstName | fallback: 'there'}}!", level:2 as const },
      { id:uid(), type:'text' as const,    content:'Write your email content here. Keep it personal, valuable, and to the point.' },
      { id:uid(), type:'button' as const,  text:'Click here →', url:'https://', color:'#22C55E', align:'center' as const },
      { id:uid(), type:'text' as const,    content:'– {{senderName}}' },
    ];
    setBlocks(initial);
    setPreviewHtml(blocksToHtml(initial));
  }, []); // eslint-disable-line

  const push = useCallback((fn: (p:Block[])=>Block[]) => {
    setBlocks(prev => {
      const next = fn(prev);
      const html = blocksToHtml(next);
      onChange(html);
      setPreviewHtml(html);
      return next;
    });
  }, [onChange]);

  function addBlock(type: BlockType, afterId?: string) {
    const b = makeBlock(type);
    push(prev => {
      if (!afterId) return [...prev, b];
      const i = prev.findIndex(x => x.id === afterId);
      const n = [...prev]; n.splice(i+1, 0, b); return n;
    });
    setSelId(b.id);
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    push(prev => prev.map(b => b.id === id ? { ...b, ...patch } as Block : b));
  }

  function deleteBlock(id: string) {
    push(prev => prev.filter(b => b.id !== id));
    if (selId === id) setSelId(null);
  }

  function loadTemplate(newBlocks: Block[]) {
    push(() => newBlocks.length > 0 ? newBlocks : [
      { id:uid(), type:'heading', content:'Your headline', level:2 },
      { id:uid(), type:'text',    content:'Start writing here.' },
    ]);
    setSelId(null);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint:{ distance:5 } }));
  function onDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id)
      push(prev => arrayMove(prev, prev.findIndex(b=>b.id===active.id), prev.findIndex(b=>b.id===over.id)));
  }

  async function handleGenerate() {
    if (!aiProd.trim()||!aiAud.trim()||!aiGoal.trim()) { setAiErr('Fill in all three fields.'); return; }
    setAiLoad(true); setAiErr('');
    try {
      const { generateEmailBlocks } = await import('@/lib/ai/block-generator');
      const r = await generateEmailBlocks({ subject:'Email campaign', product:aiProd, audience:aiAud, goal:aiGoal });
      if (!r.success) { setAiErr(r.error); return; }
      const p = htmlToBlocks(r.data.htmlBody);
      if (p.length) { push(() => p); setShowAI(false); setSelId(null); }
      else setAiErr('Could not parse result. Try again.');
    } catch { setAiErr('Something went wrong.'); }
    finally { setAiLoad(false); }
  }

  const toolbarBtn: React.CSSProperties = { display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:7, border:`1px solid ${BD}`, background:CARD, cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600, color:TX2 };

  return (
    <div style={{ display:'flex', flexDirection:'column', background:BG }}>

      {/* ── Toolbar ── */}
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', background:CARD, borderBottom:`1px solid ${BD}`, flexShrink:0, flexWrap:'wrap' }}>
        <AddBlockButton onSelect={t => addBlock(t)} style={{ ...toolbarBtn, color:TX, fontWeight:700 }}/>

        <button onClick={() => setShowTemplates(true)} style={toolbarBtn}>
          <LayoutTemplateIcon size={13}/> Templates
        </button>

        <div style={{ width:1, height:18, background:BD, margin:'0 2px' }}/>

        <button onClick={() => setShowAI(s => !s)}
          style={{ ...toolbarBtn, border:`1px solid rgba(34,197,94,0.3)`, background:showAI?BBG:CARD, color:BR }}>
          <SparklesIcon size={13}/> Generate with AI
        </button>

        <div style={{ flex:1 }}/>

        <button onClick={() => setShowPreview(s => !s)}
          style={{ ...toolbarBtn, background:showPreview?BBG:CARD, borderColor:showPreview?BR:BD, color:showPreview?BR:TX2 }}>
          {showPreview ? <EyeOffIcon size={13}/> : <EyeIcon size={13}/>}
          {showPreview ? 'Hide preview' : 'Preview'}
        </button>
      </div>

      <div style={{ display:'flex' }}>

        {/* ── Left: Editor ── */}
        <div style={{ flex:1, minWidth:0 }}>

          {/* AI panel */}
          {showAI && (
            <div style={{ background:CARD, borderBottom:`1px solid ${BD}`, padding:16 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:600, color:TX, margin:0 }}>Generate email with AI</p>
                  <p style={{ fontSize:11, color:TX3, margin:'2px 0 0' }}>Replaces current content · uses 5 AI credits</p>
                </div>
                <button onClick={() => setShowAI(false)} style={{ background:'none', border:'none', cursor:'pointer', color:TX3 }}><XIcon size={14}/></button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
                {([['What you sell',aiProd,setAiProd,'e.g. real estate course'],["Who it's for",aiAud,setAiAud,'e.g. beginners'],['Goal',aiGoal,setAiGoal,'e.g. join my course']] as const).map(([label,val,set,ph])=>(
                  <div key={label}>
                    <label style={{ fontSize:11, fontWeight:600, color:TX2, display:'block', marginBottom:3 }}>{label}</label>
                    <input value={val as string} onChange={e=>(set as (v:string)=>void)(e.target.value)} placeholder={ph} style={IS}/>
                  </div>
                ))}
              </div>
              {aiErr && <p style={{ fontSize:12, color:RED, margin:'0 0 8px' }}>{aiErr}</p>}
              <button onClick={handleGenerate} disabled={aiLoad}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:7, border:'none', background:BR, color:'#fff', fontSize:13, fontWeight:600, cursor:aiLoad?'wait':'pointer', opacity:aiLoad?0.7:1, fontFamily:'inherit' }}>
                <SparklesIcon size={13}/>{aiLoad?'Generating…':'Generate'}
              </button>
            </div>
          )}

          {/* Canvas */}
          <div style={{ padding:'16px 24px' }} onClick={() => setSelId(null)}>
            <div style={{ maxWidth:560, margin:'0 auto' }} onClick={e => e.stopPropagation()}>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={blocks.map(b=>b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map(block => (
                    <SBlock
                      key={block.id} block={block} selected={selId===block.id}
                      onSelect={() => setSelId(selId===block.id ? null : block.id)}
                      onUpdate={p => updateBlock(block.id,p)}
                      onDelete={() => deleteBlock(block.id)}
                      onAddAfter={t => addBlock(t, block.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {blocks.length === 0 && (
                <AddBlockButton onSelect={t => addBlock(t)}
                  style={{ width:'100%', padding:'40px 20px', border:`2px dashed ${BD}`, borderRadius:10, background:'transparent', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:8, color:TX3, fontSize:13, fontFamily:'inherit' }}>
                  <PlusIcon size={20} style={{ opacity:0.4 }}/>
                  <span>Click to add your first block</span>
                </AddBlockButton>
              )}
              {blocks.length > 0 && (
                <AddBlockButton onSelect={t => addBlock(t)}
                  style={{ width:'100%', padding:8, borderRadius:7, border:`1px dashed ${BD}`, background:'transparent', cursor:'pointer', fontSize:12, color:TX3, display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontFamily:'inherit', marginTop:6 }}/>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: Preview panel ── */}
        {showPreview && (
          <div style={{ width:320, borderLeft:`1px solid ${BD}`, background:'#0B1221', display:'flex', flexDirection:'column', flexShrink:0 }}>
            <div style={{ padding:'8px 12px', borderBottom:`1px solid rgba(255,255,255,0.08)`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Preview</span>
              <div style={{ display:'flex', gap:4 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#EF4444' }}/>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#F59E0B' }}/>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#22C55E' }}/>
              </div>
            </div>
            <div style={{ flex:1, overflow:'auto' }}>
              <iframe
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"/><style>*{box-sizing:border-box}body{margin:0;padding:16px;background:#fff;font-family:-apple-system,sans-serif;font-size:15px;color:#111827;line-height:1.75}h1,h2,h3{margin:0 0 14px;line-height:1.2}p{margin:0 0 14px}a{color:#2563eb}hr{border:none;border-top:1px solid #e5e7eb;margin:28px 0}table{width:100%}strong{font-weight:600}em{font-style:italic}</style></head><body>${previewHtml}</body></html>`}
                style={{ width:'100%', height:'100%', border:'none', minHeight:400 }}
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showTemplates && <TemplateModal onSelect={loadTemplate} onClose={() => setShowTemplates(false)} />}
    </div>
  );
}

// ── SortableBlock ─────────────────────────────────────────────────────────────

function SBlock({ block, selected, onSelect, onUpdate, onDelete, onAddAfter }: {
  block:Block; selected:boolean;
  onSelect:()=>void; onUpdate:(p:Partial<Block>)=>void; onDelete:()=>void; onAddAfter:(t:BlockType)=>void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id:block.id });
  return (
    <div ref={setNodeRef} style={{ transform:CSS.Transform.toString(transform), transition, opacity:isDragging?0.4:1, marginBottom:6 }}>
      <div onClick={onSelect}
        style={{ position:'relative', borderRadius:8, border:selected?`2px solid ${BR}`:`1px solid transparent`, background:selected?BBG:'transparent', padding:'2px 4px 2px 26px', cursor:'pointer', transition:'border-color 0.12s,background 0.12s' }}
        onMouseEnter={e => { if(!selected)(e.currentTarget as HTMLElement).style.borderColor=BD; }}
        onMouseLeave={e => { if(!selected)(e.currentTarget as HTMLElement).style.borderColor='transparent'; }}
      >
        <div {...attributes}{...listeners} style={{ position:'absolute', left:4, top:'50%', transform:'translateY(-50%)', cursor:'grab', color:TX3, opacity:selected?1:0, transition:'opacity 0.12s', padding:'4px 2px' }} onClick={e=>e.stopPropagation()}>
          <GripVerticalIcon size={12}/>
        </div>
        {!selected && <BlockPreview block={block}/>}
        {selected && (
          <div onClick={e=>e.stopPropagation()}>
            <BlockEdit block={block} onUpdate={onUpdate}/>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, paddingTop:8, borderTop:`1px solid ${BD}` }}>
              <button onClick={onDelete} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:5, border:`1px solid ${BD}`, background:'none', cursor:'pointer', fontSize:11, color:RED, fontFamily:'inherit' }}>
                <TrashIcon size={11}/> Delete
              </button>
              <div style={{ flex:1 }}/>
              <AddBlockButton label="Add below" onSelect={onAddAfter}
                style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:5, border:`1px solid ${BD}`, background:'none', cursor:'pointer', fontSize:11, color:TX2, fontFamily:'inherit' }}/>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── BlockPreview ──────────────────────────────────────────────────────────────

function BlockPreview({ block }: { block:Block }) {
  switch (block.type) {
    case 'heading': return <div style={{ fontFamily:"'Bricolage Grotesque',system-ui,sans-serif", fontSize:block.level===1?22:block.level===2?18:15, fontWeight:700, color:TX, padding:'6px 0', lineHeight:1.2 }}>{block.content||<span style={{color:TX3}}>Heading…</span>}</div>;
    case 'text':    return <div style={{ fontSize:14, color:TX2, padding:'5px 0', lineHeight:1.6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} dangerouslySetInnerHTML={{__html:block.content||`<span style="color:${TX3}">Paragraph…</span>`}}/>;
    case 'button':  return <div style={{ textAlign:block.align, padding:'8px 0' }}><span style={{ display:'inline-block', background:block.color, color:'#fff', padding:'8px 20px', borderRadius:7, fontSize:13, fontWeight:600 }}>{block.text||'Button'}</span></div>;
    case 'image':   return <div style={{ textAlign:'center', padding:'8px 0' }}>{block.src?<img src={block.src} alt={block.alt} style={{maxWidth:'100%',maxHeight:100,borderRadius:6,objectFit:'cover'}}/>:<div style={{height:56,border:`1px dashed ${BD}`,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:TX3,fontSize:12,gap:6}}><ImageIcon size={14}/> No image uploaded</div>}</div>;
    case 'divider': return <hr style={{ border:'none', borderTop:`1px solid ${BD}`, margin:'10px 0' }}/>;
    case 'spacer':  return <div style={{ height:Math.min(block.height,36), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:TX3, gap:4 }}><MoveVerticalIcon size={12}/>{block.height}px spacer</div>;
    case 'columns': return (
      <div style={{ display:'flex', gap:12, padding:'6px 0' }}>
        <div style={{ flex:1, fontSize:13, color:TX2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', border:`1px dashed ${BD}`, borderRadius:5, padding:'4px 8px' }} dangerouslySetInnerHTML={{__html:block.left}}/>
        <div style={{ flex:1, fontSize:13, color:TX2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', border:`1px dashed ${BD}`, borderRadius:5, padding:'4px 8px' }} dangerouslySetInnerHTML={{__html:block.right}}/>
      </div>
    );
  }
}

// ── BlockEdit ─────────────────────────────────────────────────────────────────

function BlockEdit({ block, onUpdate }: { block:Block; onUpdate:(p:Partial<Block>)=>void }) {
  switch (block.type) {
    case 'heading':
      return (
        <div style={{ paddingTop:4 }}>
          <div style={{ display:'flex', gap:5, marginBottom:8 }}>
            {([1,2,3] as const).map(l=>(
              <button key={l} onClick={()=>onUpdate({level:l})} style={{ padding:'3px 8px', borderRadius:5, border:`1px solid ${BD}`, fontSize:11, fontWeight:700, fontFamily:'inherit', cursor:'pointer', background:block.level===l?BR:'none', color:block.level===l?'#fff':TX2 }}>H{l}</button>
            ))}
          </div>
          <VarInput value={block.content} onChange={v=>onUpdate({content:v})} placeholder="Heading text…" autoFocus/>
        </div>
      );
    case 'text':
      return <RichTextEdit value={block.content} onChange={v=>onUpdate({content:v})}/>;
    case 'button':
      return (
        <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:4 }}>
          <input value={block.text} onChange={e=>onUpdate({text:e.target.value})} style={IS} placeholder="Button label"/>
          <input value={block.url}  onChange={e=>onUpdate({url:e.target.value})}  style={IS} placeholder="https://..."/>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <label style={{ fontSize:11, color:TX2 }}>Color</label>
            <input type="color" value={block.color} onChange={e=>onUpdate({color:e.target.value})} style={{ width:32, height:28, border:`1px solid ${BD}`, borderRadius:5, cursor:'pointer', padding:2 }}/>
            <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
              {(['left','center','right'] as const).map(a=>(
                <button key={a} onClick={()=>onUpdate({align:a})} style={{ padding:'3px 7px', borderRadius:4, border:`1px solid ${BD}`, fontSize:10, fontFamily:'inherit', cursor:'pointer', background:block.align===a?BR:'none', color:block.align===a?'#fff':TX2 }}>{a[0].toUpperCase()+a.slice(1)}</button>
              ))}
            </div>
          </div>
        </div>
      );
    case 'image': return <ImageEdit block={block} onUpdate={onUpdate}/>;
    case 'divider': return <p style={{ fontSize:12, color:TX3, padding:'4px 0', margin:0 }}>Horizontal divider — no settings.</p>;
    case 'spacer':
      return (
        <div style={{ display:'flex', alignItems:'center', gap:10, paddingTop:4 }}>
          <label style={{ fontSize:12, color:TX2 }}>Height: {block.height}px</label>
          <input type="range" min={8} max={120} step={4} value={block.height} onChange={e=>onUpdate({height:+e.target.value})} style={{ flex:1 }}/>
        </div>
      );
    case 'columns':
      return (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, paddingTop:4 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:TX2, display:'block', marginBottom:4 }}>Left column</label>
            <RichTextEdit value={block.left} onChange={v=>onUpdate({left:v})} placeholder="Left column content…"/>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:600, color:TX2, display:'block', marginBottom:4 }}>Right column</label>
            <RichTextEdit value={block.right} onChange={v=>onUpdate({right:v})} placeholder="Right column content…"/>
          </div>
        </div>
      );
  }
}

// ── RichTextEdit — contentEditable with floating toolbar ──────────────────────

function RichTextEdit({ value, onChange, placeholder }: { value:string; onChange:(v:string)=>void; placeholder?:string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<{top:number;left:number}|null>(null);
  const syncing = useRef(false);

  // Set initial HTML once
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, []); // eslint-disable-line

  function sync() {
    if (ref.current && !syncing.current) {
      syncing.current = true;
      onChange(ref.current.innerHTML);
      syncing.current = false;
    }
  }

  function checkSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !ref.current?.contains(sel.anchorNode)) {
      setToolbar(null);
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0) { setToolbar(null); return; }
    setToolbar({ top: rect.top - 4, left: rect.left + rect.width / 2 });
  }

  function exec(cmd: string, val?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    sync();
  }

  function insertLink() {
    const url = prompt('URL:', 'https://');
    if (url) exec('createLink', url);
  }

  return (
    <div style={{ position:'relative' }}>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={() => { sync(); setTimeout(()=>setToolbar(null), 150); }}
        onMouseUp={checkSelection}
        onKeyUp={checkSelection}
        data-ph={placeholder || 'Write here…'}
        style={{
          minHeight:80, padding:'8px 10px', fontSize:13, lineHeight:1.7,
          border:`1px solid ${BD}`, borderRadius:6, outline:'none',
          color:TX, background:CARD, fontFamily:'inherit',
        }}
      />
      <VarPicker onInsert={v => { ref.current?.focus(); document.execCommand('insertText', false, v); sync(); }} />

      {/* Floating rich text toolbar */}
      {toolbar && createPortal(
        <div style={{
          position:'fixed', top:toolbar.top - 36, left:toolbar.left,
          transform:'translateX(-50%)',
          zIndex:9999, background:'#1a1a2e', borderRadius:8,
          display:'flex', gap:2, padding:'4px 6px',
          boxShadow:'0 4px 16px rgba(0,0,0,0.3)',
        }}>
          {[
            { cmd:'bold',      icon:<BoldIcon size={13}/>,    title:'Bold' },
            { cmd:'italic',    icon:<ItalicIcon size={13}/>,  title:'Italic' },
          ].map(({ cmd, icon, title }) => (
            <button key={cmd} title={title}
              onMouseDown={e => { e.preventDefault(); exec(cmd); }}
              style={{ padding:'3px 6px', borderRadius:5, border:'none', background:'none', cursor:'pointer', color:'rgba(255,255,255,0.85)' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.1)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background='none')}
            >{icon}</button>
          ))}
          <div style={{ width:1, background:'rgba(255,255,255,0.2)', margin:'2px 2px' }}/>
          <button title="Link" onMouseDown={e => { e.preventDefault(); insertLink(); }}
            style={{ padding:'3px 6px', borderRadius:5, border:'none', background:'none', cursor:'pointer', color:'rgba(255,255,255,0.85)' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.1)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background='none')}
          ><LinkIcon size={13}/></button>
          <button title="Remove formatting" onMouseDown={e => { e.preventDefault(); exec('removeFormat'); }}
            style={{ padding:'3px 6px', borderRadius:5, border:'none', background:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', fontSize:11, fontFamily:'inherit' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.1)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background='none')}
          >✕</button>
        </div>,
        document.body
      )}

      <style>{`[data-ph]:empty:before{content:attr(data-ph);color:${TX3};pointer-events:none}`}</style>
    </div>
  );
}

// ── Variable picker ───────────────────────────────────────────────────────────

const VARS = [
  { label:'First name',  value:"{{firstName | fallback: 'there'}}" },
  { label:'Full name',   value:'{{fullName}}' },
  { label:'Email',       value:'{{email}}' },
  { label:'Sender name', value:'{{senderName}}' },
  { label:'Company',     value:'{{companyName}}' },
  { label:'Unsubscribe', value:'{{unsubscribeUrl}}' },
];

function VarPicker({ onInsert }: { onInsert:(v:string)=>void }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const h = (e:MouseEvent) => { if (!(e.target as HTMLElement).closest('[data-vp]')) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div data-vp="1" style={{ position:'relative', display:'inline-block', marginTop:4 }}>
      <button type="button" onMouseDown={e => { e.preventDefault(); setOpen(o=>!o); }}
        style={{ display:'flex', alignItems:'center', gap:4, padding:'3px 8px', borderRadius:5, border:`1px solid ${BD}`, background:'none', cursor:'pointer', fontFamily:'inherit', fontSize:11, color:TX2 }}>
        {'{ }'} Variables
      </button>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, zIndex:200, marginTop:4, background:CARD, border:`1px solid ${BD}`, borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.1)', padding:6, minWidth:220 }}>
          <p style={{ fontSize:10, fontWeight:700, color:TX3, textTransform:'uppercase', letterSpacing:'0.07em', padding:'4px 8px 6px', margin:0 }}>Insert variable</p>
          {VARS.map(v => (
            <button key={v.value} type="button"
              onMouseDown={e => { e.preventDefault(); onInsert(v.value); setOpen(false); }}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'6px 10px', borderRadius:6, border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
              onMouseEnter={e=>(e.currentTarget.style.background=BG)} onMouseLeave={e=>(e.currentTarget.style.background='none')}
            >
              <span style={{ fontSize:13, fontWeight:600, color:TX }}>{v.label}</span>
              <code style={{ fontSize:10, color:TX3, background:BG, padding:'2px 5px', borderRadius:4 }}>{v.value.replace(/\{\{|\}\}/g,'').split('|')[0].trim()}</code>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// VarInput for heading blocks
function VarInput({ value, onChange, placeholder, autoFocus }: { value:string; onChange:(v:string)=>void; placeholder?:string; autoFocus?:boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const pendingCursor = useRef<number|null>(null);
  useEffect(() => {
    if (pendingCursor.current !== null && ref.current) {
      ref.current.selectionStart = ref.current.selectionEnd = pendingCursor.current;
      pendingCursor.current = null;
    }
  });
  function handleInsert(v:string) {
    if (!ref.current) { onChange(value+v); return; }
    const start = ref.current.selectionStart ?? value.length;
    const end   = ref.current.selectionEnd   ?? value.length;
    const next  = value.slice(0,start)+v+value.slice(end);
    pendingCursor.current = start + v.length;
    onChange(next);
    setTimeout(()=>ref.current?.focus(), 0);
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <input ref={ref} autoFocus={autoFocus} value={value} onChange={e=>onChange(e.target.value)} style={IS} placeholder={placeholder}/>
      <VarPicker onInsert={handleInsert}/>
    </div>
  );
}

// ── ImageEdit ─────────────────────────────────────────────────────────────────

function ImageEdit({ block, onUpdate }: { block:ImageBlock; onUpdate:(p:Partial<Block>)=>void }) {
  const [dragging, setDragging] = useState(false);
  function handleFile(file:File) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => onUpdate({ src: e.target?.result as string });
    reader.readAsDataURL(file);
  }
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:4 }}>
      <label
        onDragOver={e=>{e.preventDefault();setDragging(true);}}
        onDragLeave={()=>setDragging(false)}
        onDrop={e=>{e.preventDefault();setDragging(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
        style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, padding:'20px 16px', borderRadius:8, cursor:'pointer', border:`2px dashed ${dragging?BR:BD}`, background:dragging?BBG:BG, transition:'all 0.15s' }}
      >
        <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f)handleFile(f);}}/>
        {block.src ? (
          <img src={block.src} alt={block.alt} style={{ maxWidth:'100%', maxHeight:140, borderRadius:6, objectFit:'contain' }}/>
        ) : (
          <><ImageIcon size={20} style={{color:TX3}}/><p style={{fontSize:12,color:TX2,margin:0,fontWeight:600}}>Click to upload or drag & drop</p><p style={{fontSize:11,color:TX3,margin:0}}>PNG, JPG, GIF, WebP</p></>
        )}
      </label>
      {block.src && <button onClick={()=>onUpdate({src:''})} style={{ fontSize:11, color:RED, background:'none', border:`1px solid ${BD}`, borderRadius:5, padding:'3px 8px', cursor:'pointer', fontFamily:'inherit', alignSelf:'flex-start' }}>Remove image</button>}
      <input value={block.alt} onChange={e=>onUpdate({alt:e.target.value})} style={IS} placeholder="Alt text (for accessibility)"/>
    </div>
  );
}
