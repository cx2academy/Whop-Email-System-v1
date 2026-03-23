'use client';

/**
 * components/email-editor/block-editor/index.tsx
 *
 * Drag-and-drop visual block editor for email campaigns.
 *
 * Interface: { value: string; onChange: (html: string) => void; brandColor?: string }
 * Same as old VisualEditor — drop-in replacement.
 *
 * Blocks: Heading · Text · Button · Image · Divider · Spacer
 * Draggable via @dnd-kit/sortable
 * Inline editing on click
 * "Generate with AI" → calls generateEmailBlocks server action
 *
 * Install before deploying:
 *   npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  PlusIcon, GripVerticalIcon, TrashIcon, SparklesIcon,
  TypeIcon, Heading2Icon, MousePointerClickIcon, ImageIcon,
  MinusIcon, MoveVerticalIcon, XIcon, CheckIcon,
} from 'lucide-react';

import type { Block, BlockType } from './types';
import { uid, defaultBlock } from './types';
import { blocksToHtml, htmlToBlocks } from './html';
import { generateEmailBlocks } from '@/lib/ai/block-generator';

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:       '#F7F8FA',
  card:     '#FFFFFF',
  border:   '#E6E8EC',
  selected: '#22C55E',
  selBg:    'rgba(34,197,94,0.06)',
  text:     '#0D0F12',
  sub:      '#5A6472',
  hint:     '#9AA3AF',
  red:      '#EF4444',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  value:     string;
  onChange:  (html: string) => void;
  brandColor?: string;
  subject?:  string;  // passed from campaign builder for AI context
}

// ── Block config ──────────────────────────────────────────────────────────────

const BLOCK_MENU: { type: BlockType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'heading', label: 'Heading',  icon: <Heading2Icon size={15} />,           desc: 'Big section title' },
  { type: 'text',    label: 'Text',     icon: <TypeIcon size={15} />,               desc: 'Paragraph of text' },
  { type: 'button',  label: 'Button',   icon: <MousePointerClickIcon size={15} />,  desc: 'Call-to-action button' },
  { type: 'image',   label: 'Image',    icon: <ImageIcon size={15} />,              desc: 'Photo or graphic' },
  { type: 'divider', label: 'Divider',  icon: <MinusIcon size={15} />,              desc: 'Horizontal line' },
  { type: 'spacer',  label: 'Spacer',   icon: <MoveVerticalIcon size={15} />,       desc: 'Empty vertical space' },
];

// ── Main Component ────────────────────────────────────────────────────────────

export function BlockEditor({ value, onChange, brandColor = '#22C55E', subject = '' }: Props) {
  const [blocks,      setBlocks]      = useState<Block[]>([]);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addAfter,    setAddAfter]    = useState<string | null>(null); // block id to insert after
  const [showAI,      setShowAI]      = useState(false);
  const [aiProduct,   setAiProduct]   = useState('');
  const [aiAudience,  setAiAudience]  = useState('');
  const [aiGoal,      setAiGoal]      = useState('');
  const [aiLoading,   setAiLoading]   = useState(false);
  const [aiError,     setAiError]     = useState('');
  const initialized = useRef(false);

  // Parse initial HTML into blocks (once)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const parsed = htmlToBlocks(value);
    if (parsed.length > 0) {
      setBlocks(parsed);
    } else {
      // Default starter content
      setBlocks([
        { id: uid(), type: 'heading', content: 'Hello {{firstName | fallback: \'there\'}}!', level: 2 },
        { id: uid(), type: 'text', content: 'Write your email content here. Keep it personal, valuable, and to the point.' },
        { id: uid(), type: 'button', text: 'Click here →', url: 'https://', color: brandColor, align: 'center' },
        { id: uid(), type: 'text', content: '– {{senderName}}' },
      ]);
    }
  }, []); // eslint-disable-line

  // Emit HTML whenever blocks change
  const emitChange = useCallback((nextBlocks: Block[]) => {
    onChange(blocksToHtml(nextBlocks));
  }, [onChange]);

  function updateBlocks(fn: (prev: Block[]) => Block[]) {
    setBlocks(prev => {
      const next = fn(prev);
      emitChange(next);
      return next;
    });
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    updateBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } as Block : b));
  }

  function deleteBlock(id: string) {
    updateBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function addBlock(type: BlockType, afterId: string | null) {
    const block = defaultBlock(type, brandColor);
    updateBlocks(prev => {
      if (!afterId) return [...prev, block];
      const idx = prev.findIndex(b => b.id === afterId);
      const next = [...prev];
      next.splice(idx + 1, 0, block);
      return next;
    });
    setSelectedId(block.id);
    setShowAddMenu(false);
    setAddAfter(null);
  }

  // dnd-kit
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      updateBlocks(prev => {
        const oldIdx = prev.findIndex(b => b.id === active.id);
        const newIdx = prev.findIndex(b => b.id === over.id);
        return arrayMove(prev, oldIdx, newIdx);
      });
    }
  }

  // AI generation
  async function handleGenerate() {
    if (!aiProduct.trim() || !aiAudience.trim() || !aiGoal.trim()) {
      setAiError('Fill in all three fields.');
      return;
    }
    setAiLoading(true);
    setAiError('');
    try {
      const res = await generateEmailBlocks({
        subject: subject || 'Email campaign',
        product: aiProduct,
        audience: aiAudience,
        goal: aiGoal,
      });
      if (!res.success) { setAiError(res.error); return; }
      const parsed = htmlToBlocks(res.data.htmlBody);
      if (parsed.length > 0) {
        updateBlocks(() => parsed);
        setShowAI(false);
        setSelectedId(null);
      } else {
        setAiError('Could not parse AI output. Try again.');
      }
    } catch {
      setAiError('Something went wrong. Try again.');
    } finally {
      setAiLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, position: 'relative' }}>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', background: C.card,
        borderBottom: `1px solid ${C.border}`, flexShrink: 0,
      }}>
        {/* Add block */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setAddAfter(null); setShowAddMenu(s => !s); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 7, border: `1px solid ${C.border}`,
              background: C.card, cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 600, color: C.text,
            }}
          >
            <PlusIcon size={13} /> Add block
          </button>
          {showAddMenu && !addAfter && (
            <AddBlockMenu
              onSelect={type => addBlock(type, null)}
              onClose={() => setShowAddMenu(false)}
            />
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Generate with AI */}
        <button
          onClick={() => setShowAI(s => !s)}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 12px', borderRadius: 7,
            border: `1px solid rgba(34,197,94,0.3)`,
            background: showAI ? 'rgba(34,197,94,0.08)' : C.card,
            cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 12, fontWeight: 600, color: C.selected,
          }}
        >
          <SparklesIcon size={13} /> Generate with AI
        </button>
      </div>

      {/* ── AI panel ─────────────────────────────────────────────────────── */}
      {showAI && (
        <div style={{
          background: C.card, borderBottom: `1px solid ${C.border}`,
          padding: '16px', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>Generate email with AI</p>
              <p style={{ fontSize: 12, color: C.hint, margin: '2px 0 0' }}>Replaces current content. Uses 5 AI credits.</p>
            </div>
            <button onClick={() => setShowAI(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.hint, padding: 4 }}>
              <XIcon size={14} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[
              { label: 'What you sell', val: aiProduct, set: setAiProduct, ph: 'e.g. real estate course' },
              { label: "Who it's for",  val: aiAudience, set: setAiAudience, ph: 'e.g. beginners' },
              { label: 'Goal',          val: aiGoal,    set: setAiGoal,    ph: 'e.g. join my course' },
            ].map(({ label, val, set, ph }) => (
              <div key={label}>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.sub, display: 'block', marginBottom: 4 }}>{label}</label>
                <input
                  value={val} onChange={e => set(e.target.value)}
                  placeholder={ph}
                  style={{
                    width: '100%', padding: '7px 10px', fontSize: 12,
                    border: `1px solid ${C.border}`, borderRadius: 6,
                    outline: 'none', fontFamily: 'inherit', color: C.text,
                    background: C.bg, boxSizing: 'border-box',
                  }}
                />
              </div>
            ))}
          </div>
          {aiError && <p style={{ fontSize: 12, color: C.red, margin: '0 0 8px' }}>{aiError}</p>}
          <button
            onClick={handleGenerate}
            disabled={aiLoading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 7, border: 'none',
              background: C.selected, color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: aiLoading ? 'wait' : 'pointer',
              opacity: aiLoading ? 0.7 : 1, fontFamily: 'inherit',
            }}
          >
            <SparklesIcon size={13} />
            {aiLoading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      )}

      {/* ── Block canvas ─────────────────────────────────────────────────── */}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}
        onClick={() => { setSelectedId(null); setShowAddMenu(false); }}
      >
        <div
          style={{ maxWidth: 560, margin: '0 auto' }}
          onClick={e => e.stopPropagation()}
        >
          {/* dnd-kit context */}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              {blocks.map(block => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  selected={selectedId === block.id}
                  brandColor={brandColor}
                  onSelect={() => setSelectedId(selectedId === block.id ? null : block.id)}
                  onUpdate={patch => updateBlock(block.id, patch)}
                  onDelete={() => deleteBlock(block.id)}
                  onAddAfter={() => {
                    setAddAfter(block.id);
                    setShowAddMenu(true);
                  }}
                  showAddMenu={showAddMenu && addAfter === block.id}
                  onAddMenuClose={() => { setShowAddMenu(false); setAddAfter(null); }}
                  onAddMenuSelect={type => addBlock(type, block.id)}
                />
              ))}
            </SortableContext>
          </DndContext>

          {/* Empty state */}
          {blocks.length === 0 && (
            <div
              onClick={() => { setAddAfter(null); setShowAddMenu(true); }}
              style={{
                border: `2px dashed ${C.border}`, borderRadius: 10,
                padding: '40px 20px', textAlign: 'center', cursor: 'pointer',
                color: C.hint, fontSize: 13,
              }}
            >
              <PlusIcon size={20} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
              Click to add your first block
            </div>
          )}

          {/* Add block at end */}
          {blocks.length > 0 && (
            <div style={{ position: 'relative', marginTop: 8 }}>
              <button
                onClick={() => { setAddAfter(null); setShowAddMenu(true); }}
                style={{
                  width: '100%', padding: '8px', borderRadius: 7,
                  border: `1px dashed ${C.border}`, background: 'transparent',
                  cursor: 'pointer', fontSize: 12, color: C.hint,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  fontFamily: 'inherit',
                }}
              >
                <PlusIcon size={12} /> Add block
              </button>
              {showAddMenu && addAfter === null && (
                <AddBlockMenu
                  onSelect={type => addBlock(type, null)}
                  onClose={() => setShowAddMenu(false)}
                  position="above"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── SortableBlock ─────────────────────────────────────────────────────────────

interface SortableBlockProps {
  block:           Block;
  selected:        boolean;
  brandColor:      string;
  onSelect:        () => void;
  onUpdate:        (patch: Partial<Block>) => void;
  onDelete:        () => void;
  onAddAfter:      () => void;
  showAddMenu:     boolean;
  onAddMenuClose:  () => void;
  onAddMenuSelect: (type: BlockType) => void;
}

function SortableBlock({
  block, selected, brandColor,
  onSelect, onUpdate, onDelete,
  onAddAfter, showAddMenu, onAddMenuClose, onAddMenuSelect,
}: SortableBlockProps) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    marginBottom: 6,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Block wrapper */}
      <div
        onClick={onSelect}
        style={{
          position: 'relative',
          borderRadius: 8,
          border: selected ? `2px solid ${C.selected}` : `1px solid transparent`,
          background: selected ? C.selBg : 'transparent',
          padding: '2px 4px 2px 28px',
          cursor: 'pointer',
          transition: 'border-color 0.12s, background 0.12s',
        }}
        onMouseEnter={e => {
          if (!selected) (e.currentTarget as HTMLElement).style.borderColor = C.border;
        }}
        onMouseLeave={e => {
          if (!selected) (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
        }}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          style={{
            position: 'absolute', left: 4, top: '50%',
            transform: 'translateY(-50%)',
            cursor: 'grab', color: C.hint, padding: '4px 2px',
            opacity: selected ? 1 : 0,
            transition: 'opacity 0.12s',
          }}
          onClick={e => e.stopPropagation()}
        >
          <GripVerticalIcon size={13} />
        </div>

        {/* Block preview (non-edit view) */}
        {!selected && <BlockPreview block={block} />}

        {/* Block editor (selected) */}
        {selected && (
          <div onClick={e => e.stopPropagation()}>
            <BlockEdit
              block={block}
              brandColor={brandColor}
              onUpdate={onUpdate}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 6, marginTop: 6, borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
              <button
                onClick={onDelete}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 5, border: `1px solid ${C.border}`, background: 'none', cursor: 'pointer', fontSize: 11, color: C.red, fontFamily: 'inherit' }}
              >
                <TrashIcon size={11} /> Delete
              </button>
              <div style={{ flex: 1 }} />
              <button
                onClick={onAddAfter}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 5, border: `1px solid ${C.border}`, background: 'none', cursor: 'pointer', fontSize: 11, color: C.sub, fontFamily: 'inherit' }}
              >
                <PlusIcon size={11} /> Add below
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add menu (inline below this block) */}
      {showAddMenu && (
        <div style={{ position: 'relative', zIndex: 50 }}>
          <AddBlockMenu
            onSelect={onAddMenuSelect}
            onClose={onAddMenuClose}
            position="below"
          />
        </div>
      )}
    </div>
  );
}

