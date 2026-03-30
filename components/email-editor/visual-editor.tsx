'use client';

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
  AlignLeftIcon, AlignCenterIcon, AlignRightIcon
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type BlockType = 'heading' | 'text' | 'button' | 'image' | 'divider' | 'spacer' | 'columns';

interface HeadingBlock { id: string; type: 'heading'; content: string; level: 1|2|3 }
interface TextBlock    { id: string; type: 'text';    content: string } 
interface ButtonBlock  { id: string; type: 'button';  text: string; url: string; color: string; align: 'left'|'center'|'right' }
interface ImageBlock   { id: string; type: 'image';   src: string; alt: string; url?: string }
interface DividerBlock { id: string; type: 'divider' }
interface SpacerBlock  { id: string; type: 'spacer';  height: number }
interface ColumnsBlock { id: string; type: 'columns'; left: string; right: string } 
type Block = HeadingBlock|TextBlock|ButtonBlock|ImageBlock|DividerBlock|SpacerBlock|ColumnsBlock;

let _n = 0;
function uid() { return `b_${Date.now()}_${++_n}`; }

function makeBlock(type: BlockType): Block {
  switch (type) {
    case 'heading': return { id:uid(), type:'heading', content:'Your headline here', level:2 };
    case 'text':    return { id:uid(), type:'text',    content:'Write your content here.' };
    case 'button':  return { id:uid(), type:'button',  text:'Click here →', url:'https://', color:'var(--brand, #22C55E)', align:'center' };
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

// ── Tokens ────────────────────────────────────────────────────────────────────

const BG   = 'var(--surface-app, #F7F8FA)';
const CARD = 'var(--surface-card, #FFFFFF)';
const BD   = 'var(--sidebar-border, #E6E8EC)';
const BR   = 'var(--brand, #22C55E)';
const BBG  = 'var(--brand-tint, rgba(34,197,94,0.08))';
const TX   = 'var(--text-primary, #0D0F12)';
const TX2  = 'var(--text-secondary, #5A6472)';
const TX3  = 'var(--text-tertiary, #9AA3AF)';
const RED  = '#EF4444';
const IS: React.CSSProperties = { width:'100%', padding:'8px 12px', fontSize:13, border:`1px solid ${BD}`, borderRadius:6, outline:'none', fontFamily:'inherit', color:TX, background:CARD, boxSizing:'border-box', transition: 'border-color 0.15s' };

const BLOCK_TYPES: [BlockType, string, React.ReactNode, string][] = [
  ['heading', 'Heading',  <Heading2Icon size={14}/>,          'Title or section header'],
  ['text',    'Text',     <TypeIcon size={14}/>,              'Paragraph with rich formatting'],
  ['button',  'Button',   <MousePointerClickIcon size={14}/>, 'Call-to-action button'],
  ['image',   'Image',    <ImageIcon size={14}/>,             'Photo or graphic'],
  ['columns', 'Columns',  <Columns2Icon size={14}/>,          'Two-column layout'],
  ['divider', 'Divider',  <MinusIcon size={14}/>,             'Horizontal rule'],
  ['spacer',  'Spacer',   <MoveVerticalIcon size={14}/>,      'Empty vertical space'],
];

// ── Main Editor Component ─────────────────────────────────────────────────────

interface Props { value: string; onChange: (html: string) => void; }

export function VisualEditor({ value, onChange }: Props) {
  const [blocks,       setBlocks]       = useState<Block[]>([]);
  const [selId,        setSelId]        = useState<string|null>(null);
  const [showPreview,  setShowPreview]  = useState(false);
  const [previewHtml,  setPreviewHtml]  = useState('');
  const inited = useRef(false);

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const p = htmlToBlocks(value);
    const initial = p.length > 0 ? p : [
      { id:uid(), type:'heading' as const, content:"Hello {{firstName | fallback: 'there'}}!", level:2 as const },
      { id:uid(), type:'text' as const,    content:'Write your email content here. Keep it personal, valuable, and to the point.' },
      { id:uid(), type:'button' as const,  text:'Claim your offer', url:'https://', color:'var(--brand, #22C55E)', align:'center' as const },
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint:{ distance:5 } }));
  function onDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id !== over.id)
      push(prev => arrayMove(prev, prev.findIndex(b=>b.id===active.id), prev.findIndex(b=>b.id===over.id)));
  }

  const selectedBlock = blocks.find(b => b.id === selId);

  return (
    <div style={{ display:'flex', flexDirection:'column', background:BG, height: '100%', minHeight: '800px', borderRadius: 8, border: `1px solid ${BD}`, overflow: 'hidden' }}>
      
      {/* ── Top Toolbar ── */}
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'12px 16px', background:CARD, borderBottom:`1px solid ${BD}`, flexShrink:0 }}>
        <AddBlockButton onSelect={t => addBlock(t)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: `1px solid ${BD}`, background: CARD, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: TX }}/>
        <div style={{ flex:1 }}/>
        <button onClick={() => { setShowPreview(s => !s); setSelId(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: `1px solid ${showPreview ? BR : BD}`, background: showPreview ? BBG : CARD, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: showPreview ? BR : TX2 }}>
          {showPreview ? <EyeOffIcon size={14}/> : <EyeIcon size={14}/>}
          {showPreview ? 'Exit Preview' : 'Preview'}
        </button>
      </div>

      <div style={{ display:'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ── Left: Canvas Area ── */}
        <div style={{ flex:1, minWidth:0, overflowY: 'auto', padding: '32px 24px' }} onClick={() => setSelId(null)}>
          <div style={{ maxWidth: 600, margin: '0 auto', background: CARD, borderRadius: 12, border: `1px solid ${BD}`, padding: '40px 32px', minHeight: 600, boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }} onClick={e => e.stopPropagation()}>
            
            {showPreview ? (
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} style={{ fontFamily: FONT, color: TX, lineHeight: 1.75 }} />
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={blocks.map(b=>b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map(block => (
                    <SBlock
                      key={block.id} block={block} selected={selId===block.id}
                      onSelect={() => setSelId(block.id)}
                      onUpdate={p => updateBlock(block.id,p)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}

            {!showPreview && (
              <div style={{ marginTop: 32, paddingTop: 32, borderTop: `1px solid ${BD}` }}>
                <AddBlockButton onSelect={t => addBlock(t)}
                  style={{ width:'100%', padding:'16px', borderRadius:8, border:`1px dashed ${BD}`, background:'transparent', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, color:TX2, fontSize:14, fontWeight: 500, transition: 'background 0.2s' }}>
                  <PlusIcon size={16} />
                  <span>Click to add a new block</span>
                </AddBlockButton>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Properties Sidebar ── */}
        {!showPreview && selId && selectedBlock && (
          <div style={{ width: 320, background: CARD, borderLeft: `1px solid ${BD}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '16px', borderBottom: `1px solid ${BD}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {BLOCK_TYPES.find(t => t[0] === selectedBlock.type)?.[1]} Properties
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => deleteBlock(selectedBlock.id)} style={{ padding: 6, color: RED, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }} title="Delete block">
                  <TrashIcon size={14}/>
                </button>
                <button onClick={() => setSelId(null)} style={{ padding: 6, color: TX3, background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}>
                  <XIcon size={14}/>
                </button>
              </div>
            </div>
            <div style={{ padding: '20px 16px', overflowY: 'auto', flex: 1 }}>
              <PropertiesPanel block={selectedBlock} onUpdate={p => updateBlock(selectedBlock.id, p)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Canvas Block Wrapper ──────────────────────────────────────────────────────

function SBlock({ block, selected, onSelect, onUpdate }: { block:Block; selected:boolean; onSelect:()=>void; onUpdate:(p:Partial<Block>)=>void; }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id:block.id });
  
  return (
    <div ref={setNodeRef} style={{ transform:CSS.Transform.toString(transform), transition, opacity:isDragging?0.4:1, position: 'relative', margin: '0 -16px', padding: '4px 16px' }}>
      
      {/* Drag Handle (Visible on hover/select) */}
      <div {...attributes} {...listeners} style={{ position: 'absolute', left: -12, top: '50%', transform: 'translateY(-50%)', cursor: 'grab', color: TX3, opacity: selected ? 1 : 0, padding: '8px 4px', zIndex: 10 }} className="group-hover:opacity-100 transition-opacity">
        <GripVerticalIcon size={14}/>
      </div>

      <div onClick={onSelect}
        style={{ borderRadius: 8, background: selected ? 'var(--surface-hover, #F3F4F6)' : 'transparent', padding: '8px 16px', cursor: 'pointer', transition: 'background 0.15s' }}
      >
        <BlockCanvasRender block={block} selected={selected} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

// ── Canvas Inline Renderers ───────────────────────────────────────────────────

function BlockCanvasRender({ block, selected, onUpdate }: { block:Block; selected:boolean; onUpdate:(p:Partial<Block>)=>void }) {
  switch (block.type) {
    case 'heading': 
      if (selected) {
        const sz = ({1:28,2:22,3:18} as Record<number,number>)[block.level];
        return <VarInput value={block.content} onChange={v=>onUpdate({content:v})} style={{ fontSize: sz, fontWeight: 700, border: 'none', background: 'transparent', padding: 0, outline: 'none', width: '100%', color: TX, fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", resize: 'none' }} placeholder="Heading..." autoFocus/>;
      }
      return <div style={{ fontFamily:"'Bricolage Grotesque',system-ui,sans-serif", fontSize:block.level===1?28:block.level===2?22:18, fontWeight:700, color:TX, lineHeight:1.2 }}>{block.content||<span style={{color:TX3}}>Heading…</span>}</div>;
    
    case 'text':    
      if (selected) {
        return <RichTextEdit value={block.content} onChange={v=>onUpdate({content:v})} style={{ border: 'none', background: 'transparent', padding: 0, minHeight: 40 }} />;
      }
      return <div style={{ fontSize:15, color:TX2, lineHeight:1.75 }} dangerouslySetInnerHTML={{__html:block.content||`<span style="color:${TX3}">Type something…</span>`}}/>;
    
    case 'button':  
      return <div style={{ textAlign:block.align, padding:'12px 0' }}><span style={{ display:'inline-block', background:block.color, color:'#fff', padding:'12px 28px', borderRadius:8, fontSize:15, fontWeight:600 }}>{block.text||'Button'}</span></div>;
    
    case 'image':   
      return <div style={{ textAlign:'center', padding:'12px 0' }}>{block.src?<img src={block.src} alt={block.alt} style={{maxWidth:'100%',maxHeight:300,borderRadius:8,objectFit:'contain', margin:'0 auto'}}/>:<div style={{height:120,border:`2px dashed ${BD}`,borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:TX3,fontSize:13,gap:8,background:BG}}><ImageIcon size={24} style={{opacity:0.5}}/> Image placeholder</div>}</div>;
    
    case 'divider': 
      return <hr style={{ border:'none', borderTop:`1px solid ${BD}`, margin:'24px 0' }}/>;
    
    case 'spacer':  
      return <div style={{ height:block.height, border: selected ? `1px dashed ${BD}` : '1px solid transparent', borderRadius: 4, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:TX3, transition: 'border 0.2s' }}>{selected && `${block.height}px`}</div>;
    
    case 'columns': 
      return (
        <div style={{ display:'flex', gap:16, padding:'8px 0' }}>
          <div style={{ flex:1 }}>
            {selected ? <RichTextEdit value={block.left} onChange={v=>onUpdate({left:v})} style={{ border: `1px dashed ${BD}`, padding: 8, borderRadius: 6 }} /> : <div style={{ fontSize:15, color:TX2, lineHeight:1.75 }} dangerouslySetInnerHTML={{__html:block.left}}/>}
          </div>
          <div style={{ flex:1 }}>
            {selected ? <RichTextEdit value={block.right} onChange={v=>onUpdate({right:v})} style={{ border: `1px dashed ${BD}`, padding: 8, borderRadius: 6 }} /> : <div style={{ fontSize:15, color:TX2, lineHeight:1.75 }} dangerouslySetInnerHTML={{__html:block.right}}/>}
          </div>
        </div>
      );
  }
}

// ── Right Sidebar Properties Panel ────────────────────────────────────────────

function PropertiesPanel({ block, onUpdate }: { block:Block; onUpdate:(p:Partial<Block>)=>void }) {
  const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: TX2, display: 'block', marginBottom: 6 };
  const sectionStyle: React.CSSProperties = { marginBottom: 24 };

  switch (block.type) {
    case 'heading':
      return (
        <div style={sectionStyle}>
          <label style={labelStyle}>Heading Level</label>
          <div style={{ display:'flex', gap:6, background: BG, padding: 4, borderRadius: 8 }}>
            {([1,2,3] as const).map(l=>(
              <button key={l} onClick={()=>onUpdate({level:l})} style={{ flex: 1, padding:'6px 0', borderRadius:6, border:'none', fontSize:12, fontWeight:600, fontFamily:'inherit', cursor:'pointer', background:block.level===l?CARD:'transparent', color:block.level===l?TX:TX2, boxShadow: block.level===l ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>H{l}</button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: TX3, marginTop: 16 }}>Edit the text directly on the canvas.</p>
        </div>
      );
    case 'text':
    case 'columns':
      return <p style={{ fontSize: 13, color: TX2, lineHeight: 1.6 }}>Edit the text content directly on the canvas. Highlight text to see formatting options.</p>;
    
    case 'button':
      return (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div>
            <label style={labelStyle}>Button Label</label>
            <input value={block.text} onChange={e=>onUpdate({text:e.target.value})} style={IS} placeholder="Click here"/>
          </div>
          <div>
            <label style={labelStyle}>Link URL</label>
            <input value={block.url} onChange={e=>onUpdate({url:e.target.value})} style={IS} placeholder="https://..."/>
          </div>
          <div>
            <label style={labelStyle}>Alignment</label>
            <div style={{ display:'flex', gap:4, background: BG, padding: 4, borderRadius: 8 }}>
              {(['left','center','right'] as const).map(a=>(
                <button key={a} onClick={()=>onUpdate({align:a})} style={{ flex: 1, display: 'flex', justifyContent: 'center', padding:'6px 0', borderRadius:6, border:'none', cursor:'pointer', background:block.align===a?CARD:'transparent', color:block.align===a?TX:TX2, boxShadow: block.align===a ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                  {a === 'left' ? <AlignLeftIcon size={16}/> : a === 'center' ? <AlignCenterIcon size={16}/> : <AlignRightIcon size={16}/>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Button Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...IS }}>
              <input type="color" value={block.color} onChange={e=>onUpdate({color:e.target.value})} style={{ width:24, height:24, border:'none', borderRadius:4, cursor:'pointer', padding:0, background: 'transparent' }}/>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: TX2, textTransform: 'uppercase' }}>{block.color}</span>
            </div>
          </div>
        </div>
      );
    
    case 'image': 
      return (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div>
            <label style={labelStyle}>Upload Image</label>
            <label style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, padding:'24px 16px', borderRadius:8, cursor:'pointer', border:`2px dashed ${BD}`, background:BG, transition:'all 0.15s' }}>
              <input type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{
                const f=e.target.files?.[0];
                if(f) {
                  const reader = new FileReader();
                  reader.onload = ev => onUpdate({ src: ev.target?.result as string });
                  reader.readAsDataURL(f);
                }
              }}/>
              <ImageIcon size={24} style={{color:TX3}}/>
              <span style={{fontSize:13,color:BR,fontWeight:600}}>Click to upload</span>
            </label>
            {block.src && <button onClick={()=>onUpdate({src:''})} style={{ marginTop: 8, fontSize:12, color:RED, background:'none', border:'none', cursor:'pointer', padding:0 }}>Remove image</button>}
          </div>
          <div>
            <label style={labelStyle}>Image Link (Optional)</label>
            <input value={block.url || ''} onChange={e=>onUpdate({url:e.target.value})} style={IS} placeholder="https://..."/>
          </div>
          <div>
            <label style={labelStyle}>Alt Text</label>
            <input value={block.alt} onChange={e=>onUpdate({alt:e.target.value})} style={IS} placeholder="Describe the image..."/>
          </div>
        </div>
      );
    
    case 'spacer':
      return (
        <div>
          <label style={labelStyle}>Height ({block.height}px)</label>
          <input type="range" min={8} max={120} step={4} value={block.height} onChange={e=>onUpdate({height:+e.target.value})} style={{ width: '100%', accentColor: BR, cursor: 'pointer' }}/>
          <input type="number" min={8} max={120} value={block.height} onChange={e=>onUpdate({height:+e.target.value})} style={{ ...IS, marginTop: 12 }}/>
        </div>
      );
      
    case 'divider':
      return <p style={{ fontSize: 13, color: TX2 }}>Horizontal divider — no settings available.</p>;
  }
}

// ── Helpers (PortalMenu, AddBlockButton, VarPicker, RichTextEdit, VarInput) ──

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

function AddBlockButton({ label, onSelect, style, children }: { label?: string; onSelect:(t:BlockType)=>void; style?: React.CSSProperties; children?: React.ReactNode; }) {
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
        {children ?? <><PlusIcon size={14}/> {label ?? 'Add block'}</>}
      </button>
      {pos && <PortalMenu pos={pos} onSelect={t => { onSelect(t); setPos(null); }} onClose={() => setPos(null)} />}
    </>
  );
}

const VARS = [
  { label:'First name',  value:"{{firstName | fallback: 'there'}}" },
  { label:'Full name',   value:'{{fullName}}' },
  { label:'Email',       value:'{{email}}' },
  { label:'Sender name', value:'{{senderName}}' },
  { label:'Company',     value:'{{companyName}}' },
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
    <div data-vp="1" style={{ position:'relative', display:'inline-block', marginTop:8 }}>
      <button type="button" onMouseDown={e => { e.preventDefault(); setOpen(o=>!o); }}
        style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:6, border:`1px solid ${BD}`, background:BG, cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight: 500, color:TX2 }}>
        {'{ }'} Insert Variable
      </button>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, zIndex:200, marginTop:4, background:CARD, border:`1px solid ${BD}`, borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.1)', padding:6, minWidth:220 }}>
          {VARS.map(v => (
            <button key={v.value} type="button"
              onMouseDown={e => { e.preventDefault(); onInsert(v.value); setOpen(false); }}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:'8px 10px', borderRadius:6, border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
              onMouseEnter={e=>(e.currentTarget.style.background=BG)} onMouseLeave={e=>(e.currentTarget.style.background='none')}
            >
              <span style={{ fontSize:13, fontWeight:500, color:TX }}>{v.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RichTextEdit({ value, onChange, placeholder, style }: { value:string; onChange:(v:string)=>void; placeholder?:string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [toolbar, setToolbar] = useState<{top:number;left:number}|null>(null);
  const syncing = useRef(false);

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
        style={{ fontSize:15, lineHeight:1.75, outline:'none', color:TX, fontFamily:'inherit', ...style }}
      />
      <VarPicker onInsert={v => { ref.current?.focus(); document.execCommand('insertText', false, v); sync(); }} />

      {toolbar && createPortal(
        <div style={{ position:'fixed', top:toolbar.top - 40, left:toolbar.left, transform:'translateX(-50%)', zIndex:9999, background:'#1a1a2e', borderRadius:8, display:'flex', gap:2, padding:'4px 6px', boxShadow:'0 4px 16px rgba(0,0,0,0.3)' }}>
          {[
            { cmd:'bold',      icon:<BoldIcon size={14}/>,    title:'Bold' },
            { cmd:'italic',    icon:<ItalicIcon size={14}/>,  title:'Italic' },
          ].map(({ cmd, icon, title }) => (
            <button key={cmd} title={title} onMouseDown={e => { e.preventDefault(); exec(cmd); }} style={{ padding:'4px 8px', borderRadius:5, border:'none', background:'none', cursor:'pointer', color:'rgba(255,255,255,0.85)' }} onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.1)')} onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background='none')}>{icon}</button>
          ))}
          <div style={{ width:1, background:'rgba(255,255,255,0.2)', margin:'4px 4px' }}/>
          <button title="Link" onMouseDown={e => { e.preventDefault(); insertLink(); }} style={{ padding:'4px 8px', borderRadius:5, border:'none', background:'none', cursor:'pointer', color:'rgba(255,255,255,0.85)' }} onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.1)')} onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background='none')}><LinkIcon size={14}/></button>
          <button title="Remove formatting" onMouseDown={e => { e.preventDefault(); exec('removeFormat'); }} style={{ padding:'4px 8px', borderRadius:5, border:'none', background:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', fontSize:12, fontFamily:'inherit' }} onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.1)')} onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background='none')}>✕</button>
        </div>,
        document.body
      )}
      <style>{`[data-ph]:empty:before{content:attr(data-ph);color:${TX3};pointer-events:none}`}</style>
    </div>
  );
}

function VarInput({ value, onChange, placeholder, autoFocus, style }: { value:string; onChange:(v:string)=>void; placeholder?:string; autoFocus?:boolean; style?: React.CSSProperties }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  
  // Auto-resize logic
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

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
    <div style={{ display:'flex', flexDirection:'column' }}>
      <textarea 
        ref={ref} 
        autoFocus={autoFocus} 
        value={value} 
        onChange={e=>onChange(e.target.value)} 
        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
        style={{ ...style, overflow: 'hidden' }} 
        placeholder={placeholder}
        rows={1}
      />
      <VarPicker onInsert={handleInsert}/>
    </div>
  );
}