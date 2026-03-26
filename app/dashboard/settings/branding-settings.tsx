'use client';

/**
 * app/dashboard/settings/branding-settings.tsx
 *
 * Exposes workspace branding fields (logo URL + brand color) that were
 * previously stored in the DB but had no UI. These values are used in:
 *   - Email template CTA buttons (brandColor)
 *   - Email footer / sidebar logo (logoUrl)
 *
 * WHY THIS WAS MISSING: lib/branding/actions.ts and the DB schema both had
 * full support for logoUrl and brandColor, but no settings tab exposed them.
 * Users had no way to set their brand identity.
 */

import { useState } from 'react';
import { saveBranding, resetBrandColor } from '@/lib/branding/actions';

interface BrandingSettingsProps {
  isAdmin: boolean;
  initial: {
    logoUrl: string | null;
    brandColor: string;
  };
}

const DEFAULT_BRAND_COLOR = '#22C55E';

// Preset palette — quick picks for common brand colors
const COLOR_PRESETS = [
  '#22C55E', // RevTray green (default)
  '#6366F1', // Indigo
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#0F172A', // Slate-900 (dark)
];

export function BrandingSettings({ isAdmin, initial }: BrandingSettingsProps) {
  const [logoUrl, setLogoUrl]       = useState(initial.logoUrl ?? '');
  const [brandColor, setBrandColor] = useState(initial.brandColor ?? DEFAULT_BRAND_COLOR);
  const [isLoading, setIsLoading]   = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Validate hex before submitting
  const isValidHex = /^#[0-9a-fA-F]{6}$/.test(brandColor);

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

  return (
    <div className="space-y-6">

      {/* ── Logo URL ──────────────────────────────────────────────────── */}
      <div>
        <label
          htmlFor="logoUrl"
          className="mb-1 block text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          Logo URL
        </label>
        <div className="flex items-center gap-3">
          {/* Live preview */}
          {logoUrl && (
            <div
              className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden border"
              style={{ borderColor: 'var(--sidebar-border)' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="Logo preview"
                className="h-full w-full object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          <input
            id="logoUrl"
            type="url"
            disabled={!isAdmin || isLoading}
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://yourbrand.com/logo.png"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            style={{ borderColor: 'var(--sidebar-border)' }}
          />
        </div>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Used in email footers. Host the image publicly (Cloudinary, S3, etc.).
        </p>
      </div>

      {/* ── Brand color ───────────────────────────────────────────────── */}
      <div>
        <label
          htmlFor="brandColor"
          className="mb-1 block text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          Brand color
        </label>

        {/* Preset swatches */}
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

        {/* Manual hex + native color picker */}
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
            id="brandColor"
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

          {/* Live button preview */}
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
          <p className="mt-1 text-xs text-red-500">
            Must be a 6-digit hex code like #22C55E
          </p>
        )}
        <p className="mt-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Applied to CTA buttons in your email templates.
        </p>
      </div>

      {/* ── Feedback ──────────────────────────────────────────────────── */}
      {error && <p className="text-sm text-red-500">{error}</p>}
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
