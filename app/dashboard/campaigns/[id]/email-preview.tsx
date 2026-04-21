'use client';

import { useEffect, useState } from 'react';

interface EmailPreviewProps {
  html: string;
}

export function EmailPreview({ html }: EmailPreviewProps) {
  const [sanitized, setSanitized] = useState('');

  useEffect(() => {
    // Dynamically import to ensure it's only loaded on the client
    import('isomorphic-dompurify').then((DOMPurify) => {
      setSanitized(DOMPurify.default.sanitize(html));
    });
  }, [html]);

  if (!sanitized) {
    return <div className="animate-pulse h-40 bg-muted rounded-lg" />;
  }

  return (
    <div
      className="prose prose-sm max-w-none text-foreground"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
