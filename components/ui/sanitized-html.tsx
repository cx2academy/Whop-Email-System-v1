'use client';

import React, { useEffect, useState } from 'react';

interface SanitizedHtmlProps {
  html: string;
  className?: string;
  tag?: string;
}

/**
 * A client-safe component to render sanitized HTML.
 * Resolves server-side JSOM/isomorphic-dompurify crashes by only sanitizing on the client or using a safe fallback on the server.
 */
export function SanitizedHtml({ html, className, tag = 'div' }: SanitizedHtmlProps) {
  const [sanitized, setSanitized] = useState<string>('');

  useEffect(() => {
    // Dynamically import to ensure it's only loaded on the client
    import('isomorphic-dompurify').then((DOMPurify) => {
      setSanitized(DOMPurify.default.sanitize(html));
    });
  }, [html]);

  const Tag = tag as any;

  // Initial render (server and first client pass) is empty or can show a placeholder
  // This prevents the jsdom require error on the server
  if (!sanitized) {
    return <Tag className={className} />;
  }

  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
