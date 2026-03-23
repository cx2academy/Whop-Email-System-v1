'use client';

/**
 * components/email-editor/visual-editor.tsx
 *
 * Re-exports BlockEditor as VisualEditor to maintain backwards
 * compatibility with all existing imports in campaign-builder.tsx.
 *
 * The old contentEditable-based editor has been replaced with a
 * drag-and-drop block editor. Same interface:
 *   value: string (HTML)
 *   onChange: (html: string) => void
 */

export { BlockEditor as VisualEditor } from './block-editor';
