'use client';

/**
 * app/dashboard/settings/branding-settings.tsx
 *
 * Workspace branding: logo upload (drag-and-drop) + brand color picker.
 * Logo is uploaded to /api/upload/logo, converted to a base64 data URL,
 * and stored in the DB — no external CDN required.
 */

import { useState, useRef, useCallback } from 'react';
import { saveBranding, resetBrandColor } from '@/lib/branding/actions';
import { UploadCloudIcon, XCircleIcon, ImageIcon } from 'lucide-react';

interface BrandingSettingsProps {
  isAdmin: boolean;
  initial: {
    logoUrl: string | null;
    brandColor: string;
  };
}

const DEFAULT_BRAND_COLOR = '#22C55E';

const COLOR_PRESETS = [
  '#22C55E',
  '#6366F1',
  '#F59E0B',
  '#EF4444',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#0F172A',
];

const LOGO_RECOMMENDATIONS = [
  { label: 'Recommended', value: '200 × 60 px', note: 'ideal for email headers' },
  { label: 'Square logos', value: '200 × 200 px', note: 'auto-cropped to fit' },
  { label: 'Max size',     value: '512 KB',       note: 'PNG, JPG, WebP, or SVG' },
];

export function BrandingSettings({ isAdmin, initial }: BrandingSettingsProps) {
  const [logoUrl, setLogoUrl]         = useState(initial.logoUrl ?? '');
  const [brandColor, setBrandColor]   = useState(initial.brandColor ?? DEFAULT_BRAND_COLOR);
  const [isLoading, setIsLoading]     = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging]   = useState(false);
  const [success, setSuccess]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(brandColor);

  // ── Logo upload ──────────────────────────────────────────────────────────

  async function uploadFile(file: File) {
    setUploadError(null);
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append('logo', file);

      const res = await fetch('/api/upload/logo', { method: 'POST', body: form });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setUploadError(data.error ?? 'Upload failed.');
        return;
      }

      setLogoUrl(data.logoUrl);
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = ''; // reset so same file can be re-selected
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isAdmin || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }, [isAdmin, isUploading]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (isAdmin && !isUploading) setIsDragging(true);
  }

  function handleDragLeave() { setIsDragging(false); }

  function handleRemoveLogo() {
    setLogoUrl('');
    setUploadError(null);
  }

  // ── Save branding (color only — logo saved on upload) ───────────────────

  async function handleSave() {
    if (!isValidHex) {
      setError('Brand color must be a valid 6-digit hex code (e.g. #22C55E).');
      return;
    }
    setError(null);
    setSuccess(false);
    setIsLoading(true);
    try {
      const result = await saveBranding({
        logoUrl: logoUrl.trim() || null,
        brandColor,
      });
      if (!result.success) {
        setError(result.error ?? 'Failed to save branding.');
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetColor() {
    setBrandColor(DEFAULT_BRAND_COLOR);
    await resetBrandColor();
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Logo upload ─────────────────────────────────────────────────── */}
      <div>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Logo
        </label>

        {/* Size recommendations */}
        <div
          className="mb-3 flex flex-wrap gap-3 rounded-lg px-3.5 py-2.5"
          style={{ background: 'var(--surface-app)', border: '1px solid var(--sidebar-border)' }}
        >
          {LOGO_RECOMMENDATIONS.map((r) => (
            <div key={r.label} className="flex items-center gap-1.5 text-xs">
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{r.label}:</span>
              <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{r.value}</span>
              <span style={{ color: 'var(--text-tertiary)' }}>— {r.note}</span>
            </div>
          ))}
        </div>

        {/* Drop zone */}
        {logoUrl ? (
          /* Preview with remove button */
          <div
            className="relative flex items-center gap-4 rounded-xl p-4"
            style={{ border: '1.5px solid var(--sidebar-border)', background: 'var(--surface-app)' }}
          >
            <div
              className="flex h-16 w-32 flex-shrink-0 items-center justify-center rounded-lg overflow-hidden"
              style={{ background: 'var(--surface-card)', border: '1px solid var(--sidebar-border)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Logo preview"
                className="max-h-full max-w-full object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Logo uploaded</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                Used in email footers and templates.
              </p>
              {isAdmin && (
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-medium underline"
                    style={{ color: 'var(--brand)' }}
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-xs font-medium underline"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Drop zone */
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => isAdmin && !isUploading && fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-xl px-6 py-8 text-center transition-all"
            style={{
              border: `2px dashed ${isDragging ? 'var(--brand)' : 'var(--sidebar-border)'}`,
              background: isDragging ? 'var(--brand-tint)' : 'var(--surface-app)',
              cursor: isAdmin && !isUploading ? 'pointer' : 'default',
            }}
          >
            {isUploading ? (
              <>
                <div
                  className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
                  style={{ borderColor: 'var(--brand)', borderTopColor: 'transparent' }}
                />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Uploading…</p>
              </>
            ) : (
              <>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ background: 'var(--brand-tint)' }}
                >
                  <UploadCloudIcon className="h-5 w-5" style={{ color: 'var(--brand)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {isDragging ? 'Drop to upload' : 'Drag & drop your logo here'}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    or <span className="underline" style={{ color: 'var(--brand)' }}>click to browse</span>
                  </p>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  PNG, JPG, WebP, SVG · Max 512 KB
                </p>
              </>
            )}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleFileChange}
          disabled={!isAdmin || isUploading}
        />

        {uploadError && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
            <XCircleIcon className="h-3.5 w-3.5" />
            {uploadError}
          </p>
        )}
      </div>

      {/* ── Brand color ───────────────────────────────────────────────────── */}
      <div>
        <label className="mb-1 block text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Brand color
        </label>

        <div className="mb-3 flex flex-wrap gap-2">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              disabled={!isAdmin || isLoading}
              onClick={() => setBrandColor(color)}
              title={color}
              className="h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: color,
                borderColor: brandColor === color ? 'var(--text-primary)' : 'transparent',
                outline: brandColor === color ? '2px solid var(--surface-card)' : 'none',
                outlineOffset: '1px',
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <input
            type="color"
            disabled={!isAdmin || isLoading}
            value={isValidHex ? brandColor : DEFAULT_BRAND_COLOR}
            onChange={(e) => setBrandColor(e.target.value)}
            className="h-10 w-10 cursor-pointer rounded-md border p-0.5 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: 'var(--sidebar-border)' }}
            title="Pick a custom color"
          />
          <input
            type="text"
            disabled={!isAdmin || isLoading}
            value={brandColor}
            onChange={(e) => setBrandColor(e.target.value)}
            maxLength={7}
            placeholder="#22C55E"
            className="flex h-10 w-36 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              borderColor: !isValidHex && brandColor.length > 0 ? '#EF4444' : 'var(--sidebar-border)',
            }}
          />
          <div
            className="flex h-10 items-center justify-center rounded-lg px-4 text-xs font-semibold text-white shadow-sm"
            style={{ backgroundColor: isValidHex ? brandColor : DEFAULT_BRAND_COLOR }}
          >
            CTA button
          </div>
          {brandColor !== DEFAULT_BRAND_COLOR && (
            <button
              type="button"
              disabled={!isAdmin || isLoading}
              onClick={handleResetColor}
              className="text-xs underline disabled:cursor-not-allowed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Reset
            </button>
          )}
        </div>

        {!isValidHex && brandColor.length > 0 && (
          <p className="mt-1 text-xs text-red-500">Must be a 6-digit hex code like #22C55E</p>
        )}
        <p className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Applied to CTA buttons in your email templates.
        </p>
      </div>

      {/* ── Feedback ──────────────────────────────────────────────────────── */}
      {error   && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-green-600">Branding saved.</p>}

      {isAdmin && (
        <button
          type="button"
          disabled={isLoading || !isValidHex}
          onClick={handleSave}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'var(--accent)' }}
        >
          {isLoading ? 'Saving…' : 'Save branding'}
        </button>
      )}
    </div>
  );
}
