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

const BLOCK_TYPES: [BlockType, string, React.ReactNode, string][] = [
  ['heading', 'Heading',  <Heading2Icon size={16}/>,          'Title or section header'],
  ['text',    'Text',     <TypeIcon size={16}/>,              'Paragraph with rich formatting'],
  ['button',  'Button',   <MousePointerClickIcon size={16}/>, 'Call-to-action button'],
  ['image',   'Image',    <ImageIcon size={16}/>,             'Photo or graphic'],
  ['columns', 'Columns',  <Columns2Icon size={16}/>,          'Two-column layout'],
  ['divider', 'Divider',  <MinusIcon size={16}/>,             'Horizontal rule'],
  ['spacer',  'Spacer',   <MoveVerticalIcon size={16}/>,      'Empty vertical space'],
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
      { id:uid(), type:'button' as const,  text:'Claim your offer', url:'https://', color:'#22C55E', align:'center' as const },
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
    <div className="flex h-full min-h-[800px] bg-white overflow-hidden relative">
      
      {/* ── Left: Blocks Sidebar ── */}
      {!showPreview && (
        <div className="w-72 bg-gray-50/50 border-r border-gray-200 flex flex-col shrink-0 z-10">
          <div className="px-6 py-5 border-b border-gray-100 bg-white">
            <h3 className="text-sm font-bold text-gray-900">Content Blocks</h3>
            <p className="text-xs text-gray-500 mt-1">Click to add to your email</p>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            {BLOCK_TYPES.map(([type, label, icon, desc]) => (
              <button 
                key={type} 
                onClick={() => addBlock(type)}
                className="w-full flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5 transition-all text-left group"
              >
                <div className="p-2.5 bg-gray-50 rounded-lg text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  {icon}
                </div>
                <div className="mt-0.5">
                  <p className="text-sm font-bold text-gray-700 group-hover:text-gray-900">{label}</p>
                  <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Center: Canvas Area ── */}
      <div className="flex-1 min-w-0 flex flex-col relative bg-[#F3F4F6]">
        
        {/* Floating View Toggle */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 flex items-center p-1 bg-white rounded-full shadow-sm border border-gray-200">
          <button 
            onClick={() => { setShowPreview(false); }}
            className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-xs font-bold transition-all ${!showPreview ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Edit
          </button>
          <button 
            onClick={() => { setShowPreview(true); setSelId(null); }}
            className={`flex items-center gap-2 px-5 py-1.5 rounded-full text-xs font-bold transition-all ${showPreview ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Preview
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-24" onClick={() => setSelId(null)}>
          <div 
            className="max-w-[600px] mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[600px] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {showPreview ? (
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} className="font-sans text-gray-800 leading-relaxed p-8" />
            ) : (
              <div className="p-8">
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
                
                <div className="mt-8 flex justify-center">
                  <AddBlockButton onSelect={t => addBlock(t)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white border-2 border-dashed border-gray-200 text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right: Properties Sidebar ── */}
      {!showPreview && selId && selectedBlock && (
        <div className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {BLOCK_TYPES.find(t => t[0] === selectedBlock.type)?.[1]} Properties
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => deleteBlock(selectedBlock.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Delete block">
                <TrashIcon size={16}/>
              </button>
              <button onClick={() => setSelId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md transition-colors">
                <XIcon size={16}/>
              </button>
            </div>
          </div>
          <div className="p-5 overflow-y-auto flex-1">
            <PropertiesPanel block={selectedBlock} onUpdate={p => updateBlock(selectedBlock.id, p)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Canvas Block Wrapper ──────────────────────────────────────────────────────

function SBlock({ block, selected, onSelect, onUpdate }: { block:Block; selected:boolean; onSelect:()=>void; onUpdate:(p:Partial<Block>)=>void; }) {
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

      <div 
        onClick={onSelect}
        className={`rounded-xl px-4 py-2 cursor-pointer transition-colors ${selected ? 'bg-blue-50/50 ring-1 ring-blue-100' : 'hover:bg-gray-50'}`}
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
        const sz = ({1:'text-3xl',2:'text-2xl',3:'text-xl'} as Record<number,string>)[block.level];
        return <VarInput value={block.content} onChange={v=>onUpdate({content:v})} className={`w-full bg-transparent border-none p-0 outline-none font-bold text-gray-900 resize-none ${sz}`} placeholder="Heading..." autoFocus/>;
      }
      const sz = ({1:'text-3xl',2:'text-2xl',3:'text-xl'} as Record<number,string>)[block.level];
      return <div className={`font-bold text-gray-900 leading-tight ${sz}`}>{block.content||<span className="text-gray-300">Heading…</span>}</div>;
    
    case 'text':    
      if (selected) {
        return <RichTextEdit value={block.content} onChange={v=>onUpdate({content:v})} className="border-none bg-transparent p-0 min-h-[40px]" />;
      }
      return <div className="text-[15px] text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{__html:block.content||'<span class="text-gray-300">Type something…</span>'}}/>;
    
    case 'button':  
      return <div className={`py-3 text-${block.align}`}><span style={{ background:block.color }} className="inline-block text-white px-7 py-3 rounded-lg text-[15px] font-semibold shadow-sm">{block.text||'Button'}</span></div>;
    
    case 'image':   
      return <div className="text-center py-3">{block.src?<img src={block.src} alt={block.alt} className="max-w-full max-h-[300px] rounded-lg object-contain mx-auto shadow-sm border border-gray-100"/>:<div className="h-32 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center text-gray-400 text-sm gap-2 bg-gray-50"><ImageIcon size={24} className="opacity-50"/> Image placeholder</div>}</div>;
    
    case 'divider': 
      return <hr className="border-none border-t border-gray-200 my-6"/>;
    
    case 'spacer':  
      return <div style={{ height:block.height }} className={`flex items-center justify-center text-[11px] text-gray-400 transition-colors rounded-md ${selected ? 'border border-dashed border-gray-300 bg-gray-50/50' : 'border border-transparent'}`}>{selected && `${block.height}px`}</div>;
    
    case 'columns': 
      return (
        <div className="flex gap-4 py-2">
          <div className="flex-1">
            {selected ? <RichTextEdit value={block.left} onChange={v=>onUpdate({left:v})} className="border border-dashed border-gray-300 p-2 rounded-lg bg-white" /> : <div className="text-[15px] text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{__html:block.left}}/>}
          </div>
          <div className="flex-1">
            {selected ? <RichTextEdit value={block.right} onChange={v=>onUpdate({right:v})} className="border border-dashed border-gray-300 p-2 rounded-lg bg-white" /> : <div className="text-[15px] text-gray-600 leading-relaxed" dangerouslySetInnerHTML={{__html:block.right}}/>}
          </div>
        </div>
      );
  }
}

// ── Right Sidebar Properties Panel ────────────────────────────────────────────

function PropertiesPanel({ block, onUpdate }: { block:Block; onUpdate:(p:Partial<Block>)=>void }) {
  const Label = ({ children }: { children: React.ReactNode }) => <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">{children}</label>;
  const Input = (props: any) => <input className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white" {...props} />;

  switch (block.type) {
    case 'heading':
      return (
        <div className="space-y-6">
          <div>
            <Label>Heading Level</Label>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {([1,2,3] as const).map(l=>(
                <button key={l} onClick={()=>onUpdate({level:l})} className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${block.level===l ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>H{l}</button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg border border-gray-100">Edit the text directly on the canvas.</p>
        </div>
      );
    case 'text':
    case 'columns':
      return <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg border border-gray-100">Edit the text content directly on the canvas. Highlight text to see formatting options.</p>;
    
    case 'button':
      return (
        <div className="space-y-5">
          <div>
            <Label>Button Label</Label>
            <Input value={block.text} onChange={(e:any)=>onUpdate({text:e.target.value})} placeholder="Click here"/>
          </div>
          <div>
            <Label>Link URL</Label>
            <Input value={block.url} onChange={(e:any)=>onUpdate({url:e.target.value})} placeholder="https://..."/>
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
              <span className="text-sm font-semibold text-blue-600">Click to upload</span>
            </label>
            {block.src && <button onClick={()=>onUpdate({src:''})} className="mt-2 text-xs font-medium text-red-500 hover:text-red-600">Remove image</button>}
          </div>
          <div>
            <Label>Image Link (Optional)</Label>
            <Input value={block.url || ''} onChange={(e:any)=>onUpdate({url:e.target.value})} placeholder="https://..."/>
          </div>
          <div>
            <Label>Alt Text</Label>
            <Input value={block.alt} onChange={(e:any)=>onUpdate({alt:e.target.value})} placeholder="Describe the image..."/>
          </div>
        </div>
      );
    
    case 'spacer':
      return (
        <div className="space-y-4">
          <Label>Height ({block.height}px)</Label>
          <input type="range" min={8} max={120} step={4} value={block.height} onChange={e=>onUpdate({height:+e.target.value})} className="w-full accent-blue-500"/>
          <Input type="number" min={8} max={120} value={block.height} onChange={(e:any)=>onUpdate({height:+e.target.value})} />
        </div>
      );
      
    case 'divider':
      return <p className="text-xs text-gray-400 bg-gray-50 p-3 rounded-lg border border-gray-100">Horizontal divider — no settings available.</p>;
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
            <div className="w-8 h-8 rounded-md bg-gray-100 text-gray-500 flex items-center justify-center group-hover:bg-white group-hover:text-blue-600 group-hover:shadow-sm transition-all">
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
              className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-50 text-left transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">{v.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RichTextEdit({ value, onChange, placeholder, className }: { value:string; onChange:(v:string)=>void; placeholder?:string; className?: string }) {
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
    <div className="relative group">
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        onBlur={() => { sync(); setTimeout(()=>setToolbar(null), 150); }}
        onMouseUp={checkSelection}
        onKeyUp={checkSelection}
        data-ph={placeholder || 'Write here…'}
        className={`text-[15px] leading-relaxed outline-none text-gray-800 ${className || ''}`}
      />
      <div className="opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
        <VarPicker onInsert={v => { ref.current?.focus(); document.execCommand('insertText', false, v); sync(); }} />
      </div>

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
          <button title="Remove formatting" onMouseDown={e => { e.preventDefault(); exec('removeFormat'); }} className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors text-xs font-bold">✕</button>
        </div>,
        document.body
      )}
      <style>{`[data-ph]:empty:before{content:attr(data-ph);color:#9CA3AF;pointer-events:none}`}</style>
    </div>
  );
}

function VarInput({ value, onChange, placeholder, autoFocus, className }: { value:string; onChange:(v:string)=>void; placeholder?:string; autoFocus?:boolean; className?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  
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
    <div className="flex flex-col group">
      <textarea 
        ref={ref} 
        autoFocus={autoFocus} 
        value={value} 
        onChange={e=>onChange(e.target.value)} 
        onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
        className={`overflow-hidden ${className || ''}`}
        placeholder={placeholder}
        rows={1}
      />
      <div className="opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
        <VarPicker onInsert={handleInsert}/>
      </div>
    </div>
  );
}
