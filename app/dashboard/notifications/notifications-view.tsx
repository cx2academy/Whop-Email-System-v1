'use client';

import React, { useState, useTransition } from 'react';
import { 
  BellIcon, 
  CheckCheckIcon, 
  FilterIcon, 
  InboxIcon, 
  MoreHorizontalIcon,
  Trash2Icon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  getUserNotifications, 
  markAsRead, 
  markAllAsRead 
} from '@/lib/notifications/actions';

interface NotificationsViewProps {
  workspaceId: string;
  userId: string;
  initialNotifications: any[];
}

export function NotificationsView({ 
  workspaceId, 
  userId, 
  initialNotifications 
}: NotificationsViewProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeTab, setActiveTab] = useState('all');
  const [isPending, startTransition] = useTransition();

  const filteredNotifications = notifications.filter(n => 
    activeTab === 'all' ? true : !n.isRead
  );

  const handleMarkAllRead = async () => {
    const previous = [...notifications];
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    startTransition(async () => {
      try {
        await markAllAsRead(workspaceId, userId);
      } catch (err) {
        console.error("Failed to mark all as read", err);
        setNotifications(previous);
      }
    });
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.isRead) {
      const previous = [...notifications];
      setNotifications(prev => 
        prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n)
      );

      startTransition(async () => {
        try {
          await markAsRead(notif.id);
        } catch (err) {
          console.error("Failed to mark notification as read", err);
          setNotifications(previous);
        }
      });
    }

    if (notif.actionUrl) {
      router.push(notif.actionUrl);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-auto">
          <TabsList className="bg-zinc-100/50 p-1">
            <TabsTrigger value="all" className="px-5 py-1.5 text-xs font-medium">All</TabsTrigger>
            <TabsTrigger value="unread" className="px-5 py-1.5 text-xs font-medium">
              Unread
              {notifications.filter(n => !n.isRead).length > 0 && (
                <Badge className="ml-2 h-4 w-4 rounded-full bg-blue-600 p-0 text-[10px] leading-none text-white hover:bg-blue-600 border-none">
                  {notifications.filter(n => !n.isRead).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 gap-2 text-xs font-medium bg-white border-zinc-200"
            onClick={handleMarkAllRead}
            disabled={notifications.every(n => n.isRead)}
          >
            <CheckCheckIcon className="h-3.5 w-3.5" />
            Mark all as read
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 bg-white border-zinc-200">
                <MoreHorizontalIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive text-xs">
                <Trash2Icon className="mr-2 h-3.5 w-3.5" />
                Clear history
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 bg-zinc-50/30 border-dashed">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 mb-4">
            <InboxIcon className="h-8 w-8 text-zinc-300" />
          </div>
          <h2 className="text-lg font-semibold text-zinc-900">No notifications found</h2>
          <p className="text-zinc-500 text-sm mt-1">
            {activeTab === 'unread' 
              ? "You've read all your notifications!" 
              : "Notifications about your campaigns and account will appear here."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={cn(
                "group relative flex items-start gap-4 p-5 rounded-xl border transition-all cursor-pointer",
                notif.isRead 
                  ? "bg-white border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50/50" 
                  : "bg-white border-blue-100 shadow-sm ring-1 ring-blue-50 hover:shadow-md"
              )}
            >
              <div className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                notif.isRead ? "bg-zinc-50 text-zinc-400" : "bg-blue-50 text-blue-600 border-blue-100"
              )}>
                <BellIcon className="h-5 w-5" />
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={cn(
                    "text-[15px] font-semibold tracking-tight",
                    notif.isRead ? "text-zinc-600" : "text-zinc-900"
                  )}>
                    {notif.title}
                  </h3>
                  <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-widest flex-shrink-0">
                    {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className={cn(
                  "text-[14px] leading-relaxed line-clamp-2",
                  notif.isRead ? "text-zinc-400" : "text-zinc-600"
                )}>
                  {notif.message}
                </p>
                
                {!notif.isRead && (
                  <div className="pt-2 flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                    <span className="text-[11px] font-semibold text-blue-600">New update</span>
                  </div>
                )}
              </div>

              {!notif.isRead && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-blue-600 rounded-r-full" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