// ── BlockPreview ──────────────────────────────────────────────────────────────

function BlockPreview({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading':
      return (
        <div style={{
          fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
          fontSize: block.level === 1 ? 22 : block.level === 2 ? 18 : 15,
          fontWeight: 700, color: C.text, padding: '6px 0',
          lineHeight: 1.2,
        }}>
          {block.content || <span style={{ color: C.hint }}>Heading…</span>}
        </div>
      );

    case 'text':
      return (
        <div style={{
          fontSize: 14, color: C.sub, padding: '6px 0',
          lineHeight: 1.6,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}
          dangerouslySetInnerHTML={{ __html: block.content || '<span style="color:#9AA3AF">Paragraph text…</span>' }}
        />
      );

    case 'button':
      return (
        <div style={{ textAlign: block.align, padding: '8px 0' }}>
          <span style={{
            display: 'inline-block',
            background: block.color, color: '#fff',
            padding: '8px 20px', borderRadius: 7,
            fontSize: 13, fontWeight: 600,
          }}>
            {block.text || 'Button'}
          </span>
        </div>
      );

    case 'image':
      return (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          {block.src ? (
            <img src={block.src} alt={block.alt} style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 6, objectFit: 'cover' }} />
          ) : (
            <div style={{ height: 64, border: `1px dashed ${C.border}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.hint, fontSize: 12 }}>
              <ImageIcon size={16} style={{ marginRight: 6 }} /> Image URL not set
            </div>
          )}
        </div>
      );

    case 'divider':
      return <hr style={{ border: 'none', borderTop: `1px solid ${C.border}`, margin: '10px 0' }} />;

    case 'spacer':
      return (
        <div style={{
          height: Math.min(block.height, 40),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: C.hint,
        }}>
          <MoveVerticalIcon size={12} style={{ marginRight: 4 }} /> {block.height}px spacer
        </div>
      );
  }
}

// ── BlockEdit ─────────────────────────────────────────────────────────────────

function BlockEdit({ block, brandColor, onUpdate }: { block: Block; brandColor: string; onUpdate: (p: Partial<Block>) => void }) {
  switch (block.type) {
    case 'heading':
      return (
        <div style={{ paddingTop: 4 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {([1, 2, 3] as const).map(l => (
              <button key={l} onClick={() => onUpdate({ level: l })}
                style={{ padding: '3px 8px', borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', background: block.level === l ? C.selected : 'none', color: block.level === l ? '#fff' : C.sub }}>
                H{l}
              </button>
            ))}
          </div>
          <input
            autoFocus value={block.content}
            onChange={e => onUpdate({ content: e.target.value })}
            style={inputStyle}
            placeholder="Heading text…"
          />
        </div>
      );

    case 'text':
      return (
        <textarea
          autoFocus value={stripTags(block.content)}
          onChange={e => onUpdate({ content: e.target.value })}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', height: 'auto', lineHeight: 1.6 }}
          placeholder="Paragraph text…"
        />
      );

    case 'button':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
          <input value={block.text} onChange={e => onUpdate({ text: e.target.value })} style={inputStyle} placeholder="Button label" />
          <input value={block.url} onChange={e => onUpdate({ url: e.target.value })} style={inputStyle} placeholder="https://..." />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 11, color: C.sub }}>Color</label>
              <input type="color" value={block.color} onChange={e => onUpdate({ color: e.target.value })}
                style={{ width: 32, height: 28, border: `1px solid ${C.border}`, borderRadius: 5, cursor: 'pointer', padding: 2 }} />
              <button onClick={() => onUpdate({ color: brandColor })}
                style={{ fontSize: 11, color: C.selected, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Reset
              </button>
            </div>
            <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
              {(['left', 'center', 'right'] as const).map(a => (
                <button key={a} onClick={() => onUpdate({ align: a })}
                  style={{ padding: '3px 7px', borderRadius: 4, border: `1px solid ${C.border}`, fontSize: 10, fontFamily: 'inherit', cursor: 'pointer', background: block.align === a ? C.selected : 'none', color: block.align === a ? '#fff' : C.sub }}>
                  {a[0].toUpperCase()}{a.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      );

    case 'image':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
          <input value={block.src} onChange={e => onUpdate({ src: e.target.value })} style={inputStyle} placeholder="Image URL (https://...)" />
          <input value={block.alt} onChange={e => onUpdate({ alt: e.target.value })} style={inputStyle} placeholder="Alt text (for accessibility)" />
        </div>
      );

    case 'divider':
      return <p style={{ fontSize: 12, color: C.hint, padding: '4px 0', margin: 0 }}>Horizontal divider line — no settings.</p>;

    case 'spacer':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
          <label style={{ fontSize: 12, color: C.sub }}>Height: {block.height}px</label>
          <input type="range" min={8} max={120} step={4} value={block.height}
            onChange={e => onUpdate({ height: parseInt(e.target.value) })}
            style={{ flex: 1 }} />
        </div>
      );
  }
}

// ── AddBlockMenu ──────────────────────────────────────────────────────────────

function AddBlockMenu({
  onSelect, onClose, position = 'below',
}: {
  onSelect: (type: BlockType) => void;
  onClose: () => void;
  position?: 'above' | 'below';
}) {
  const top = position === 'above' ? 'auto' : '100%';
  const bottom = position === 'above' ? '100%' : 'auto';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-add-menu]')) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      data-add-menu="true"
      style={{
        position: 'absolute', [position === 'above' ? 'bottom' : 'top']: '100%',
        left: 0, zIndex: 100, marginTop: 4, marginBottom: 4,
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        padding: 6, minWidth: 220,
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, color: C.hint, textTransform: 'uppercase', letterSpacing: '0.07em', padding: '4px 8px 6px', margin: 0 }}>Add block</p>
      {BLOCK_MENU.map(({ type, label, icon, desc }) => (
        <button
          key={type}
          onMouseDown={e => { e.preventDefault(); onSelect(type); }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '7px 10px', borderRadius: 7, border: 'none',
            background: 'none', cursor: 'pointer', fontFamily: 'inherit',
            textAlign: 'left',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = C.bg)}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
        >
          <span style={{ color: C.sub }}>{icon}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{label}</p>
            <p style={{ fontSize: 11, color: C.hint, margin: 0 }}>{desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: `1px solid ${C.border}`, borderRadius: 6,
  outline: 'none', fontFamily: 'inherit', color: C.text,
  background: C.card, boxSizing: 'border-box',
};

function stripTags(html: string): string {
  try {
    return html.replace(/<[^>]+>/g, '');
  } catch {
    return html;
  }
}
