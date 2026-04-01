'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname?.split('/').filter(Boolean) || [];

  // Skip the first segment if it's "dashboard"
  const breadcrumbSegments = segments[0] === 'dashboard' ? segments.slice(1) : segments;

  return (
    <nav className="flex items-center gap-2 text-[13px] font-medium">
      <Link 
        href="/dashboard" 
        className="text-zinc-400 transition-colors hover:text-zinc-900"
      >
        Dashboard
      </Link>
      
      {breadcrumbSegments.map((segment, index) => {
        const path = `/dashboard/${breadcrumbSegments.slice(0, index + 1).join('/')}`;
        const isLast = index === breadcrumbSegments.length - 1;
        const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

        return (
          <div key={path} className="flex items-center gap-2">
            <ChevronRightIcon className="h-3.5 w-3.5 text-zinc-300 stroke-[3px]" />
            {isLast ? (
              <span className="text-zinc-900 font-bold tracking-tight truncate max-w-[120px] md:max-w-[200px]">
                {label}
              </span>
            ) : (
              <Link 
                href={path}
                className="text-zinc-400 transition-colors hover:text-zinc-900 truncate max-w-[100px]"
              >
                {label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
