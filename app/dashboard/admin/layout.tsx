import { redirect } from 'next/navigation';
import { AdminNav } from './admin-nav';
import { auth } from '@/auth';
import { isEmailAdmin } from '@/lib/admin/utils';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userIsAdmin = isEmailAdmin(session?.user?.email);

  if (!userIsAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Platform Admin
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage the RevTray platform and monitor system health.
        </p>
      </div>
      
      <AdminNav />

      {children}
    </div>
  );
}

