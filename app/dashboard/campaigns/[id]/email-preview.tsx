'use client';

import DOMPurify from 'dompurify';
import { useEffect, useState } from 'react';

interface EmailPreviewProps {
  html: string;
}

export function EmailPreview({ html }: EmailPreviewProps) {
  const [sanitized, setSanitized] = useState('');

  useEffect(() => {
    // Only sanitize on the client where DOMPurify has access to window
    setSanitized(DOMPurify.sanitize(html));
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
