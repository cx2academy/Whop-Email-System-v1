/**
 * emails/verification.tsx
 *
 * Verification email template.
 */

import * as React from "react";

export interface VerificationEmailProps {
  name: string;
  url: string;
}

export function VerificationEmail({ name, url }: VerificationEmailProps): React.ReactElement {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify your email</title>
        <style>{`
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7; }
          .content { padding: 40px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #22C55E; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 24px; }
          .footer { padding: 20px 40px; background-color: #fafafa; border-top: 1px solid #e4e4e7; color: #71717a; font-size: 12px; }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="content">
            <h1 style={{ margin: '0 0 16px', fontSize: '24px', color: '#18181b' }}>Verify your email</h1>
            <p style={{ margin: '0 0 16px', fontSize: '16px', lineHeight: '1.5', color: '#3f3f46' }}>
              Hi {name},
            </p>
            <p style={{ margin: '0 0 24px', fontSize: '16px', lineHeight: '1.5', color: '#3f3f46' }}>
              Welcome to RevTray! To get started, please click the button below to verify your email address and activate your workspace.
            </p>
            <a href={url} className="button" style={{ color: '#ffffff' }}>Verify Email Address</a>
            <p style={{ margin: '24px 0 0', fontSize: '14px', color: '#71717a' }}>
              If the button above doesn&apos;t work, you can copy and paste this link into your browser:
              <br />
              <span style={{ color: '#22C55E' }}>{url}</span>
            </p>
          </div>
          <div className="footer">
            If you didn&apos;t sign up for an account, you can safely ignore this email.
          </div>
        </div>
      </body>
    </html>
  );
}
