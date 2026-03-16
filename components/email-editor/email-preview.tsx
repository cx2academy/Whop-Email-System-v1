'use client';

/**
 * components/email-editor/email-preview.tsx
 *
 * Premium inbox-style email preview.
 * - Dark chrome matches the RevTray dark theme
 * - iframe sizes to content via ResizeObserver, eliminating dead space
 * - Sticky panel fills full available height
 * - Desktop / Mobile toggle + fullscreen
 */

import { useState, useRef, useEffect } from 'react';
import { MonitorIcon, SmartphoneIcon, XIcon, MaximizeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  subject:   string;
  fromName:  string;
  fromEmail: string;
  htmlBody:  string;
}

type Device = 'desktop' | 'mobile';

function buildDoc(htmlBody: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{padding:24px 16px 32px;background:#0f1929;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
  .card{background:#fff;max-width:580px;margin:0 auto;border-radius:10px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.35);}
  .body{padding:28px 32px 32px;color:#111827;font-size:15px;line-height:1.65;}
  .body h1,.body h2{color:#111827;line-height:1.25;margin:0 0 14px;}
  .body h2{font-size:22px;font-weight:700;}
  .body a{color:#2563eb;}
  .body p{margin:0 0 14px;}
  .body ul,.body ol{padding-left:20px;margin:0 0 14px;}
  .body li{margin-bottom:4px;}
  .footer{border-top:1px solid #e5e7eb;padding:14px 32px;text-align:center;font-size:12px;color:#9ca3af;}
</style>
</head>
<body>
  <div class="card">
    <div class="body">${htmlBody || '<p style="color:#9ca3af;text-align:center;padding:40px 0">Your email content will appear here…</p>'}</div>
    <div class="footer">You're receiving this because you're a member. <a href="#" style="color:#9ca3af">Unsubscribe</a></div>
  </div>
  <script>
    // Notify parent of document height so iframe can resize
    function reportHeight() {
      const h = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: 'rt-iframe-height', height: h }, '*');
    }
    reportHeight();
    new MutationObserver(reportHeight).observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener('resize', reportHeight);
  </script>
</body></html>`;
}

interface InboxChromeProps {
  subject: string;
  fromName: string;
  fromEmail: string;
  timestamp?: string;
}

function InboxChrome({ subject, fromName, fromEmail, timestamp }: InboxChromeProps) {
  return (
    <div style={{ background: '#141D2E', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      {/* Subject */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-sm font-semibold text-white truncate">{subject || 'No subject'}</p>
      </div>
      {/* From / To / Time */}
      <div className="px-4 py-2.5 space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-[11px] text-zinc-600 w-7 shrink-0">From</span>
            <span className="text-xs text-zinc-300 truncate">{fromName || 'Sender'} &lt;{fromEmail || 'sender@example.com'}&gt;</span>
          </div>
          <span className="text-[11px] text-zinc-600 shrink-0 ml-3">{timestamp || 'Just now'}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[11px] text-zinc-600 w-7 shrink-0">To</span>
          <span className="text-xs text-zinc-500">subscriber@example.com</span>
        </div>
      </div>
    </div>
  );
}

export function EmailPreview({ subject, fromName, fromEmail, htmlBody }: Props) {
  const [device, setDevice]       = useState<Device>('desktop');
  const [fullscreen, setFullscreen] = useState(false);
  const [iframeHeight, setIframeHeight] = useState(500);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Listen for height messages from iframe
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'rt-iframe-height' && typeof e.data.height === 'number') {
        setIframeHeight(Math.max(e.data.height, 400));
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Reset height when content changes
  useEffect(() => { setIframeHeight(500); }, [htmlBody]);

  const srcDoc = buildDoc(htmlBody);
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Preview header */}
        <div className="flex items-center justify-between mb-2 px-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600">Preview</p>
          <div className="flex items-center gap-1">
            {/* Device toggle */}
            <div className="flex items-center overflow-hidden rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <button onClick={() => setDevice('desktop')}
                className={cn('flex items-center px-2 py-1.5 text-xs transition-all', device === 'desktop' ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-300')}
                title="Desktop">
                <MonitorIcon className="h-3 w-3" />
              </button>
              <button onClick={() => setDevice('mobile')}
                className={cn('flex items-center px-2 py-1.5 text-xs transition-all', device === 'mobile' ? 'bg-white/10 text-white' : 'text-zinc-600 hover:text-zinc-300')}
                title="Mobile">
                <SmartphoneIcon className="h-3 w-3" />
              </button>
            </div>
            <button onClick={() => setFullscreen(true)}
              className="flex items-center justify-center rounded-lg px-2 py-1.5 text-zinc-600 hover:text-zinc-300 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              title="Full screen">
              <MaximizeIcon className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Preview panel — dark bg, scrollable, fills remaining space */}
        <div
          className="flex-1 overflow-auto rounded-xl"
          style={{ background: '#0A0F1A', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div
            className="mx-auto transition-all duration-300"
            style={{ width: device === 'mobile' ? '375px' : '100%', maxWidth: '100%' }}
          >
            <InboxChrome subject={subject} fromName={fromName} fromEmail={fromEmail} timestamp={now} />
            <iframe
              ref={iframeRef}
              srcDoc={srcDoc}
              className="w-full block"
              style={{ height: iframeHeight, background: '#0f1929', border: 'none' }}
              title="Email preview"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        </div>
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto pt-14 pb-8 px-6"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Email Preview</span>
                <span className="rounded-full px-2 py-0.5 text-[11px] text-zinc-400"
                  style={{ background: 'rgba(255,255,255,0.07)' }}>
                  {device === 'mobile' ? 'Mobile · 375px' : 'Desktop · 600px'}
                </span>
              </div>
              <button onClick={() => setFullscreen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl shadow-2xl"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <InboxChrome subject={subject} fromName={fromName} fromEmail={fromEmail} timestamp={now} />
              <iframe
                srcDoc={srcDoc}
                className="w-full block"
                style={{ height: Math.max(iframeHeight, 540), background: '#0f1929', border: 'none' }}
                title="Email preview fullscreen"
                sandbox="allow-same-origin allow-scripts"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
