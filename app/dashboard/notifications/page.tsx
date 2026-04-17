import { requireWorkspaceAccess } from '@/lib/auth/session';
import { NotificationsView } from './notifications-view';
import { getUserNotifications } from '@/lib/notifications/actions';

export default async function NotificationsPage() {
  const { workspaceId, userId } = await requireWorkspaceAccess();
  
  // Initial data fetch
  const initialNotifications = await getUserNotifications(workspaceId, userId, 50);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your workspace activity and campaign performance.
          </p>
        </div>
      </div>

      <NotificationsView 
        workspaceId={workspaceId} 
        userId={userId} 
        initialNotifications={initialNotifications} 
      />
    </div>
  );
}
