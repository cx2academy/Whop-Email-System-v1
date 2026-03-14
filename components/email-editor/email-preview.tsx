'use client';

/**
 * components/email-editor/email-preview.tsx
 *
 * Mock inbox preview panel.
 * Shows the email exactly as subscribers will see it,
 * wrapped in an email-client-style chrome.
 */

import { useState } from 'react';
import {
  MonitorIcon, SmartphoneIcon, SunIcon, MoonIcon, MaximizeIcon, XIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  subject: string;
  fromName: string;
  fromEmail: string;
  htmlBody: string;
}

type Device = 'desktop' | 'mobile';
type Theme  = 'light'   | 'dark';

// Wrap raw HTML body in a full email-safe document
function buildEmailHtml(htmlBody: string, theme: Theme): string {
  const bg    = theme === 'dark' ? '#1a1a2e' : '#f3f4f6';
  const card  = theme === 'dark' ? '#16213e' : '#ffffff';
  const text  = theme === 'dark' ? '#e2e8f0' : '#111827';
  const muted = theme === 'dark' ? '#94a3b8' : '#6b7280';
  const border= theme === 'dark' ? '#2d3748' : '#e5e7eb';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body { margin: 0; padding: 24px 16px; background: ${bg}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .email-card { background: ${card}; max-width: 600px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
  .email-body { padding: 28px 32px 32px; color: ${text}; font-size: 15px; line-height: 1.6; }
  .email-body h1, .email-body h2, .email-body h3 { color: ${text}; line-height: 1.3; }
  .email-body a { color: #2563eb; }
  .email-body p { margin: 0 0 12px; }
  .email-body ul, .email-body ol { padding-left: 20px; margin: 0 0 12px; }
  .email-footer { border-top: 1px solid ${border}; padding: 16px 32px; text-align: center; font-size: 12px; color: ${muted}; }
</style>
</head>
<body>
<div class="email-card">
  <div class="email-body">${htmlBody || '<p style="color:#9ca3af">Your email content will appear here…</p>'}</div>
  <div class="email-footer">You're receiving this because you're a member. <a href="#" style="color:#6b7280">Unsubscribe</a></div>
</div>
</body>
</html>`;
}

export function EmailPreview({ subject, fromName, fromEmail, htmlBody }: Props) {
  const [device, setDevice]       = useState<Device>('desktop');
  const [theme, setTheme]         = useState<Theme>('light');
  const [fullscreen, setFullscreen] = useState(false);

  const previewWidth = device === 'mobile' ? 375 : '100%';

  const PreviewFrame = ({ width }: { width?: number | string }) => (
    <iframe
      srcDoc={buildEmailHtml(htmlBody, theme)}
      className="w-full rounded-lg border border-border"
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        minHeight: 500,
        maxWidth: '100%',
        background: theme === 'dark' ? '#1a1a2e' : '#f3f4f6',
        transition: 'width 0.25s ease',
      }}
      title="Email preview"
      sandbox="allow-same-origin"
    />
  );

  const InboxChrome = () => (
    <div className={cn(
      'rounded-t-lg border border-b-0 border-border text-xs',
      theme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-gray-50 text-gray-600'
    )}>
      <div className={cn('border-b px-4 py-2.5', theme === 'dark' ? 'border-zinc-700' : 'border-gray-200')}>
        <div className="flex items-baseline gap-2">
          <span className="font-semibold" style={{ color: theme === 'dark' ? '#e2e8f0' : '#111827' }}>
            {subject || 'No subject'}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 px-4 py-2">
        <div className="flex items-center gap-1">
          <span className="w-8 text-right opacity-60">From</span>
          <span className="ml-1 font-medium" style={{ color: theme === 'dark' ? '#e2e8f0' : '#374151' }}>
            {fromName || 'Sender'} &lt;{fromEmail || 'sender@example.com'}&gt;
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-8 text-right opacity-60">To</span>
          <span className="ml-1">subscriber@example.com</span>
        </div>
      </div>
    </div>
  );

  const controls = (
    <div className="flex items-center gap-1">
      {/* Device toggle */}
      <div className="flex items-center rounded-md border border-border overflow-hidden">
        <button
          onClick={() => setDevice('desktop')}
          className={cn('flex items-center gap-1 px-2 py-1 text-xs transition-colors', device === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}
          title="Desktop preview"
        >
          <MonitorIcon className="h-3 w-3" />
        </button>
        <button
          onClick={() => setDevice('mobile')}
          className={cn('flex items-center gap-1 px-2 py-1 text-xs transition-colors', device === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent')}
          title="Mobile preview"
        >
          <SmartphoneIcon className="h-3 w-3" />
        </button>
      </div>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme((t) => t === 'light' ? 'dark' : 'light')}
        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
        title="Toggle dark mode preview"
      >
        {theme === 'light' ? <MoonIcon className="h-3 w-3" /> : <SunIcon className="h-3 w-3" />}
      </button>

      {/* Fullscreen */}
      <button
        onClick={() => setFullscreen(true)}
        className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors"
        title="Full screen preview"
      >
        <MaximizeIcon className="h-3 w-3" />
      </button>
    </div>
  );

  return (
    <>
      <div className="flex h-full flex-col gap-2">
        {/* Header bar */}
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
          {controls}
        </div>

        {/* Inbox chrome + preview */}
        <div className={cn(
          'flex-1 overflow-auto rounded-lg',
          theme === 'dark' ? 'bg-zinc-900' : 'bg-gray-100'
        )}>
          <div
            className="mx-auto transition-all duration-300 ease-in-out"
            style={{ width: previewWidth, maxWidth: '100%' }}
          >
            <InboxChrome />
            <div className={cn(
              'rounded-b-lg border border-t-0 border-border overflow-hidden',
              theme === 'dark' ? 'bg-zinc-800' : 'bg-gray-50'
            )}>
              <iframe
                srcDoc={buildEmailHtml(htmlBody, theme)}
                className="w-full"
                style={{ minHeight: 480, background: theme === 'dark' ? '#1a1a2e' : '#f3f4f6' }}
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/70 p-8 pt-16">
          <div className="w-full max-w-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">Full screen preview</p>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                  {device === 'mobile' ? '375px' : '600px'}
                </span>
              </div>
              <button
                onClick={() => setFullscreen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl shadow-2xl">
              <InboxChrome />
              <PreviewFrame width={device === 'mobile' ? 375 : '100%'} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
