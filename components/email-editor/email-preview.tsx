'use client';

/**
 * components/email-editor/email-preview.tsx
 * Lightweight preview — inbox chrome + device toggle + fullscreen.
 */

import { useState } from 'react';
import { MonitorIcon, SmartphoneIcon, XIcon, MaximizeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  subject: string;
  fromName: string;
  fromEmail: string;
  htmlBody: string;
}

type Device = 'desktop' | 'mobile';

function buildDoc(htmlBody: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{margin:0;padding:20px 12px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
  .card{background:#fff;max-width:580px;margin:0 auto;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.10);}
  .body{padding:28px 32px 32px;color:#111827;font-size:15px;line-height:1.65;}
  .body h1,.body h2{color:#111827;line-height:1.3;}
  .body a{color:#2563eb;}
  .body p{margin:0 0 12px;}
  .body ul,.body ol{padding-left:20px;margin:0 0 12px;}
  .footer{border-top:1px solid #e5e7eb;padding:14px 32px;text-align:center;font-size:12px;color:#9ca3af;}
</style></head>
<body><div class="card">
  <div class="body">${htmlBody || '<p style="color:#9ca3af">Your email content will appear here…</p>'}</div>
  <div class="footer">You're receiving this because you're a member. <a href="#" style="color:#9ca3af">Unsubscribe</a></div>
</div></body></html>`;
}

export function EmailPreview({ subject, fromName, fromEmail, htmlBody }: Props) {
  const [device, setDevice]   = useState<Device>('desktop');
  const [fullscreen, setFullscreen] = useState(false);

  const InboxChrome = () => (
    <div className="rounded-t-lg border border-b-0 border-border bg-gray-50 text-xs text-gray-500">
      <div className="border-b border-gray-200 px-4 py-2.5">
        <span className="font-semibold text-gray-900 truncate">{subject || 'No subject'}</span>
      </div>
      <div className="space-y-0.5 px-4 py-2">
        <div className="flex gap-2"><span className="text-gray-400 w-6">From</span><span className="text-gray-700 truncate">{fromName || 'Sender'} &lt;{fromEmail}&gt;</span></div>
        <div className="flex gap-2"><span className="text-gray-400 w-6">To</span><span>subscriber@example.com</span></div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex h-full flex-col gap-2">
        {/* Controls row — very quiet */}
        <div className="flex items-center justify-end gap-1">
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <button onClick={() => setDevice('desktop')}
              className={cn('px-2 py-1 transition-colors', device === 'desktop' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-accent')}
              title="Desktop">
              <MonitorIcon className="h-3 w-3" />
            </button>
            <button onClick={() => setDevice('mobile')}
              className={cn('px-2 py-1 transition-colors', device === 'mobile' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-accent')}
              title="Mobile">
              <SmartphoneIcon className="h-3 w-3" />
            </button>
          </div>
          <button onClick={() => setFullscreen(true)}
            className="rounded-md border border-border px-1.5 py-1 text-muted-foreground hover:bg-accent transition-colors"
            title="Fullscreen">
            <MaximizeIcon className="h-3 w-3" />
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto rounded-lg bg-gray-100"
          style={{ transition: 'all 0.25s' }}>
          <div className="mx-auto transition-all duration-300"
            style={{ width: device === 'mobile' ? 375 : '100%', maxWidth: '100%' }}>
            <InboxChrome />
            <div className="rounded-b-lg border border-t-0 border-border overflow-hidden">
              <iframe srcDoc={buildDoc(htmlBody)} className="w-full"
                style={{ minHeight: 460, background: '#f3f4f6' }}
                title="Email preview" sandbox="allow-same-origin" />
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/70 p-8 pt-14">
          <div className="w-full max-w-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-white">Preview — {device === 'mobile' ? 'Mobile (375px)' : 'Desktop'}</span>
              <button onClick={() => setFullscreen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl shadow-2xl">
              <InboxChrome />
              <iframe srcDoc={buildDoc(htmlBody)} className="w-full"
                style={{ minHeight: 540, background: '#f3f4f6' }}
                title="Email preview" sandbox="allow-same-origin" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
