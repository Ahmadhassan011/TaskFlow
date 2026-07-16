import prisma from '../config/database';
import { createError } from '../middleware/error';
import { PAGINATION } from '../config/constants';

export interface NotificationFilters {
  page?: number;
  limit?: number;
  read?: boolean;
}

export const listNotifications = async (
  userId: string,
  filters: NotificationFilters
) => {
  const page = filters.page || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(filters.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const where: { userId: string; read?: boolean } = { userId };

  if (filters.read !== undefined) {
    where.read = filters.read;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId, read: false },
    }),
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const markAsRead = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw createError(404, 'Notification not found');
  }

  if (notification.userId !== userId) {
    throw createError(403, 'Not your notification');
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });

  return updated;
};

export const markAllAsRead = async (userId: string) => {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  return { message: 'All notifications marked as read' };
};

export const deleteNotification = async (notificationId: string, userId: string) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw createError(404, 'Notification not found');
  }

  if (notification.userId !== userId) {
    throw createError(403, 'Not your notification');
  }

  await prisma.notification.delete({
    where: { id: notificationId },
  });

  return { message: 'Notification deleted' };
};

export const createNotification = async (data: {
  type: string;
  message: string;
  userId: string;
  link?: string;
  tenantId: string;
}) => {
  const notification = await prisma.notification.create({
    data: {
      type: data.type,
      message: data.message,
      userId: data.userId,
      link: data.link,
      tenantId: data.tenantId,
    },
  });

  return notification;
};

export const createTaskAssignedNotification = async (
  taskId: string,
  taskTitle: string,
  assigneeId: string,
  assignerName: string,
  tenantId: string
) => {
  return createNotification({
    type: 'ASSIGNED',
    message: `${assignerName} assigned you to "${taskTitle}"`,
    userId: assigneeId,
    link: `/tasks/${taskId}`,
    tenantId,
  });
};

export const createCommentNotification = async (
  taskId: string,
  taskTitle: string,
  assigneeId: string,
  commenterName: string,
  tenantId: string
) => {
  if (!assigneeId) return null;

  return createNotification({
    type: 'COMMENTED',
    message: `${commenterName} commented on "${taskTitle}"`,
    userId: assigneeId,
    link: `/tasks/${taskId}`,
    tenantId,
  });
};

export const createDueSoonNotification = async (
  taskId: string,
  taskTitle: string,
  assigneeId: string,
  dueDate: Date,
  tenantId: string
) => {
  if (!assigneeId) return null;

  const hoursUntilDue = Math.ceil(
    (dueDate.getTime() - Date.now()) / (1000 * 60 * 60)
  );

  let timeMessage: string;
  if (hoursUntilDue <= 1) {
    timeMessage = 'in less than an hour';
  } else if (hoursUntilDue <= 24) {
    timeMessage = `in ${hoursUntilDue} hours`;
  } else {
    const days = Math.ceil(hoursUntilDue / 24);
    timeMessage = `in ${days} day${days > 1 ? 's' : ''}`;
  }

  return createNotification({
    type: 'DUE_SOON',
    message: `"${taskTitle}" is due ${timeMessage}`,
    userId: assigneeId,
    link: `/tasks/${taskId}`,
    tenantId,
  });
};

export const createStatusChangeNotification = async (
  taskId: string,
  taskTitle: string,
  assigneeId: string,
  changerName: string,
  newStatus: string,
  tenantId: string
) => {
  if (!assigneeId) return null;

  const statusLabels: Record<string, string> = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    IN_REVIEW: 'In Review',
    DONE: 'Done',
  };

  return createNotification({
    type: 'STATUS_CHANGED',
    message: `${changerName} moved "${taskTitle}" to ${statusLabels[newStatus] || newStatus}`,
    userId: assigneeId,
    link: `/tasks/${taskId}`,
    tenantId,
  });
};
