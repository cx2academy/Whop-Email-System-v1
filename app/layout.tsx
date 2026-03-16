/**
 * app/layout.tsx
 * Root layout — RevTray branding, Bricolage Grotesque + DM Sans fonts.
 */

import type { Metadata } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import './globals.css';

const bricolage = Bricolage_Grotesque({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  axes: ['opsz'],
});

const dmSans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
});

export const metadata: Metadata = {
  title: {
    default: 'RevTray',
    template: '%s | RevTray',
  },
  description:
    'Email marketing built for Whop creators. Sync your audience, send campaigns that convert, and see exactly how much revenue your emails generate.',
  keywords: ['whop', 'email marketing', 'revenue attribution', 'creator email', 'revtray'],
  authors: [{ name: 'RevTray' }],
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${bricolage.variable} ${dmSans.variable} font-sans antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
