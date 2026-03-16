'use client';

/**
 * components/email-editor/email-preview.tsx
 *
 * Realistic inbox preview — fills full panel height, no dead space.
 * Dark inbox chrome wraps white email card.
 * iframe auto-sizes to content via postMessage.
 */

import { useState, useEffect } from 'react';
import { MonitorIcon, SmartphoneIcon, XIcon } from 'lucide-react';

interface Props {
  subject:        string;
  fromName:       string;
  fromEmail:      string;
  htmlBody:       string;
  device?:        'desktop' | 'mobile';
  onDeviceChange?: (d: 'desktop' | 'mobile') => void;
}

function buildDoc(html: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#0B1221}
  body{padding:0}
  .card{background:#fff;max-width:100%;overflow:hidden}
  .body{padding:28px 32px 32px;color:#111827;font-size:15px;line-height:1.7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
  .body h1,.body h2{color:#111827;line-height:1.25;margin:0 0 14px}
  .body h2{font-size:22px;font-weight:700}
  .body a{color:#2563eb}
  .body p{margin:0 0 14px}
  .body ul,.body ol{padding-left:20px;margin:0 0 14px}
  .footer{border-top:1px solid #f3f4f6;padding:12px 32px;text-align:center;font-size:12px;color:#9ca3af;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
</style></head>
<body>
  <div class="card">
    <div class="body">${html || '<p style="color:#9ca3af;text-align:center;padding:40px 0">Your email content will appear here…</p>'}</div>
    <div class="footer">You&rsquo;re receiving this because you&rsquo;re a member. <a href="#" style="color:#9ca3af">Unsubscribe</a></div>
  </div>
  <script>
    function report(){window.parent.postMessage({type:'rt-h',h:document.documentElement.scrollHeight},'*')}
    report();
    new MutationObserver(report).observe(document.body,{childList:true,subtree:true,attributes:true});
    window.addEventListener('resize',report);
  </script>
</body></html>`;
}

export function EmailPreview({ subject, fromName, fromEmail, htmlBody, device: deviceProp, onDeviceChange }: Props) {
  const [localDevice, setLocalDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [iframeH, setIframeH] = useState(480);
  const [fullscreen, setFullscreen] = useState(false);

  const device = deviceProp ?? localDevice;
  function setDevice(d: 'desktop' | 'mobile') { setLocalDevice(d); onDeviceChange?.(d); }

  useEffect(() => {
    function fn(e: MessageEvent) {
      if (e.data?.type === 'rt-h' && typeof e.data.h === 'number') {
        setIframeH(Math.max(e.data.h + 2, 320));
      }
    }
    window.addEventListener('message', fn);
    return () => window.removeEventListener('message', fn);
  }, []);

  useEffect(() => { setIframeH(480); }, [htmlBody]);

  const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const srcDoc = buildDoc(htmlBody);

  // The inbox chrome — sender row, subject, to row
  const InboxHeader = () => (
    <div style={{ background: '#141D2E', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Subject line */}
      <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-sm font-semibold leading-snug" style={{ color: '#F1F5F9' }}>
          {subject || <span style={{ color: '#334155' }}>No subject</span>}
        </p>
      </div>
      {/* From / To / time */}
      <div className="px-5 py-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Avatar */}
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)' }}>
              {(fromName || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-semibold" style={{ color: '#CBD5E1' }}>
                  {fromName || 'Sender'}
                </span>
                <span className="text-[11px] truncate" style={{ color: '#475569' }}>
                  &lt;{fromEmail || 'sender@example.com'}&gt;
                </span>
              </div>
              <div className="text-[11px]" style={{ color: '#334155' }}>
                To: <span style={{ color: '#475569' }}>subscriber@example.com</span>
              </div>
            </div>
          </div>
          <span className="text-[11px] flex-shrink-0 ml-3" style={{ color: '#334155' }}>{ts}</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Panel ── */}
      <div className="flex h-full flex-col" style={{ background: '#060C15' }}>

        {/* Panel chrome */}
        <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
          style={{ background: '#0D1525', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Traffic lights */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#EF4444' }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#F59E0B' }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#22C55E' }} />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-widest" style={{ color: '#334155' }}>
              Inbox Preview
            </span>
          </div>

          {/* Device + expand */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center overflow-hidden rounded-lg"
              style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              {([['desktop', MonitorIcon], ['mobile', SmartphoneIcon]] as const).map(([d, Icon]) => (
                <button key={d} onClick={() => setDevice(d)}
                  className="flex items-center px-2.5 py-1.5 transition-all"
                  style={{ color: device === d ? '#E2E8F0' : '#4B5563', background: device === d ? 'rgba(255,255,255,0.09)' : 'transparent' }}
                  title={d}>
                  <Icon className="h-3 w-3" />
                </button>
              ))}
            </div>
            <button onClick={() => setFullscreen(true)}
              className="flex items-center justify-center rounded-lg px-2 py-1.5 transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#4B5563' }}
              title="Full screen">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M1 4.5V1h3.5M7.5 1H11v3.5M11 7.5V11H7.5M4.5 11H1V7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Email render — fills remaining space, scrollable */}
        <div className="flex-1 overflow-auto" style={{ background: '#0B1221' }}>
          <div className="transition-all duration-300 mx-auto"
            style={{ width: device === 'mobile' ? '375px' : '100%', maxWidth: '100%' }}>
            <InboxHeader />
            {/* White email card */}
            <div style={{ background: '#FFFFFF' }}>
              <iframe
                srcDoc={srcDoc}
                title="Email preview"
                sandbox="allow-same-origin allow-scripts"
                className="w-full block border-none"
                style={{ height: iframeH, background: '#FFFFFF' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Fullscreen modal ── */}
      {fullscreen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto pt-12 pb-8 px-6"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
          <div className="w-full max-w-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Email Preview</span>
              <button onClick={() => setFullscreen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-white transition-colors"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl shadow-2xl"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              <InboxHeader />
              <div style={{ background: '#FFFFFF' }}>
                <iframe srcDoc={srcDoc} title="Preview fullscreen"
                  sandbox="allow-same-origin allow-scripts"
                  className="w-full block border-none"
                  style={{ height: Math.max(iframeH, 540), background: '#FFFFFF' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
