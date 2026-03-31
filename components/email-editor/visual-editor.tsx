'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  PlusIcon, GripVerticalIcon, TrashIcon, EyeIcon, EyeOffIcon,
  TypeIcon, Heading2Icon, MousePointerClickIcon, ImageIcon,
  MinusIcon, MoveVerticalIcon, XIcon, BoldIcon, ItalicIcon, LinkIcon, Columns2Icon,
  AlignLeftIcon, AlignCenterIcon, AlignRightIcon, MonitorIcon, SmartphoneIcon, ChevronLeftIcon, ZapIcon
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type BlockType = 'heading' | 'text' | 'button' | 'image' | 'divider' | 'spacer' | 'columns';

interface HeadingBlock { id: string; type: 'heading'; content: string; level: 1|2|3; padding?: number }
interface TextBlock    { id: string; type: 'text';    content: string; padding?: number } 
interface ButtonBlock  { id: string; type: 'button';  text: string; url: string; color: string; align: 'left'|'center'|'right'; padding?: number }
interface ImageBlock   { id: string; type: 'image';   src: string; alt: string; url?: string; padding?: number }
interface DividerBlock { id: string; type: 'divider'; padding?: number }
interface SpacerBlock  { id: string; type: 'spacer';  height: number; padding?: number }
interface ColumnsBlock { id: string; type: 'columns'; left: string; right: string; padding?: number } 
type Block = HeadingBlock|TextBlock|ButtonBlock|ImageBlock|DividerBlock|SpacerBlock|ColumnsBlock;

let _n = 0;
function uid() { return `b_${Date.now()}_${++_n}`; }

