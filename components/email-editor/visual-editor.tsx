'use client';

/**
 * components/email-editor/visual-editor.tsx
 *
 * Self-contained drag-and-drop block editor.
 * Props: { value: string; onChange: (html: string) => void }
 * — identical interface to the old contentEditable editor.
 *
 * REQUIRED: npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  PlusIcon, GripVerticalIcon, TrashIcon, SparklesIcon,
  TypeIcon, Heading2Icon, MousePointerClickIcon, ImageIcon,
  MinusIcon, MoveVerticalIcon, XIcon,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type BlockType = 'heading' | 'text' | 'button' | 'image' | 'divider' | 'spacer';

interface HeadingBlock { id: string; type: 'heading'; content: string; level: 1|2|3 }
interface TextBlock    { id: string; type: 'text';    content: string }
interface ButtonBlock  { id: string; type: 'button';  text: string; url: string; color: string; align: 'left'|'center'|'right' }
interface ImageBlock   { id: string; type: 'image';   src: string; alt: string }
interface DividerBlock { id: string; type: 'divider' }
interface SpacerBlock  { id: string; type: 'spacer';  height: number }
type Block = HeadingBlock | TextBlock | ButtonBlock | ImageBlock | DividerBlock | SpacerBlock;

let _c = 0;
function uid() { return `b_${Date.now()}_${++_c}`; }

function defaultBlock(type: BlockType): Block {
  switch (type) {
    case 'heading': return { id: uid(), type: 'heading', content: 'Your headline here', level: 2 };
    case 'text':    return { id: uid(), type: 'text',    content: 'Write your content here.' };
    case 'button':  return { id: uid(), type: 'button',  text: 'Click here →', url: 'https://', color: '#22C55E', align: 'center' };
    case 'image':   return { id: uid(), type: 'image',   src: '', alt: '' };
    case 'divider': return { id: uid(), type: 'divider' };
    case 'spacer':  return { id: uid(), type: 'spacer',  height: 24 };
  }
}

// ── HTML ──────────────────────────────────────────────────────────────────────

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

function blocksToHtml(blocks: Block[]): string {
  return blocks.map(b => {
    switch (b.type) {
      case 'heading': {
        const sz = { 1:'28px', 2:'22px', 3:'18px' }[b.level];
        return `<h${b.level} style="font-family:${FONT};font-size:${sz};font-weight:700;color:#111827;margin:0 0 14px;line-height:1.2">${esc(b.content)}</h${b.level}>`;
      }
      case 'text':
        return `<p style="font-family:${FONT};font-size:15px;line-height:1.75;color:#374151;margin:0 0 14px">${b.content}</p>`;
      case 'button': {
        const al = b.align==='center'?'text-align:center':b.align==='right'?'text-align:right':'text-align:left';
        return `<p style="${al};margin:24px 0"><a href="${ea(b.url)}" style="display:inline-block;background:${ea(b.color)};color:#fff;font-family:${FONT};font-weight:600;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none">${esc(b.text)}</a></p>`;
      }
      case 'image':
        return b.src ? `<p style="text-align:center;margin:20px 0"><img src="${ea(b.src)}" alt="${ea(b.alt)}" style="max-width:100%;height:auto;border-radius:8px"/></p>` : '';
      case 'divider':
        return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0"/>`;
      case 'spacer':
        return `<div style="height:${b.height}px;line-height:${b.height}px">&nbsp;</div>`;
    }
  }).filter(Boolean).join('\n');
}

function esc(s: string) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function ea(s: string)  { return s.replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function htmlToBlocks(html: string): Block[] {
  if (!html?.trim()) return [];
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const out: Block[] = [];
    function walk(el: Element) {
      const tag = el.tagName?.toLowerCase();
      if (!tag) return;
      if (['h1','h2','h3'].includes(tag)) {
        const txt = el.textContent?.trim();
        if (txt) out.push({ id:uid(), type:'heading', content:txt, level:+tag[1] as 1|2|3 });
        return;
      }
      if (tag==='hr') { out.push({ id:uid(), type:'divider' }); return; }
      if (tag==='div') {
        const style=(el as HTMLElement).getAttribute('style')||'';
        if (style.includes('height:') && !el.textContent?.trim().replace('\u00a0','')) {
          const m=style.match(/height:(\d+)/);
          out.push({ id:uid(), type:'spacer', height:m?+m[1]:24 });
          return;
        }
        Array.from(el.children).forEach(walk); return;
      }
      if (tag==='p') {
        const a=el.querySelector('a') as HTMLAnchorElement|null;
        if (a) {
          const bg=a.style.background||a.style.backgroundColor;
          if (bg&&bg!=='none'&&bg!=='transparent') {
            const pAl=(el as HTMLElement).style.textAlign;
            out.push({ id:uid(), type:'button', text:a.textContent?.trim()||'Click', url:a.getAttribute('href')||'#', color:bg, align:pAl==='right'?'right':pAl==='left'?'left':'center' });
            return;
          }
        }
        const img=el.querySelector('img') as HTMLImageElement|null;
        if (img) { out.push({ id:uid(), type:'image', src:img.getAttribute('src')||'', alt:img.getAttribute('alt')||'' }); return; }
        const inner=el.innerHTML?.trim();
        if (inner) out.push({ id:uid(), type:'text', content:inner });
        return;
      }
      if (tag==='img') { out.push({ id:uid(), type:'image', src:(el as HTMLImageElement).getAttribute('src')||'', alt:(el as HTMLImageElement).getAttribute('alt')||'' }); return; }
      if (el.children.length) { Array.from(el.children).forEach(walk); return; }
      const txt=el.textContent?.trim();
      if (txt) out.push({ id:uid(), type:'text', content:txt });
    }
    Array.from(doc.body.children).forEach(walk);
    return out;
  } catch { return []; }
}

// ── Design tokens (matches RevTray light theme CSS vars) ──────────────────────

const C = {
  bg:       'var(--surface-app, #F7F8FA)',
  card:     'var(--surface-card, #FFFFFF)',
  border:   'var(--sidebar-border, #E6E8EC)',
  brand:    'var(--brand, #22C55E)',
  brandBg:  'rgba(34,197,94,0.08)',
  text:     'var(--text-primary, #0D0F12)',
  sub:      'var(--text-secondary, #5A6472)',
  hint:     'var(--text-tertiary, #9AA3AF)',
  red:      '#EF4444',
};

// ── Block menu ────────────────────────────────────────────────────────────────

const MENU: { type: BlockType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type:'heading',  label:'Heading',  icon:<Heading2Icon size={14}/>,          desc:'Title or section header' },
  { type:'text',     label:'Text',     icon:<TypeIcon size={14}/>,              desc:'Paragraph of body text' },
  { type:'button',   label:'Button',   icon:<MousePointerClickIcon size={14}/>, desc:'Call-to-action button' },
  { type:'image',    label:'Image',    icon:<ImageIcon size={14}/>,             desc:'Photo or graphic' },
  { type:'divider',  label:'Divider',  icon:<MinusIcon size={14}/>,             desc:'Horizontal line' },
  { type:'spacer',   label:'Spacer',   icon:<MoveVerticalIcon size={14}/>,      desc:'Vertical spacing' },
];

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props { value: string; onChange: (html: string) => void; }

export function VisualEditor({ value, onChange }: Props) {
  const [blocks,    setBlocks]    = useState<Block[]>([]);
  const [selId,     setSelId]     = useState<string|null>(null);
  const [menuAt,    setMenuAt]    = useState<string|'end'|null>(null);
  const [showAI,    setShowAI]    = useState(false);
  const [aiProd,    setAiProd]    = useState('');
  const [aiAud,     setAiAud]     = useState('');
  const [aiGoal,    setAiGoal]    = useState('');
  const [aiLoad,    setAiLoad]    = useState(false);
  const [aiErr,     setAiErr]     = useState('');
  const inited = useRef(false);

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;
    const p = htmlToBlocks(value);
    setBlocks(p.length > 0 ? p : [
      { id:uid(), type:'heading', content:"Hello {{firstName | fallback: 'there'}}!", level:2 },
      { id:uid(), type:'text',    content:'Write your email content here. Keep it personal, valuable, and to the point.' },
      { id:uid(), type:'button',  text:'Click here →', url:'https://', color:'#22C55E', align:'center' },
      { id:uid(), type:'text',    content:'– {{senderName}}' },
    ]);
  }, []); // eslint-disable-line

  const push = useCallback((fn: (p: Block[]) => Block[]) => {
    setBlocks(prev => { const next=fn(prev); onChange(blocksToHtml(next)); return next; });
  }, [onChange]);

  function addBlock(type: BlockType, after: string|'end'|null) {
    const b = defaultBlock(type);
    push(prev => {
      if (!after || after==='end') return [...prev, b];
      const i=prev.findIndex(x=>x.id===after);
      const n=[...prev]; n.splice(i+1,0,b); return n;
    });
    setSelId(b.id); setMenuAt(null);
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    push(prev => prev.map(b => b.id===id ? {...b,...patch} as Block : b));
  }

  function deleteBlock(id: string) {
    push(prev => prev.filter(b => b.id!==id));
    if (selId===id) setSelId(null);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint:{ distance:5 } }));
  function onDragEnd({ active, over }: DragEndEvent) {
    if (over && active.id!==over.id)
      push(prev => arrayMove(prev, prev.findIndex(b=>b.id===active.id), prev.findIndex(b=>b.id===over.id)));
  }

  async function handleAI() {
    if (!aiProd.trim()||!aiAud.trim()||!aiGoal.trim()) { setAiErr('Fill in all three fields.'); return; }
    setAiLoad(true); setAiErr('');
    try {
      const { generateEmailBlocks } = await import('@/lib/ai/block-generator');
      const r = await generateEmailBlocks({ subject:'Email campaign', product:aiProd, audience:aiAud, goal:aiGoal });
      if (!r.success) { setAiErr(r.error); return; }
      const p = htmlToBlocks(r.data.htmlBody);
      if (p.length) { push(()=>p); setShowAI(false); setSelId(null); }
      else setAiErr('Could not parse result. Try again.');
    } catch { setAiErr('Something went wrong.'); }
    finally { setAiLoad(false); }
  }

  const inp: React.CSSProperties = { width:'100%', padding:'8px 10px', fontSize:13, border:`1px solid ${C.border}`, borderRadius:6, outline:'none', fontFamily:'inherit', color:C.text, background:C.card, boxSizing:'border-box' };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:420, background:C.bg }}>

      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 16px', background:C.card, borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
        <div style={{ position:'relative' }}>
          <button onClick={() => setMenuAt(menuAt==='end'&&!selId?null:'end')}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, border:`1px solid ${C.border}`, background:C.card, cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600, color:C.text }}>
            <PlusIcon size={13}/> Add block
          </button>
          {menuAt==='end' && !selId && <AddMenu onSelect={t=>addBlock(t,'end')} onClose={()=>setMenuAt(null)}/>}
        </div>
        <div style={{flex:1}}/>
        <button onClick={()=>setShowAI(s=>!s)}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:7, border:`1px solid rgba(34,197,94,0.3)`, background:showAI?C.brandBg:C.card, cursor:'pointer', fontFamily:'inherit', fontSize:12, fontWeight:600, color:C.brand }}>
          <SparklesIcon size={13}/> Generate with AI
        </button>
      </div>

      {/* AI panel */}
      {showAI && (
        <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:16, flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:C.text, margin:0 }}>Generate email with AI</p>
              <p style={{ fontSize:11, color:C.hint, margin:'2px 0 0' }}>Replaces current blocks · uses 5 AI credits</p>
            </div>
            <button onClick={()=>setShowAI(false)} style={{ background:'none', border:'none', cursor:'pointer', color:C.hint, padding:4 }}><XIcon size={14}/></button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
            {([['What you sell',aiProd,setAiProd,'e.g. real estate course'],["Who it's for",aiAud,setAiAud,'e.g. beginners'],['Goal',aiGoal,setAiGoal,'e.g. join my course']] as const).map(([label,val,set,ph])=>(
              <div key={label}>
                <label style={{ fontSize:11, fontWeight:600, color:C.sub, display:'block', marginBottom:3 }}>{label}</label>
                <input value={val as string} onChange={e=>(set as Function)(e.target.value)} placeholder={ph} style={inp}/>
              </div>
            ))}
          </div>
          {aiErr && <p style={{ fontSize:12, color:C.red, margin:'0 0 8px' }}>{aiErr}</p>}
          <button onClick={handleAI} disabled={aiLoad}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:7, border:'none', background:C.brand, color:'#fff', fontSize:13, fontWeight:600, cursor:aiLoad?'wait':'pointer', opacity:aiLoad?0.7:1, fontFamily:'inherit' }}>
            <SparklesIcon size={13}/>{aiLoad?'Generating…':'Generate'}
          </button>
        </div>
      )}

      {/* Canvas */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 24px' }} onClick={()=>{ setSelId(null); setMenuAt(null); }}>
        <div style={{ maxWidth:560, margin:'0 auto' }} onClick={e=>e.stopPropagation()}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={blocks.map(b=>b.id)} strategy={verticalListSortingStrategy}>
              {blocks.map(block => (
                <SortableBlock key={block.id} block={block} selected={selId===block.id}
                  onSelect={()=>setSelId(selId===block.id?null:block.id)}
                  onUpdate={patch=>updateBlock(block.id,patch)}
                  onDelete={()=>deleteBlock(block.id)}
                  menuOpen={menuAt===block.id}
                  onMenuOpen={()=>setMenuAt(menuAt===block.id?null:block.id)}
                  onMenuClose={()=>setMenuAt(null)}
                  onMenuSelect={t=>addBlock(t,block.id)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {blocks.length===0 && (
            <div onClick={()=>setMenuAt('end')} style={{ border:`2px dashed ${C.border}`, borderRadius:10, padding:'40px 20px', textAlign:'center', cursor:'pointer', color:C.hint, fontSize:13 }}>
              <PlusIcon size={20} style={{ margin:'0 auto 8px', display:'block', opacity:0.4 }}/> Click to add your first block
            </div>
          )}

          {blocks.length>0 && (
            <div style={{ position:'relative', marginTop:6 }}>
              <button onClick={()=>setMenuAt(menuAt==='end'?null:'end')}
                style={{ width:'100%', padding:8, borderRadius:7, border:`1px dashed ${C.border}`, background:'transparent', cursor:'pointer', fontSize:12, color:C.hint, display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontFamily:'inherit' }}>
                <PlusIcon size={12}/> Add block
              </button>
              {menuAt==='end' && <AddMenu onSelect={t=>addBlock(t,'end')} onClose={()=>setMenuAt(null)} above/>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SortableBlock ─────────────────────────────────────────────────────────────

function SortableBlock({ block, selected, onSelect, onUpdate, onDelete, menuOpen, onMenuOpen, onMenuClose, onMenuSelect }: {
  block:Block; selected:boolean;
  onSelect:()=>void; onUpdate:(p:Partial<Block>)=>void; onDelete:()=>void;
  menuOpen:boolean; onMenuOpen:()=>void; onMenuClose:()=>void; onMenuSelect:(t:BlockType)=>void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id:block.id });
  return (
    <div ref={setNodeRef} style={{ transform:CSS.Transform.toString(transform), transition, opacity:isDragging?0.4:1, marginBottom:6, position:'relative' }}>
      <div onClick={onSelect} style={{ position:'relative', borderRadius:8, border:selected?`2px solid var(--brand,#22C55E)`:`1px solid transparent`, background:selected?'rgba(34,197,94,0.06)':'transparent', padding:'2px 4px 2px 26px', cursor:'pointer', transition:'border-color 0.12s,background 0.12s' }}
        onMouseEnter={e=>{ if(!selected)(e.currentTarget as HTMLElement).style.borderColor='var(--sidebar-border,#E6E8EC)'; }}
        onMouseLeave={e=>{ if(!selected)(e.currentTarget as HTMLElement).style.borderColor='transparent'; }}>
        <div {...attributes} {...listeners} style={{ position:'absolute', left:4, top:'50%', transform:'translateY(-50%)', cursor:'grab', color:'var(--text-tertiary,#9AA3AF)', opacity:selected?1:0, transition:'opacity 0.12s', padding:'4px 2px' }} onClick={e=>e.stopPropagation()}>
          <GripVerticalIcon size={12}/>
        </div>
        {!selected && <Preview block={block}/>}
        {selected && (
          <div onClick={e=>e.stopPropagation()}>
            <Edit block={block} onUpdate={onUpdate}/>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, paddingTop:8, borderTop:`1px solid var(--sidebar-border,#E6E8EC)` }}>
              <button onClick={onDelete} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:5, border:`1px solid var(--sidebar-border,#E6E8EC)`, background:'none', cursor:'pointer', fontSize:11, color:'#EF4444', fontFamily:'inherit' }}>
                <TrashIcon size={11}/> Delete
              </button>
              <div style={{flex:1}}/>
              <div style={{ position:'relative' }}>
                <button onClick={onMenuOpen} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 8px', borderRadius:5, border:`1px solid var(--sidebar-border,#E6E8EC)`, background:'none', cursor:'pointer', fontSize:11, color:'var(--text-secondary,#5A6472)', fontFamily:'inherit' }}>
                  <PlusIcon size={11}/> Add below
                </button>
                {menuOpen && <AddMenu onSelect={onMenuSelect} onClose={onMenuClose}/>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Preview ───────────────────────────────────────────────────────────────────

function Preview({ block }: { block:Block }) {
  switch (block.type) {
    case 'heading': return <div style={{ fontFamily:"'Bricolage Grotesque',system-ui,sans-serif", fontSize:block.level===1?22:block.level===2?18:15, fontWeight:700, color:'var(--text-primary,#0D0F12)', padding:'6px 0', lineHeight:1.2 }}>{block.content||<span style={{color:'var(--text-tertiary,#9AA3AF)'}}>Heading…</span>}</div>;
    case 'text':    return <div style={{ fontSize:14, color:'var(--text-secondary,#5A6472)', padding:'5px 0', lineHeight:1.6, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} dangerouslySetInnerHTML={{__html:block.content||`<span style="color:var(--text-tertiary,#9AA3AF)">Paragraph…</span>`}}/>;
    case 'button':  return <div style={{ textAlign:block.align, padding:'8px 0' }}><span style={{ display:'inline-block', background:block.color, color:'#fff', padding:'8px 20px', borderRadius:7, fontSize:13, fontWeight:600 }}>{block.text||'Button'}</span></div>;
    case 'image':   return <div style={{ textAlign:'center', padding:'8px 0' }}>{block.src?<img src={block.src} alt={block.alt} style={{maxWidth:'100%',maxHeight:100,borderRadius:6,objectFit:'cover'}}/>:<div style={{height:56,border:`1px dashed var(--sidebar-border,#E6E8EC)`,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-tertiary,#9AA3AF)',fontSize:12,gap:6}}><ImageIcon size={14}/> Image URL not set</div>}</div>;
    case 'divider': return <hr style={{ border:'none', borderTop:`1px solid var(--sidebar-border,#E6E8EC)`, margin:'10px 0' }}/>;
    case 'spacer':  return <div style={{ height:Math.min(block.height,36), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--text-tertiary,#9AA3AF)', gap:4 }}><MoveVerticalIcon size={12}/>{block.height}px spacer</div>;
  }
}

// ── Edit ──────────────────────────────────────────────────────────────────────

function Edit({ block, onUpdate }: { block:Block; onUpdate:(p:Partial<Block>)=>void }) {
  const inp: React.CSSProperties = { width:'100%', padding:'8px 10px', fontSize:13, border:`1px solid var(--sidebar-border,#E6E8EC)`, borderRadius:6, outline:'none', fontFamily:'inherit', color:'var(--text-primary,#0D0F12)', background:'var(--surface-card,#FFFFFF)', boxSizing:'border-box' };
  switch (block.type) {
    case 'heading': return <div style={{paddingTop:4}}>
      <div style={{display:'flex',gap:5,marginBottom:8}}>
        {([1,2,3] as const).map(l=><button key={l} onClick={()=>onUpdate({level:l})} style={{padding:'3px 8px',borderRadius:5,border:`1px solid var(--sidebar-border,#E6E8EC)`,fontSize:11,fontWeight:700,fontFamily:'inherit',cursor:'pointer',background:block.level===l?'var(--brand,#22C55E)':'none',color:block.level===l?'#fff':'var(--text-secondary,#5A6472)'}}>H{l}</button>)}
      </div>
      <input autoFocus value={block.content} onChange={e=>onUpdate({content:e.target.value})} style={inp} placeholder="Heading text…"/>
    </div>;
    case 'text': return <textarea autoFocus value={block.content.replace(/<[^>]+>/g,' ')} onChange={e=>onUpdate({content:e.target.value})} rows={3} style={{...inp,resize:'vertical',height:'auto',lineHeight:1.6}} placeholder="Paragraph text…"/>;
    case 'button': return <div style={{display:'flex',flexDirection:'column',gap:8,paddingTop:4}}>
      <input value={block.text} onChange={e=>onUpdate({text:e.target.value})} style={inp} placeholder="Button label"/>
      <input value={block.url} onChange={e=>onUpdate({url:e.target.value})} style={inp} placeholder="https://..."/>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <label style={{fontSize:11,color:'var(--text-secondary,#5A6472)'}}>Color</label>
        <input type="color" value={block.color} onChange={e=>onUpdate({color:e.target.value})} style={{width:32,height:28,border:`1px solid var(--sidebar-border,#E6E8EC)`,borderRadius:5,cursor:'pointer',padding:2}}/>
        <div style={{marginLeft:'auto',display:'flex',gap:4}}>
          {(['left','center','right'] as const).map(a=><button key={a} onClick={()=>onUpdate({align:a})} style={{padding:'3px 7px',borderRadius:4,border:`1px solid var(--sidebar-border,#E6E8EC)`,fontSize:10,fontFamily:'inherit',cursor:'pointer',background:block.align===a?'var(--brand,#22C55E)':'none',color:block.align===a?'#fff':'var(--text-secondary,#5A6472)'}}>{a[0].toUpperCase()}{a.slice(1)}</button>)}
        </div>
      </div>
    </div>;
    case 'image': return <div style={{display:'flex',flexDirection:'column',gap:8,paddingTop:4}}>
      <input value={block.src} onChange={e=>onUpdate({src:e.target.value})} style={inp} placeholder="Image URL (https://...)"/>
      <input value={block.alt} onChange={e=>onUpdate({alt:e.target.value})} style={inp} placeholder="Alt text"/>
    </div>;
    case 'divider': return <p style={{fontSize:12,color:'var(--text-tertiary,#9AA3AF)',padding:'4px 0',margin:0}}>Horizontal divider — no settings.</p>;
    case 'spacer': return <div style={{display:'flex',alignItems:'center',gap:10,paddingTop:4}}>
      <label style={{fontSize:12,color:'var(--text-secondary,#5A6472)'}}>Height: {block.height}px</label>
      <input type="range" min={8} max={120} step={4} value={block.height} onChange={e=>onUpdate({height:+e.target.value})} style={{flex:1}}/>
    </div>;
  }
}

// ── AddMenu ───────────────────────────────────────────────────────────────────

function AddMenu({ onSelect, onClose, above }:{onSelect:(t:BlockType)=>void; onClose:()=>void; above?:boolean}) {
  useEffect(()=>{
    const h=(e:MouseEvent)=>{ if(!(e.target as HTMLElement).closest('[data-addmenu]')) onClose(); };
    document.addEventListener('mousedown',h);
    return ()=>document.removeEventListener('mousedown',h);
  },[onClose]);
  return (
    <div data-addmenu="true" style={{ position:'absolute', [above?'bottom':'top']:'100%', left:0, zIndex:100, marginTop:4, marginBottom:4, background:'var(--surface-card,#FFFFFF)', border:`1px solid var(--sidebar-border,#E6E8EC)`, borderRadius:10, boxShadow:'0 4px 20px rgba(0,0,0,0.1)', padding:6, minWidth:220 }}>
      <p style={{ fontSize:10, fontWeight:700, color:'var(--text-tertiary,#9AA3AF)', textTransform:'uppercase', letterSpacing:'0.07em', padding:'4px 8px 6px', margin:0 }}>Add block</p>
      {MENU.map(({type,label,icon,desc})=>(
        <button key={type} onMouseDown={e=>{e.preventDefault();onSelect(type);}}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'7px 10px', borderRadius:7, border:'none', background:'none', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}
          onMouseEnter={e=>(e.currentTarget.style.background='var(--surface-app,#F7F8FA)')}
          onMouseLeave={e=>(e.currentTarget.style.background='none')}>
          <span style={{color:'var(--text-secondary,#5A6472)'}}>{icon}</span>
          <div>
            <p style={{fontSize:13,fontWeight:600,color:'var(--text-primary,#0D0F12)',margin:0}}>{label}</p>
            <p style={{fontSize:11,color:'var(--text-tertiary,#9AA3AF)',margin:0}}>{desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
