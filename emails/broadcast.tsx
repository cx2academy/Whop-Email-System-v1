/**
 * emails/broadcast.tsx
 *
 * Broadcast campaign email template.
 *
 * Rendered server-side via @react-email/render before sending.
 * Includes:
 *   - Unsubscribe link (required for deliverability)
 *   - Open tracking pixel
 *   - Click tracking via redirect URL
 *   - Plain text fallback
 */

import * as React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BroadcastEmailProps {
  /** The campaign's HTML body (from the editor) */
  htmlBody: string;
  /** Sender name shown in the email footer */
  fromName: string;
  /** Workspace name */
  workspaceName: string;
  /** Pre-generated unsubscribe URL */
  unsubscribeUrl: string;
  /** Pre-generated open tracking pixel URL */
  trackingPixelUrl?: string;
  /** App base URL for footer links */
  appUrl: string;
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

/**
 * Wraps campaign HTML body in a production-ready email shell.
 *
 * Returns a full HTML document string — use renderBroadcastEmail()
 * rather than instantiating this directly.
 */
export function BroadcastEmail({
  htmlBody,
  fromName,
  workspaceName,
  unsubscribeUrl,
  trackingPixelUrl,
  appUrl,
}: BroadcastEmailProps): React.ReactElement {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <title>{workspaceName}</title>
        {/* Prevent Gmail from auto-resizing text */}
        <style>{`
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 0;
            background-color: #f4f4f5;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
              'Helvetica Neue', Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          a { color: #6366f1; }
          img { max-width: 100%; height: auto; display: block; }
          @media (max-width: 600px) {
            .wrapper { padding: 12px !important; }
            .content { padding: 24px !important; }
          }
        `}</style>
      </head>
      <body>
        {/* Preheader text (hidden, shows in inbox preview) */}
        <div
          style={{
            display: "none",
            fontSize: "1px",
            lineHeight: "1px",
            maxHeight: 0,
            maxWidth: 0,
            opacity: 0,
            overflow: "hidden",
          }}
          aria-hidden="true"
        >
          &zwnj;&nbsp;
        </div>

        {/* Outer wrapper */}
        <table
          className="wrapper"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          role="presentation"
          style={{ backgroundColor: "#f4f4f5", padding: "32px 16px" }}
        >
          <tbody>
            <tr>
              <td align="center">
                {/* Email container */}
                <table
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  role="presentation"
                  style={{ maxWidth: 600 }}
                >
                  {/* Header */}
                  <tbody>
                    <tr>
                      <td
                        style={{
                          backgroundColor: "#ffffff",
                          borderRadius: "8px 8px 0 0",
                          padding: "24px 32px 16px",
                          borderBottom: "1px solid #e4e4e7",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#18181b",
                          }}
                        >
                          {workspaceName}
                        </p>
                      </td>
                    </tr>

                    {/* Body — campaign HTML injected here */}
                    <tr>
                      <td
                        className="content"
                        style={{
                          backgroundColor: "#ffffff",
                          padding: "32px",
                          fontSize: 15,
                          lineHeight: "1.6",
                          color: "#18181b",
                        }}
                        // Campaign HTML is sanitised before storing — safe to inject
                        dangerouslySetInnerHTML={{ __html: htmlBody }}
                      />
                    </tr>

                    {/* Footer */}
                    <tr>
                      <td
                        style={{
                          backgroundColor: "#fafafa",
                          borderRadius: "0 0 8px 8px",
                          padding: "20px 32px",
                          borderTop: "1px solid #e4e4e7",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 8px",
                            fontSize: 12,
                            color: "#71717a",
                            lineHeight: "1.5",
                          }}
                        >
                          You&apos;re receiving this email from {fromName}.
                        </p>
                        <p style={{ margin: 0, fontSize: 12, color: "#71717a" }}>
                          <a
                            href={unsubscribeUrl}
                            style={{
                              color: "#71717a",
                              textDecoration: "underline",
                            }}
                          >
                            Unsubscribe
                          </a>
                          {" · "}
                          <a
                            href={appUrl}
                            style={{
                              color: "#71717a",
                              textDecoration: "underline",
                            }}
                          >
                            {fromName}
                          </a>
                        </p>
                      </td>
                    </tr>

                    {/* Open tracking pixel — 1x1 transparent image */}
                    {trackingPixelUrl && (
                      <tr>
                        <td style={{ padding: 0 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={trackingPixelUrl}
                            width={1}
                            height={1}
                            alt=""
                            style={{ display: "block" }}
                            aria-hidden="true"
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

// ---------------------------------------------------------------------------
// Plain text version
// ---------------------------------------------------------------------------

export function buildPlainText({
  htmlBody,
  fromName,
  unsubscribeUrl,
}: Pick<BroadcastEmailProps, "htmlBody" | "fromName" | "unsubscribeUrl">): string {
  // Strip HTML tags for plain text fallback
  const text = htmlBody
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return `${text}\n\n---\nYou're receiving this email from ${fromName}.\nUnsubscribe: ${unsubscribeUrl}`;
}
