/**
 * app/layout.tsx
 *
 * Root layout — wraps every page in the application.
 * Provides fonts, global styles, and the base HTML shell.
 */

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import "./globals.css";

// ---------------------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------------------

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: "Whop Email Engine",
    template: "%s | Whop Email Engine",
  },
  description:
    "Multi-tenant email campaign platform for Whop creators. Sync members, build campaigns, and send at scale.",
  keywords: ["whop", "email", "campaigns", "creators", "multi-tenant"],
  authors: [{ name: "Whop Email Engine" }],
  robots: {
    index: false, // Pre-launch: keep off search engines
    follow: false,
  },
};

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
