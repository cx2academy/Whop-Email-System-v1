/**
 * emails/beta-welcome.tsx
 *
 * Welcome email template for approved beta testers.
 */

import * as React from "react";

export interface BetaWelcomeEmailProps {
  name: string;
  inviteCode: string;
  registrationUrl: string;
}

export function BetaWelcomeEmail({ name, inviteCode, registrationUrl }: BetaWelcomeEmailProps): React.ReactElement {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to the RevTray Beta</title>
        <style>{`
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #090A0C; margin: 0; padding: 0; color: #ffffff; }
          .container { max-width: 600px; margin: 40px auto; background-color: #0D0F12; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255,255,255,0.05); }
          .content { padding: 48px; }
          .button { display: inline-block; padding: 16px 32px; background-color: #22C55E; color: #000000; text-decoration: none; border-radius: 12px; font-weight: bold; margin-top: 32px; font-size: 16px; }
          .footer { padding: 24px 48px; background-color: #050505; border-top: 1px solid rgba(255,255,255,0.05); color: #71717a; font-size: 12px; text-align: center; }
          .code-box { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 16px; border-radius: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 24px; font-bold; text-align: center; letter-spacing: 4px; color: #22C55E; margin: 24px 0; }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="content">
            <h1 style={{ margin: '0 0 16px', fontSize: '32px', fontWeight: 'bold', color: '#ffffff', letterSpacing: '-0.025em' }}>Verification Success.</h1>
            <p style={{ margin: '0 0 24px', fontSize: '18px', lineHeight: '1.6', color: '#a1a1aa' }}>
              Hi {name},
            </p>
            <p style={{ margin: '0 0 24px', fontSize: '18px', lineHeight: '1.6', color: '#a1a1aa' }}>
              You've been hand-picked for the RevTray Private Beta. We loved your application and we're excited to have you onboard.
            </p>
            
            <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#71717a' }}>Your Private Invite Code</p>
            <div className="code-box">{inviteCode}</div>

            <p style={{ margin: '0 0 24px', fontSize: '16px', lineHeight: '1.6', color: '#a1a1aa' }}>
              Click the button below to complete your account setup. This link is unique and bound to your invite code.
            </p>

            <a href={registrationUrl} className="button">Setup Your Workspace</a>
            
            <p style={{ margin: '32px 0 0', fontSize: '14px', color: '#71717a' }}>
              If you have any issues, reply to this email or join our Discord.
            </p>
          </div>
          <div className="footer">
            &copy; 2026 RevTray. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  );
}
