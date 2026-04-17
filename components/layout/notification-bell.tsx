'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { BellIcon, Loader2Icon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  getUnreadCount, 
  getUserNotifications, 
  markAsRead, 
  markAllAsRead 
} from '@/lib/notifications/actions';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  workspaceId: string;
  userId: string;
}

export function NotificationBell({ workspaceId, userId }: NotificationBellProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Initial fetch and polling
  useEffect(() => {
    const fetchCount = async () => {
      const count = await getUnreadCount(workspaceId, userId);
      setUnreadCount(count);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [workspaceId, userId]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      const [unread, all] = await Promise.all([
        getUserNotifications(workspaceId, userId, 10, true),
        getUserNotifications(workspaceId, userId, 10, false),
      ]);
      setUnreadNotifications(unread);
      setAllNotifications(all);
    } catch (error) {
      console.error('Failed to load notifications', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      // Optimistic update
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setUnreadNotifications(prev => prev.filter(n => n.id !== notif.id));
      setAllNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));

      startTransition(async () => {
        try {
          await markAsRead(notif.id);
        } catch (error) {
          // Rollback on failure (optional, but good for real real-time)
          console.error("Failed to mark as read", error);
          loadNotifications();
        }
      });
    }

    // Navigate to notification page or actionUrl
    if (notif.actionUrl) {
      router.push(notif.actionUrl);
    } else {
      router.push('/dashboard/notifications');
    }
  };

  const handleMarkAllAsRead = async () => {
    // Optimistic update
    const previousUnreadCount = unreadCount;
    const previousUnread = unreadNotifications;
    const previousAll = allNotifications;

    setUnreadCount(0);
    setUnreadNotifications([]);
    setAllNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    startTransition(async () => {
      try {
        await markAllAsRead(workspaceId, userId);
      } catch (error) {
        console.error("Failed to mark all as read", error);
        // Rollback
        setUnreadCount(previousUnreadCount);
        setUnreadNotifications(previousUnread);
        setAllNotifications(previousAll);
      }
    });
  };

  return (
    <Popover onOpenChange={(open) => open && loadNotifications()}>
      <PopoverTrigger asChild>
        <button className="relative rounded-full p-2 text-zinc-400 transition-all hover:bg-zinc-100 hover:text-zinc-900">
          <BellIcon className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>
        <Separator />
        
        <Tabs defaultValue="unread" className="w-full">
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-2 h-11 h-auto">
            <TabsTrigger 
              value="unread" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none h-10 text-xs"
            >
              Unread
            </TabsTrigger>
            <TabsTrigger 
              value="all" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none h-10 text-xs"
            >
              All
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="unread" className="mt-0">
            <NotificationList 
              notifications={unreadNotifications} 
              isLoading={isLoading} 
              onNotificationClick={handleNotificationClick}
              emptyMessage="You're all caught up!"
            />
          </TabsContent>
          <TabsContent value="all" className="mt-0">
            <NotificationList 
              notifications={allNotifications} 
              isLoading={isLoading} 
              onNotificationClick={handleNotificationClick}
              emptyMessage="No notifications yet."
            />
          </TabsContent>
        </Tabs>
        
        <Separator />
        <div className="p-2">
          <Button 
            variant="ghost" 
            className="w-full text-xs text-zinc-500 hover:text-zinc-900"
            onClick={() => router.push('/dashboard/notifications')}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationList({ 
  notifications, 
  isLoading, 
  onNotificationClick,
  emptyMessage
}: { 
  notifications: any[], 
  isLoading: boolean, 
  onNotificationClick: (n: any) => void,
  emptyMessage: string
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2Icon className="h-6 w-6 animate-spin text-zinc-300" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-zinc-400 space-y-2">
        <BellIcon className="h-8 w-8 opacity-20" />
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[350px]">
      <div className="flex flex-col">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => onNotificationClick(n)}
            className={cn(
              "flex flex-col items-start gap-1 p-4 text-left transition-colors hover:bg-zinc-50 border-b last:border-0 relative",
            )}
          >
            {!n.isRead && (
              <span className="absolute left-1 top-6 h-2 w-2 rounded-full bg-blue-600" />
            )}
            <div className="flex w-full items-center justify-between">
              <p className={cn(
                "text-[13px] font-semibold",
                !n.isRead ? "text-zinc-900" : "text-zinc-600"
              )}>
                {n.title}
              </p>
              <span className="text-[10px] text-zinc-400 uppercase font-medium tracking-wider">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="text-[12px] text-zinc-500 line-clamp-2 leading-relaxed">
              {n.message}
            </p>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
