'use server';

import { db } from '@/lib/db/client';
import { revalidatePath } from 'next/cache';
import { NotificationType } from '@prisma/client';

export interface CreateNotificationInput {
  workspaceId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
}

/**
 * Central server action to spawn a new notification.
 */
export async function createNotification(input: CreateNotificationInput) {
  const { workspaceId, userId, type, title, message, actionUrl } = input;

  const notification = await db.notification.create({
    data: {
      workspaceId,
      userId,
      type,
      title,
      message,
      actionUrl,
    },
  });

  // Revalidate to ensure UI updates
  revalidatePath('/dashboard', 'layout');
  
  return notification;
}

/**
 * Fetches the notification timeline for a workspace/user.
 */
export async function getUserNotifications(
  workspaceId: string, 
  userId?: string, 
  limit = 20, 
  unreadOnly = false
) {
  return await db.notification.findMany({
    where: {
      workspaceId,
      ...(userId ? { userId } : {}),
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });
}

/**
 * Marks a specific notification as read.
 */
export async function markAsRead(notificationId: string) {
  const notification = await db.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  revalidatePath('/dashboard', 'layout');
  return notification;
}

/**
 * Marks all notifications in a workspace (and optionally for a user) as read.
 */
export async function markAllAsRead(workspaceId: string, userId?: string) {
  await db.notification.updateMany({
    where: { 
      workspaceId, 
      ...(userId ? { userId } : {}),
      isRead: false 
    },
    data: { isRead: true },
  });

  revalidatePath('/dashboard', 'layout');
}

/**
 * Lightweight query strictly for powering the red bell badge count.
 */
export async function getUnreadCount(workspaceId: string, userId?: string) {
  return await db.notification.count({
    where: {
      workspaceId,
      ...(userId ? { userId } : {}),
      isRead: false,
    },
  });
}
