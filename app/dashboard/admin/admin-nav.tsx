'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export function AdminNav() {
  return (
    <div className="flex gap-4 border-b border-sidebar-border pb-px">
      <AdminNavLink href="/dashboard/admin" label="Overview" />
      <AdminNavLink href="/dashboard/admin/users" label="Users & Workspaces" />
      <AdminNavLink href="/dashboard/admin/health" label="System Health" />
      <AdminNavLink href="/dashboard/admin/broadcast" label="Broadcast" />
      <AdminNavLink href="/dashboard/admin/beta" label="Beta Vault" />
    </div>
  );
}

function AdminNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link 
      href={href}
      className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${
        active 
          ? 'text-foreground border-brand font-semibold' 
          : 'text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground'
      }`}
    >
      {label}
    </Link>
  );
}