function makeBlock(type: BlockType): Block {
  const common = { padding: 16 };
  switch (type) {
    case 'heading': return { id:uid(), type:'heading', content:'Your headline here', level:2, ...common };
    case 'text':    return { id:uid(), type:'text',    content:'Write your content here. Keep it personal, valuable, and to the point.', ...common };
    case 'button':  return { id:uid(), type:'button',  text:'Claim your offer →', url:'https://', color:'#22C55E', align:'center', ...common };
    case 'image':   return { id:uid(), type:'image',   src:'', alt:'', ...common };
    case 'divider': return { id:uid(), type:'divider', ...common };
    case 'spacer':  return { id:uid(), type:'spacer',  height:32, ...common };
    case 'columns': return { id:uid(), type:'columns', left:'Left column content. Add details here.', right:'Right column content. Add details here.', ...common };
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
        return `<div style="font-family:${FONT};font-size:15px;line-height:1.75;color:#374151;margin:0 0 14px">${b.content}</div>`;
      case 'button': {
        const al = b.align==='center'?'text-align:center':b.align==='right'?'text-align:right':'text-align:left';
        return `<div style="${al};margin:24px 0"><a href="${ea(b.url)}" style="display:inline-block;background:${ea(b.color)};color:#fff;font-family:${FONT};font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none">${b.text}</a></div>`;
      }
      case 'image':
        const imgTag = `<img src="${ea(b.src)}" alt="${ea(b.alt)}" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:0 auto"/>`;
        return b.src ? `<div style="text-align:center;margin:20px 0">${b.url ? `<a href="${ea(b.url)}" target="_blank">${imgTag}</a>` : imgTag}</div>` : '';
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
      if (tag === 'div' || tag === 'p') {
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
        if (img) { 
          out.push({ id:uid(), type:'image', src:img.getAttribute('src')||'', alt:img.getAttribute('alt')||'', url: a?.getAttribute('href') || '' }); 
          return; 
        }
        const s = (el as HTMLElement).getAttribute('style') || '';
        if (s.includes('height:') && !el.textContent?.trim().replace('\u00a0','')) {
          const m = s.match(/height:(\d+)/);
          out.push({ id:uid(), type:'spacer', height:m?+m[1]:24 });
          return;
        }
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

// --- Helper: Convert Tags to Pills for contentEditable ---
function tagsToPills(html: string) {
  if (!html) return '';
  let i = 0;
  return html.replace(/\{\{([^}]+)\}\}/g, (match, content) => {
    const [tag, fallbackPart] = content.split('|').map((s:string) => s.trim());
    const fallback = fallbackPart?.startsWith('fallback:') ? fallbackPart.split(':')[1].trim().replace(/^['"]|['"]$/g, '') : '';
    return `<span class="variable-pill" data-tag="${tag}" data-fallback="${fallback}" data-vid="${i++}" contenteditable="false">${tag}</span>`;
  });
}

function pillsToTags(html: string) {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('.variable-pill').forEach(pill => {
    const tag = pill.getAttribute('data-tag');
    const fallback = pill.getAttribute('data-fallback');
    const text = fallback ? `{{${tag} | fallback: '${fallback}'}}` : `{{${tag}}}`;
    pill.replaceWith(document.createTextNode(text));
  });
  return div.innerHTML;
}

function updateTagInHtml(html: string, vid: number, newTag: string, newFallback: string) {
  let i = 0;
  return html.replace(/\{\{([^}]+)\}\}/g, (match) => {
    if (i++ === vid) {
      return newFallback ? `{{${newTag} | fallback: '${newFallback}'}}` : `{{${newTag}}}`;
    }
    return match;
  });
}

// --- Helper: Render Merge Tags as Visual Pills (React) ---
const renderContentWithTags = (text: string, isPreview = false, onSelectVariable?: (v: { tag: string; fallback: string; vid: number } | null) => void) => {
  if (!text) return null;
  
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  let vidCount = 0;
  return parts.map((part, i) => {
    if (part.startsWith('{{') && part.endsWith('}}')) {
      const currentVid = vidCount++;
      const content = part.slice(2, -2).trim();
      const [tag, fallbackPart] = content.split('|').map(s => s.trim());
      const fallback = fallbackPart?.startsWith('fallback:') ? fallbackPart.split(':')[1].trim().replace(/^['"]|['"]$/g, '') : '';
      
      if (isPreview) {
        return (
          <span key={i} className="text-emerald-600 font-semibold">
            {fallback || tag}
          </span>
        );
      }

      return (
        <span 
          key={i} 
          className="variable-pill cursor-pointer hover:bg-emerald-100 transition-colors"
          onClick={(e) => {
            if (onSelectVariable) {
              e.stopPropagation();
              onSelectVariable({ tag, fallback, vid: currentVid });
            }
          }}
        >
          {tag}
        </span>
      );
    }
    return <span key={i} dangerouslySetInnerHTML={{ __html: part }} />;
  });
};

const BLOCK_TYPES: [BlockType, string, React.ReactNode, string][] = [
  ['heading', 'Heading', <Heading2Icon size={18} />, 'Title or section header'],
  ['text', 'Text', <TypeIcon size={18} />, 'Paragraph with rich formatting'],
  ['button', 'Button', <MousePointerClickIcon size={18} />, 'Call-to-action button'],
  ['image', 'Image', <ImageIcon size={18} />, 'Photo or graphic'],
  ['columns', 'Columns', <Columns2Icon size={18} />, 'Two-column layout'],
  ['divider', 'Divider', <MinusIcon size={18} />, 'Horizontal rule'],
  ['spacer', 'Spacer', <MoveVerticalIcon size={18} />, 'Empty vertical space'],
];

function AddBetween({ onAdd }: { onAdd: (type: BlockType) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref]);

  return (
    <div className="relative h-2 group flex items-center justify-center my-1" ref={ref}>
      <div className="absolute inset-x-0 h-px bg-emerald-100 opacity-0 group-hover:opacity-100 transition-opacity" />
      <button 
        onClick={() => setOpen(!open)}
        className={`z-10 w-6 h-6 rounded-full bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center transition-all hover:scale-110 shadow-sm ${open ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <PlusIcon size={14} className={`transition-transform duration-200 ${open ? 'rotate-45' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-2 z-[100] bg-white rounded-xl shadow-2xl border border-gray-200 p-2 grid grid-cols-4 gap-1 w-[320px] animate-in fade-in zoom-in duration-200">
          {BLOCK_TYPES.map(([type, label, icon]) => (
            <button 
              key={type}
              onClick={() => { onAdd(type); setOpen(false); }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-emerald-50 transition-colors text-[10px] font-medium text-gray-600 hover:text-emerald-700"
            >
              <div className="p-2 bg-gray-50 rounded-md text-gray-400 group-hover:text-emerald-600">{icon}</div>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Global Styles Component ───────────────────────────────────────────────────

function GlobalStyles({ styles, onUpdate }: { styles: any; onUpdate: (s: any) => void }) {
  const Label = ({ children }: { children: React.ReactNode }) => <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">{children}</label>;
  const ColorInput = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-gray-200 shadow-sm">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-gray-400 uppercase">{value}</span>
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <Label>Colors</Label>
        <div className="space-y-2">
          <ColorInput label="Background" value={styles.backgroundColor} onChange={v => onUpdate({ ...styles, backgroundColor: v })} />
          <ColorInput label="Content BG" value={styles.contentBackgroundColor} onChange={v => onUpdate({ ...styles, contentBackgroundColor: v })} />
          <ColorInput label="Text Color" value={styles.textColor} onChange={v => onUpdate({ ...styles, textColor: v })} />
          <ColorInput label="Link Color" value={styles.linkColor} onChange={v => onUpdate({ ...styles, linkColor: v })} />
        </div>
      </div>

      <div>
        <Label>Typography</Label>
        <select 
          value={styles.fontFamily}
          onChange={e => onUpdate({ ...styles, fontFamily: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white shadow-sm appearance-none cursor-pointer"
        >
          <option value="Inter, sans-serif">Inter (Modern Sans)</option>
          <option value="'Playfair Display', serif">Playfair (Elegant Serif)</option>
          <option value="'JetBrains Mono', monospace">JetBrains (Technical Mono)</option>
          <option value="system-ui, sans-serif">System Default</option>
        </select>
      </div>

      <div>
        <Label>Corner Radius</Label>
        <div className="flex items-center gap-4">
          <input 
            type="range" min="0" max="32" value={styles.borderRadius} 
            onChange={e => onUpdate({ ...styles, borderRadius: parseInt(e.target.value) })}
            className="flex-1 accent-emerald-500"
          />
          <span className="text-xs font-mono text-gray-500 w-8">{styles.borderRadius}px</span>
        </div>
      </div>
    </div>
  );
}

interface Props { value: string; onChange: (html: string) => void; }

export function VisualEditor({ value, onChange }: Props) {
  const [blocks,       setBlocks]       = useState<Block[]>([]);
  const [selId,        setSelId]        = useState<string|null>(null);
  const [selVar,       setSelVar]       = useState<{ blockId: string; tag: string; fallback: string; vid: number } | null>(null);
  const [showPreview,  setShowPreview]  = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop'|'mobile'>('desktop');
  const [previewHtml,  setPreviewHtml]  = useState('');
  const [sidebarTab,   setSidebarTab]   = useState<'blocks'|'styles'>('blocks');
  const [globalStyles, setGlobalStyles] = useState({
    backgroundColor: '#F9FAFB',
    contentBackgroundColor: '#FFFFFF',
    fontFamily: 'Inter, sans-serif',
    textColor: '#374151',
    linkColor: '#10B981',
    borderRadius: 12,
  });
  const inited = useRef(false);

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const p = htmlToBlocks(value);
    const initial = p.length > 0 ? p : [
      { id:uid(), type:'heading' as const, content:"Hello {{firstName | fallback: 'there'}}!", level:2 as const },
      { id:uid(), type:'text' as const,    content:'Write your email content here. Keep it personal, valuable, and to the point.' },
      { id:uid(), type:'button' as const,  text:'Claim your offer', url:'https://', color:'#22C55E', align:'center' as const },
      { id:uid(), type:'text' as const,    content:'– {{senderName}}' },
    ];
    setBlocks(initial);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!inited.current) return;
    const html = blocksToHtml(blocks);
    onChange(html);
    setPreviewHtml(html);
  }, [blocks, onChange]);

  const push = useCallback((fn: (p:Block[])=>Block[]) => {
    setBlocks(prev => fn(prev));
  }, []);

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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint:{ distance:5 } }));
  function onDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id)
      push(prev => arrayMove(prev, prev.findIndex(b=>b.id===active.id), prev.findIndex(b=>b.id===over.id)));
  }

  const selectedBlock = blocks.find(b => b.id === selId);

  return (
    <div className="flex h-full w-full bg-white overflow-hidden relative">
      
      {/* ── Center: Canvas Area ── */}
      <div className="flex-1 min-w-0 flex flex-col relative bg-gray-50/50">
        
        {/* Top Bar for Toggle */}
        <div className="flex items-center justify-center py-2.5 border-b border-gray-200 bg-white shrink-0 relative shadow-sm z-10">
          <div className="flex items-center p-1 bg-gray-100/80 rounded-lg">
            <button 
              onClick={() => { setShowPreview(false); }}
              className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all ${!showPreview ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Edit
            </button>
            <button 
              onClick={() => { setShowPreview(true); setSelId(null); }}
              className={`px-5 py-1.5 rounded-md text-xs font-semibold transition-all ${showPreview ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-900/5' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Preview
            </button>
          </div>
          
          <div className="absolute right-4 flex items-center bg-gray-100/80 p-0.5 rounded-md border border-gray-200/60">
            <button 
              onClick={() => setPreviewDevice('desktop')} 
              className={`p-1.5 rounded-md transition-all ${previewDevice === 'desktop' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              title="Desktop View"
            >
              <MonitorIcon size={16} />
            </button>
            <button 
              onClick={() => setPreviewDevice('mobile')} 
              className={`p-1.5 rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              title="Mobile View"
            >
              <SmartphoneIcon size={16} />
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto ${showPreview || previewDevice === 'mobile' ? 'bg-gray-100/50 p-8' : 'bg-white'}`} style={{ backgroundColor: globalStyles.backgroundColor }} onClick={() => setSelId(null)}>
          <div 
            className={`mx-auto transition-all duration-300 ${
              showPreview 
                ? (previewDevice === 'mobile' 
                    ? 'w-[375px] bg-white rounded-[2.5rem] border-[12px] border-gray-900 h-[812px] overflow-y-auto shadow-2xl ring-1 ring-gray-200' 
                    : 'w-full max-w-[800px] bg-white rounded-xl shadow-lg ring-1 ring-gray-900/5 min-h-[600px] overflow-hidden')
                : (previewDevice === 'mobile'
                    ? 'w-[375px] bg-white rounded-[2.5rem] border-[12px] border-gray-900 h-[812px] overflow-y-auto shadow-2xl ring-1 ring-gray-200'
                    : 'w-full max-w-[700px] bg-white min-h-full py-12 px-4')
            }`}
            style={{ 
              backgroundColor: globalStyles.contentBackgroundColor,
              fontFamily: globalStyles.fontFamily,
              color: globalStyles.textColor,
              borderRadius: previewDevice === 'mobile' ? undefined : globalStyles.borderRadius 
            }}
            onClick={e => e.stopPropagation()}
          >
            {showPreview ? (
              <div className="flex flex-col h-full">
                {/* Mock Email Header */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                      RT
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">RevTray Team <span className="font-normal text-gray-500">&lt;hello@revtray.com&gt;</span></div>
                      <div className="text-[11px] text-gray-500">To: You &lt;customer@example.com&gt;</div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-gray-900 mt-2">
                    Your Campaign Subject Line
                  </div>
                </div>
                
                {/* Email Content */}
                <div className={`flex-1 overflow-y-auto ${previewDevice === 'mobile' ? 'p-4' : 'p-10'}`}>
                  <div className="prose prose-sm max-w-none" style={{ fontFamily: globalStyles.fontFamily, color: globalStyles.textColor }}>
                    {blocks.map(b => {
                      const pad = b.padding !== undefined ? `${b.padding}px` : '16px';
                      if (b.type === 'heading') {
                        const sz = ({1:'28px',2:'22px',3:'18px'} as Record<number,string>)[b.level];
                        return <h2 key={b.id} style={{fontFamily:globalStyles.fontFamily,fontSize:sz,fontWeight:700,color:globalStyles.textColor,margin:0,padding:pad,lineHeight:1.2}}>{renderContentWithTags(b.content, true)}</h2>;
                      }
                      if (b.type === 'text') {
                        return <div key={b.id} style={{fontFamily:globalStyles.fontFamily,fontSize:'15px',lineHeight:1.75,color:globalStyles.textColor,margin:0,padding:pad}}>{renderContentWithTags(b.content, true)}</div>;
                      }
                      if (b.type === 'button') {
                        const al = b.align==='center'?'center':b.align==='right'?'right':'left';
                        return <div key={b.id} style={{textAlign:al,padding:pad}}><a href={b.url} style={{display:'inline-block',background:b.color,color:'#fff',fontFamily:globalStyles.fontFamily,fontWeight:600,fontSize:'15px',padding:'12px 28px',borderRadius:'8px',textDecoration:'none'}}>{b.text}</a></div>;
                      }
                      if (b.type === 'image' && b.src) {
                        const img = <img src={b.src} alt={b.alt} style={{maxWidth:'100%',height:'auto',borderRadius:globalStyles.borderRadius,display:'block',margin:'0 auto'}}/>;
                        return <div key={b.id} style={{textAlign:'center',padding:pad}}>{b.url ? <a href={b.url} target="_blank">{img}</a> : img}</div>;
                      }
                      if (b.type === 'divider') return <div key={b.id} style={{padding:pad}}><hr style={{border:'none',borderTop:'1px solid #e5e7eb',margin:0}}/></div>;
                      if (b.type === 'spacer') return <div key={b.id} style={{height:`${b.height}px`}}>&nbsp;</div>;
                      if (b.type === 'columns') {
                        return (
                          <table key={b.id} width="100%" cellpadding="0" cellspacing="0" border={0} style={{padding:pad}}>
                            <tr>
                              <td width="48%" valign="top" style={{fontFamily:globalStyles.fontFamily,fontSize:'15px',lineHeight:1.75,color:globalStyles.textColor,paddingRight:'16px'}}>{renderContentWithTags(b.left, true)}</td>
                              <td width="4%" style={{fontSize:0,lineHeight:0}}>&nbsp;</td>
                              <td width="48%" valign="top" style={{fontFamily:globalStyles.fontFamily,fontSize:'15px',lineHeight:1.75,color:globalStyles.textColor}}>{renderContentWithTags(b.right, true)}</td>
                            </tr>
                          </table>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={blocks.map(b=>b.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-0.5">
                      <AddBetween onAdd={(type) => addBlock(type, undefined)} />
                      {blocks.map((block, idx) => (
                        <React.Fragment key={block.id}>
                          <SBlock
                            block={block} selected={selId===block.id}
                            globalStyles={globalStyles}
                            onSelect={() => { if (selId !== block.id) { setSelId(block.id); setSelVar(null); } }}
                            onUpdate={p => updateBlock(block.id,p)}
                            onDelete={() => deleteBlock(block.id)}
                            onSelectVariable={(v) => {
                              if (v) {
                                setSelId(block.id);
                                setSelVar({ ...v, blockId: block.id });
                              } else {
                                setSelVar(null);
                              }
                            }}
                          />
                          <AddBetween onAdd={(type) => addBlock(type, block.id)} />
                        </React.Fragment>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                
                <div className="mt-12 max-w-[600px] mx-auto">
                  <AddBlockButton onSelect={t => addBlock(t)} className="w-full flex items-center justify-center gap-2 px-5 py-6 rounded-xl text-sm font-medium bg-transparent border border-dashed border-gray-200 text-gray-400 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50/30 transition-all" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Combined Sidebar ── */}
      {!showPreview && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
          {selVar ? (
            <>
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelVar(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    title="Back to block settings"
                  >
                    <ChevronLeftIcon size={16} />
                  </button>
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Variable Settings</span>
                </div>
              </div>
              <div className="p-5 overflow-y-auto flex-1 bg-gray-50/30">
                <VariableProperties 
                  selVar={selVar} 
                  onUpdate={(tag, fallback) => {
                    setSelVar({ ...selVar, tag, fallback });
                    const block = blocks.find(b => b.id === selVar.blockId);
                    if (block) {
                      // We need to find which field contains the tag.
                      // Since we don't know for sure, we check 'content', 'left', 'right'.
                      const updates: any = {};
                      if ((block as any).content) updates.content = updateTagInHtml((block as any).content, selVar.vid, tag, fallback);
                      if ((block as any).left) updates.left = updateTagInHtml((block as any).left, selVar.vid, tag, fallback);
                      if ((block as any).right) updates.right = updateTagInHtml((block as any).right, selVar.vid, tag, fallback);
                      updateBlock(selVar.blockId, updates);
                    }
                  }}
                  onClose={() => setSelVar(null)}
                />
              </div>
            </>
          ) : selId && selectedBlock ? (
            <>
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelId(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                    title="Back to blocks"
                  >
                    <ChevronLeftIcon size={16} />
                  </button>
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                    {BLOCK_TYPES.find(t => t[0] === selectedBlock.type)?.[1]}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => deleteBlock(selectedBlock.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete block">
                    <TrashIcon size={16}/>
                  </button>
                </div>
              </div>
              <div className="p-5 overflow-y-auto flex-1 bg-gray-50/30">
                <PropertiesPanel block={selectedBlock} onUpdate={p => updateBlock(selectedBlock.id, p)} onClose={() => setSelId(null)} />
              </div>
            </>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex border-b border-gray-200 bg-white">
                <button 
                  onClick={() => setSidebarTab('blocks')}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${sidebarTab === 'blocks' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Blocks
                </button>
                <button 
                  onClick={() => setSidebarTab('styles')}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${sidebarTab === 'styles' ? 'border-emerald-500 text-emerald-600 bg-emerald-50/30' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Styles
                </button>
              </div>

              {sidebarTab === 'blocks' ? (
                <>
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/30">
                    <h3 className="text-sm font-semibold text-gray-900">Content Blocks</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Click to add to your email</p>
                  </div>
                  <div className="p-3 space-y-1 overflow-y-auto flex-1">
                    {BLOCK_TYPES.map(([type, label, icon, desc]) => (
                      <button 
                        key={type} 
                        onClick={() => addBlock(type)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-all text-left group border border-transparent hover:border-gray-200"
                      >
                        <div className="p-2 bg-gray-100 rounded-md text-gray-500 group-hover:bg-slate-200 group-hover:text-slate-700 transition-colors">
                          {icon}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</p>
                          <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-5 overflow-y-auto flex-1 bg-gray-50/30">
                  <GlobalStyles styles={globalStyles} onUpdate={setGlobalStyles} />
                </div>
              )}
              
              <div className="p-6 border-t border-gray-100 bg-gray-50/30 text-center">
                <p className="text-[11px] text-gray-400 leading-relaxed italic">
                  {selId ? 'Edit the selected block properties.' : 'Select a block or change global styles.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Canvas Block Wrapper ──────────────────────────────────────────────────────

function SBlock({ block, selected, globalStyles, onSelect, onUpdate, onDelete, onSelectVariable }: { block:Block; selected:boolean; globalStyles: any; onSelect:()=>void; onUpdate:(p:Partial<Block>)=>void; onDelete:()=>void; onSelectVariable: (v: { tag: string; fallback: string; vid: number } | null) => void; key?: any; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id:block.id });
  
  return (
    <div ref={setNodeRef} style={{ transform:CSS.Transform.toString(transform), transition }} className={`relative -mx-4 px-4 py-1 group ${isDragging ? 'opacity-40' : 'opacity-100'}`}>
      
      {/* Drag Handle (Visible on hover/select) */}
      <div 
        {...attributes} {...listeners} 
        className={`absolute -left-3 top-1/2 -translate-y-1/2 cursor-grab text-gray-300 hover:text-gray-500 p-2 z-10 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        <GripVerticalIcon size={16}/>
      </div>

      {/* Delete Button (Visible on hover/select) */}
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className={`absolute -right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-500 p-2 z-10 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        title="Delete Block"
      >
        <TrashIcon size={16}/>
      </button>

      <div 
        onClick={onSelect}
        className={`rounded-xl cursor-pointer transition-colors ${selected ? 'bg-slate-50 ring-1 ring-slate-200' : 'hover:bg-gray-50'}`}
      >
        <BlockCanvasRender block={block} selected={selected} globalStyles={globalStyles} onUpdate={onUpdate} onSelectVariable={onSelectVariable} />
      </div>
    </div>
  );
}

// ── Canvas Inline Renderers ───────────────────────────────────────────────────

function BlockCanvasRender({ block, selected, globalStyles, onUpdate, onSelectVariable }: { block:Block; selected:boolean; globalStyles: any; onUpdate:(p:Partial<Block>)=>void; onSelectVariable: (v: { tag: string; fallback: string; vid: number } | null) => void; }) {
  const textStyle = { fontFamily: globalStyles.fontFamily, color: globalStyles.textColor };
  const pad = block.padding !== undefined ? `${block.padding}px` : '16px';
  
  switch (block.type) {
    case 'heading': 
      if (selected) {
        const sz = ({1:'text-3xl',2:'text-2xl',3:'text-xl'} as Record<number,string>)[block.level];
        return (
          <div style={{ padding: pad }}>
            <RichTextEdit value={block.content} onChange={v=>onUpdate({content:v})} onSelectVariable={onSelectVariable} className={`w-full font-bold ${sz}`} style={{ color: globalStyles.textColor, fontFamily: globalStyles.fontFamily }} placeholder="Heading..." />
          </div>
        );
      }
      const sz = ({1:'text-3xl',2:'text-2xl',3:'text-xl'} as Record<number,string>)[block.level];
      return <div className={`font-bold leading-tight ${sz}`} style={{ ...textStyle, padding: pad }}>{renderContentWithTags(block.content, false, onSelectVariable) || <span className="text-gray-300">Heading…</span>}</div>;
    
    case 'text':    
      if (selected) {
        return (
          <div style={{ padding: pad }}>
            <RichTextEdit value={block.content} onChange={v=>onUpdate({content:v})} onSelectVariable={onSelectVariable} className="border-none bg-transparent p-0 min-h-[40px]" style={textStyle} />
          </div>
        );
      }
      return <div className="text-[15px] leading-relaxed" style={{ ...textStyle, padding: pad }}>{renderContentWithTags(block.content, false, onSelectVariable) || <span className="text-gray-300">Type something…</span>}</div>;
    
    case 'button':  
      return <div className={`text-${block.align}`} style={{ padding: pad }}><span style={{ background:block.color, fontFamily: globalStyles.fontFamily }} className="inline-block text-white px-7 py-3 rounded-lg text-[15px] font-semibold shadow-sm">{block.text||'Button'}</span></div>;
    
    case 'image':   
      return <div className="text-center" style={{ padding: pad }}>{block.src?<img src={block.src} alt={block.alt} className="max-w-full max-h-[300px] rounded-lg object-contain mx-auto shadow-sm border border-gray-100" style={{ borderRadius: globalStyles.borderRadius }}/>:<div className="h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 text-sm gap-2 bg-gray-50"><ImageIcon size={24} className="opacity-50"/> Image placeholder</div>}</div>;
    
    case 'divider': 
      return <div style={{ padding: pad }}><hr className="border-t border-gray-200"/></div>;
    
    case 'spacer':  
      return <div style={{ height:block.height }} className={`flex items-center justify-center text-[11px] text-gray-400 transition-colors rounded-md ${selected ? 'border border-dashed border-gray-300 bg-gray-50/50' : 'border border-transparent'}`}>{selected && `${block.height}px`}</div>;
    
    case 'columns': 
      return (
        <div className="flex gap-4" style={{ padding: pad }}>
          <div className="flex-1">
            {selected ? <RichTextEdit value={block.left} onChange={v=>onUpdate({left:v})} onSelectVariable={onSelectVariable} className="border-none bg-transparent p-0 min-h-[40px]" style={textStyle} /> : <div className="text-[14px] leading-relaxed" style={textStyle}>{renderContentWithTags(block.left, false, onSelectVariable) || <span className="text-gray-300">Left column…</span>}</div>}
          </div>
          <div className="w-px bg-gray-100"/>
          <div className="flex-1">
            {selected ? <RichTextEdit value={block.right} onChange={v=>onUpdate({right:v})} onSelectVariable={onSelectVariable} className="border-none bg-transparent p-0 min-h-[40px]" style={textStyle} /> : <div className="text-[14px] leading-relaxed" style={textStyle}>{renderContentWithTags(block.right, false, onSelectVariable) || <span className="text-gray-300">Right column…</span>}</div>}
          </div>
        </div>
      );
  }
}

// ── Right Sidebar Variable Properties ─────────────────────────────────────────

function VariableProperties({ selVar, onUpdate, onClose }: { 
  selVar: { tag: string; fallback: string; vid: number }; 
  onUpdate: (tag: string, fallback: string) => void;
  onClose: () => void;
}) {
  const Label = ({ children }: { children: React.ReactNode }) => <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">{children}</label>;
  
  const currentCategory = VAR_CATEGORIES.find(cat => cat.vars.some(v => v.value === selVar.tag)) || VAR_CATEGORIES[0];

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <div>
          <Label>Variable Type</Label>
          <div className="grid grid-cols-1 gap-3 mt-2">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Category</span>
              <select 
                value={currentCategory.name}
                onChange={(e) => {
                  const newCat = VAR_CATEGORIES.find(c => c.name === e.target.value);
                  if (newCat) onUpdate(newCat.vars[0].value, selVar.fallback);
                }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white shadow-sm appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
              >
                {VAR_CATEGORIES.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Field</span>
              <select 
                value={selVar.tag}
                onChange={(e) => onUpdate(e.target.value, selVar.fallback)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white shadow-sm appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
              >
                {currentCategory.vars.map(v => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-gray-100">
          <Label>Fallback Value</Label>
          <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">Shown if the variable is empty for a recipient.</p>
          <div className="space-y-3">
            <select 
              value={FALLBACK_OPTIONS.find(o => o.value === selVar.fallback) ? selVar.fallback : 'custom'}
              onChange={(e) => {
                if (e.target.value !== 'custom') onUpdate(selVar.tag, e.target.value);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white shadow-sm appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239CA3AF'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
            >
              {FALLBACK_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
              {!FALLBACK_OPTIONS.find(o => o.value === selVar.fallback) && (
                <option value="custom">Custom: {selVar.fallback}</option>
              )}
            </select>
            
            <input 
              type="text"
              value={selVar.fallback} 
              onChange={(e) => onUpdate(selVar.tag, e.target.value)} 
              placeholder="Type custom fallback..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50 focus:bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Right Sidebar Properties Panel ────────────────────────────────────────────

function PropertiesPanel({ block, onUpdate, onClose }: { block:Block; onUpdate:(p:Partial<Block>)=>void; onClose:()=>void }) {
  const Label = ({ children, className }: { children: React.ReactNode; className?: string }) => <label className={`block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider ${className || ''}`}>{children}</label>;
  const Input = (props: any) => <input className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all bg-gray-50 focus:bg-white" {...props} />;

  const insertIntoCanvas = (v: string) => {
    // This is a bit of a hack since we don't have direct access to the active RichTextEdit ref here.
    // We rely on document.execCommand working on the currently focused element (which should be the RichTextEdit).
    const pill = `<span class="variable-pill" data-tag="${v}" contenteditable="false">${v.split('|')[0].trim()}</span>&nbsp;`;
    document.execCommand('insertHTML', false, pill);
  };

  const renderPadding = () => (
    <div className="pt-4 border-t border-gray-100 mt-4">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-[11px] uppercase tracking-wider text-gray-400">Block Padding</Label>
        <span className="text-xs font-mono text-gray-500">{block.padding ?? 16}px</span>
      </div>
      <input 
        type="range" 
        min="0" 
        max="80" 
        step="4"
        value={block.padding ?? 16} 
        onChange={e => onUpdate({ padding: parseInt(e.target.value) })}
        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
      />
    </div>
  );

  const renderContent = () => {
    switch (block.type) {
      case 'heading':
        return (
          <div className="space-y-4">
            <div>
              <Label>Heading Level</Label>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {([1,2,3] as const).map(l=>(
                  <button key={l} onClick={()=>onUpdate({level:l})} className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${block.level===l ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>H{l}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <Label>Content</Label>
              <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg border border-gray-100">Edit the text directly on the canvas.</p>
              <VarPicker onInsert={insertIntoCanvas} />
            </div>
            {renderPadding()}
          </div>
        );
      case 'text':
        return (
          <div className="space-y-4">
            <Label>Content</Label>
            <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg border border-gray-100">Edit the text content directly on the canvas. Highlight text to see formatting options.</p>
            <VarPicker onInsert={insertIntoCanvas} />
            {renderPadding()}
          </div>
        );
      case 'columns':
        return (
          <div className="space-y-4">
            <Label>Column Content</Label>
            <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg border border-gray-100">Edit the text content directly on the canvas.</p>
            <VarPicker onInsert={insertIntoCanvas} />
            {renderPadding()}
          </div>
        );
      
      case 'button':
        return (
          <div className="space-y-5">
            <div>
              <Label>Button Label</Label>
              <div className="space-y-2">
                <Input value={block.text} onChange={(e:any)=>onUpdate({text:e.target.value})} placeholder="Click here"/>
                <VarPicker onInsert={v => onUpdate({ text: block.text + `{{${v}}}` })} />
              </div>
            </div>
            <div>
              <Label>Link URL</Label>
              <div className="space-y-2">
                <Input value={block.url} onChange={(e:any)=>onUpdate({url:e.target.value})} placeholder="https://..."/>
                <VarPicker onInsert={v => onUpdate({ url: block.url + `{{${v}}}` })} />
              </div>
            </div>
            <div>
              <Label>Alignment</Label>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                {(['left','center','right'] as const).map(a=>(
                  <button key={a} onClick={()=>onUpdate({align:a})} className={`flex-1 flex justify-center py-1.5 rounded-md transition-all ${block.align===a ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                    {a === 'left' ? <AlignLeftIcon size={16}/> : a === 'center' ? <AlignCenterIcon size={16}/> : <AlignRightIcon size={16}/>}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Button Color</Label>
              <div className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg bg-gray-50">
                <input type="color" value={block.color} onChange={e=>onUpdate({color:e.target.value})} className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"/>
                <span className="font-mono text-xs text-gray-500 uppercase">{block.color}</span>
              </div>
            </div>
            {renderPadding()}
          </div>
        );
      
      case 'image': 
        return (
          <div className="space-y-5">
            <div>
              <Label>Upload Image</Label>
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 transition-all cursor-pointer group">
                <input type="file" accept="image/*" className="hidden" onChange={e=>{
                  const f=e.target.files?.[0];
                  if(f) {
                    const reader = new FileReader();
                    reader.onload = ev => onUpdate({ src: ev.target?.result as string });
                    reader.readAsDataURL(f);
                  }
                }}/>
                <ImageIcon size={24} className="text-gray-400 group-hover:text-blue-500 transition-colors"/>
                <span className="text-sm font-semibold text-emerald-600">Click to upload</span>
              </label>
              {block.src && <button onClick={()=>onUpdate({src:''})} className="mt-2 text-xs font-medium text-red-500 hover:text-red-600">Remove image</button>}
            </div>
            <div>
              <Label>Image Link (Optional)</Label>
              <div className="space-y-2">
                <Input value={block.url || ''} onChange={(e:any)=>onUpdate({url:e.target.value})} placeholder="https://..."/>
                <VarPicker onInsert={v => onUpdate({ url: (block.url || '') + `{{${v}}}` })} />
              </div>
            </div>
            <div>
              <Label>Alt Text</Label>
              <div className="space-y-2">
                <Input value={block.alt} onChange={(e:any)=>onUpdate({alt:e.target.value})} placeholder="Describe the image..."/>
                <VarPicker onInsert={v => onUpdate({ alt: block.alt + `{{${v}}}` })} />
              </div>
            </div>
            {renderPadding()}
          </div>
        );
      
      case 'spacer':
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Height</Label>
                <span className="text-xs font-mono text-gray-500">{block.height}px</span>
              </div>
              <input 
                type="range" 
                min="8" 
                max="200" 
                step="8"
                value={block.height} 
                onChange={e => onUpdate({ height: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        );
      
      case 'divider':
        return (
          <div className="space-y-4">
            <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg border border-gray-100">Simple horizontal line to separate sections.</p>
            {renderPadding()}
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="p-5 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Block Properties</h3>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400 transition-colors"><XIcon size={16}/></button>
      </div>
      {renderContent()}
    </div>
  );
}

// ── Helpers (PortalMenu, AddBlockButton, VarPicker, RichTextEdit) ──

interface MenuPos { top: number; left: number; openUp: boolean; }

function PortalMenu({ pos, onSelect, onClose }: { pos: MenuPos; onSelect:(t:BlockType)=>void; onClose:()=>void }) {
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('[data-bm]')) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  const menuH = BLOCK_TYPES.length * 56 + 40;
  const top = pos.openUp ? pos.top - menuH - 8 : pos.top + 8;

  return createPortal(
    <div data-bm="1" style={{ top, left:pos.left }} className="fixed z-[9999] bg-white border border-gray-200 rounded-xl shadow-xl p-2 min-w-[240px] animate-in fade-in zoom-in-95 duration-100">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">Add block</p>
      <div className="space-y-0.5">
        {BLOCK_TYPES.map(([type, label, icon, desc]) => (
          <button key={type}
            onMouseDown={e => { e.preventDefault(); onSelect(type); }}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg border-none bg-transparent cursor-pointer text-left hover:bg-gray-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-md bg-gray-100 text-gray-500 flex items-center justify-center group-hover:bg-white group-hover:text-emerald-600 group-hover:shadow-sm transition-all">
              {icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 m-0">{label}</p>
              <p className="text-xs text-gray-500 m-0">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}

function AddBlockButton({ label, onSelect, className, children }: { label?: string; onSelect:(t:BlockType)=>void; className?: string; children?: React.ReactNode; }) {
  const [pos, setPos] = useState<MenuPos|null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  function toggle() {
    if (pos) { setPos(null); return; }
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const spaceBelow = window.innerHeight - r.bottom;
    const openUp = spaceBelow < 400 && r.top > 400;
    setPos({ top: openUp ? r.top : r.bottom, left: r.left, openUp });
  }
  return (
    <>
      <button ref={ref} onClick={toggle} className={className || "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"}>
        {children ?? <><PlusIcon size={16}/> {label ?? 'Add block'}</>}
      </button>
      {pos && <PortalMenu pos={pos} onSelect={t => { onSelect(t); setPos(null); }} onClose={() => setPos(null)} />}
    </>
  );
}

const VAR_CATEGORIES = [
  {
    name: 'Recipient',
    vars: [
      { label: 'First Name', value: 'firstName' },
      { label: 'Last Name', value: 'lastName' },
      { label: 'Full Name', value: 'fullName' },
      { label: 'Email Address', value: 'email' },
    ]
  },
  {
    name: 'Sender',
    vars: [
      { label: 'Sender Name', value: 'senderName' },
      { label: 'Sender Email', value: 'senderEmail' },
    ]
  },
  {
    name: 'Company',
    vars: [
      { label: 'Company Name', value: 'companyName' },
      { label: 'Address', value: 'companyAddress' },
    ]
  }
];

const FALLBACK_OPTIONS = [
  { label: 'None', value: '' },
  { label: 'Friend', value: 'friend' },
  { label: 'Customer', value: 'customer' },
  { label: 'Valued Member', value: 'valued member' },
  { label: 'There', value: 'there' },
];

const VARS = [
  { label:'First name',  value:"firstName | fallback: 'there'" },
  { label:'Full name',   value:'fullName' },
  { label:'Email',       value:'email' },
  { label:'Sender name', value:'senderName' },
  { label:'Company',     value:'companyName' },
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
    <div data-vp="1" className="relative inline-block mt-2">
      <button type="button" onMouseDown={e => { e.preventDefault(); setOpen(o=>!o); }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-600 transition-colors">
        <span className="font-mono text-[10px] bg-white border border-gray-200 rounded px-1 py-0.5 text-gray-400">{'{ }'}</span> Insert Variable
      </button>
      {open && (
        <div className="absolute top-full left-0 z-[200] mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1 min-w-[180px] animate-in fade-in slide-in-from-top-2 duration-100">
          {VARS.map(v => (
            <button key={v.value} type="button"
              onMouseDown={e => { e.preventDefault(); onInsert(v.value); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-emerald-50 text-left transition-colors group/var"
            >
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-700 group-hover/var:text-emerald-700">{v.label}</span>
                <span className="text-[10px] text-gray-400 font-mono">{`{{${v.value}}}`}</span>
              </div>
              <PlusIcon size={12} className="text-gray-300 group-hover/var:text-emerald-500 opacity-0 group-hover/var:opacity-100 transition-all" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RichTextEdit({ value, onChange, placeholder, className, style, onSelectVariable }: { 
  value:string; 
  onChange:(v:string)=>void; 
  placeholder?:string; 
  className?: string;
  style?: React.CSSProperties;
  onSelectVariable?: (data: { tag: string; fallback: string; vid: number } | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<{top:number;left:number}|null>(null);
  const [showVarMenu, setShowVarMenu] = useState(false);
  const [varMenuPos, setVarMenuPos] = useState<{top:number;left:number}|null>(null);
  const syncing = useRef(false);

  useEffect(() => {
    if (!showVarMenu) return;
    const h = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-vmenu]')) setShowVarMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showVarMenu]);

  // Sync internal HTML with external value (tags -> pills)
  useEffect(() => {
    if (ref.current && !syncing.current) {
      const currentTags = pillsToTags(ref.current.innerHTML);
      if (currentTags !== value) {
        ref.current.innerHTML = tagsToPills(value);
      }
    }
  }, [value]);

  function sync() {
    if (ref.current && !syncing.current) {
      syncing.current = true;
      const tags = pillsToTags(ref.current.innerHTML);
      onChange(tags);
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
    <div className="relative group">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={() => { sync(); setTimeout(()=>setToolbar(null), 150); }}
        onMouseUp={(e) => {
          checkSelection();
          const pill = (e.target as HTMLElement).closest('.variable-pill') as HTMLElement;
          if (pill) {
            e.stopPropagation();
            onSelectVariable?.({
              tag: pill.getAttribute('data-tag') || '',
              fallback: pill.getAttribute('data-fallback') || '',
              vid: parseInt(pill.getAttribute('data-vid') || '0')
            });
          } else {
            onSelectVariable?.(null);
          }
        }}
        onClick={(e) => {
          const pill = (e.target as HTMLElement).closest('.variable-pill') as HTMLElement;
          if (pill) e.stopPropagation();
        }}
        onKeyUp={checkSelection}
        data-ph={placeholder || 'Write here…'}
        className={`text-[15px] leading-relaxed outline-none ${className || ''}`}
        style={style}
      />

      {toolbar && createPortal(
        <div style={{ top:toolbar.top - 44, left:toolbar.left }} className="fixed -translate-x-1/2 z-[9999] bg-gray-900 rounded-lg flex items-center gap-1 p-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          {[
            { cmd:'bold',      icon:<BoldIcon size={14}/>,    title:'Bold' },
            { cmd:'italic',    icon:<ItalicIcon size={14}/>,  title:'Italic' },
          ].map(({ cmd, icon, title }) => (
            <button key={cmd} title={title} onMouseDown={e => { e.preventDefault(); exec(cmd); }} className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-gray-800 transition-colors">{icon}</button>
          ))}
          <div className="w-px h-4 bg-gray-700 mx-1"/>
          <button title="Link" onMouseDown={e => { e.preventDefault(); insertLink(); }} className="p-1.5 rounded-md text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"><LinkIcon size={14}/></button>
          <button title="Insert Variable" onMouseDown={e => { 
            e.preventDefault(); 
            if (toolbar) setVarMenuPos({ top: toolbar.top + 10, left: toolbar.left });
            setShowVarMenu(true); 
          }} className="p-1.5 rounded-md text-emerald-400 hover:text-emerald-300 hover:bg-gray-800 transition-colors"><ZapIcon size={14}/></button>
          <button title="Remove formatting" onMouseDown={e => { e.preventDefault(); exec('removeFormat'); }} className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-xs font-bold">✕</button>
        </div>,
        document.body
      )}

      {showVarMenu && varMenuPos && createPortal(
        <div 
          data-vmenu
          style={{ top: varMenuPos.top, left: varMenuPos.left }} 
          className="fixed -translate-x-1/2 z-[10000] bg-white rounded-xl shadow-2xl border border-gray-200 p-2 w-[240px] animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100 mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Insert Variable</span>
            <button onClick={() => setShowVarMenu(false)} className="text-gray-400 hover:text-gray-600"><XIcon size={12}/></button>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {VAR_CATEGORIES.map(cat => (
              <div key={cat.name}>
                <div className="px-2 py-1 text-[9px] font-bold text-gray-400 bg-gray-50 rounded mt-1">{cat.name}</div>
                {cat.vars.map(v => (
                  <button 
                    key={v.value}
                    onClick={() => {
                      const pill = `<span class="variable-pill" data-tag="${v.value}" contenteditable="false">${v.label}</span>&nbsp;`;
                      exec('insertHTML', pill);
                      setShowVarMenu(false);
                    }}
                    className="w-full text-left px-2 py-1.5 text-xs text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 rounded transition-colors"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
      <style>{`[data-ph]:empty:before{content:attr(data-ph);color:#9CA3AF;pointer-events:none}`}</style>
    </div>
  );
}

