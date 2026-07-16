import prisma from '../config/database';
import { createError } from '../middleware/error';
import { PAGINATION } from '../config/constants';
import { logActivity } from '../activity/service';
import { createCommentNotification } from '../notifications/service';

const verifyProjectMember = async (taskId: string, userId: string, tenantId: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true, tenantId: true },
  });

  if (!task) {
    throw createError(404, 'Task not found');
  }

  if (task.tenantId !== tenantId) {
    throw createError(404, 'Task not found');
  }

  const membership = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId: task.projectId,
      },
    },
  });

  if (!membership) {
    throw createError(403, 'Not a member of this project');
  }

  return task.projectId;
};

export const listComments = async (
  taskId: string,
  userId: string,
  tenantId: string,
  page?: number,
  limit?: number
) => {
  await verifyProjectMember(taskId, userId, tenantId);

  const pageNum = page || PAGINATION.DEFAULT_PAGE;
  const limitNum = Math.min(limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  const [comments, total] = await Promise.all([
    prisma.comment.findMany({
      where: { taskId },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limitNum,
    }),
    prisma.comment.count({ where: { taskId } }),
  ]);

  return {
    comments,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

export const addComment = async (
  taskId: string,
  content: string,
  authorId: string,
  tenantId: string
) => {
  await verifyProjectMember(taskId, authorId, tenantId);

  const comment = await prisma.comment.create({
    data: {
      content,
      taskId,
      authorId,
    },
    include: {
      author: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  // Log activity
  await logActivity({
    tenantId,
    userId: authorId,
    action: 'COMMENTED',
    entityType: 'TASK',
    entityId: taskId,
  });

  // Send notification to task assignee
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { assigneeId: true, title: true },
  });

  if (task && task.assigneeId && task.assigneeId !== authorId) {
    const commenter = await prisma.user.findUnique({
      where: { id: authorId },
      select: { name: true },
    });

    await createCommentNotification(
      taskId,
      task.title,
      task.assigneeId,
      commenter?.name || 'Someone',
      tenantId
    );
  }

  return comment;
};

export const updateComment = async (
  taskId: string,
  commentId: string,
  content: string,
  authorId: string,
  tenantId: string,
  userRole: string
) => {
  await verifyProjectMember(taskId, authorId, tenantId);

  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      taskId,
    },
  });

  if (!comment) {
    throw createError(404, 'Comment not found');
  }

  // Author can edit own; OWNER/ADMIN can edit any.
  if (comment.authorId !== authorId && userRole !== 'OWNER' && userRole !== 'ADMIN') {
    throw createError(403, 'Can only edit your own comments');
  }

  const updatedComment = await prisma.comment.update({
    where: { id: commentId },
    data: { content },
    include: {
      author: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  // Log activity
  await logActivity({
    tenantId,
    userId: authorId,
    action: 'UPDATED',
    entityType: 'COMMENT',
    entityId: commentId,
    changes: {
      content: { old: comment.content, new: content },
    },
  });

  return updatedComment;
};

export const deleteComment = async (
  taskId: string,
  commentId: string,
  authorId: string,
  tenantId: string,
  userRole: string
) => {
  await verifyProjectMember(taskId, authorId, tenantId);

  const comment = await prisma.comment.findFirst({
    where: {
      id: commentId,
      taskId,
    },
  });

  if (!comment) {
    throw createError(404, 'Comment not found');
  }

  // Author can delete own; OWNER/ADMIN can delete any.
  if (comment.authorId !== authorId && userRole !== 'OWNER' && userRole !== 'ADMIN') {
    throw createError(403, 'Can only delete your own comments');
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });

  // Log activity
  await logActivity({
    tenantId,
    userId: authorId,
    action: 'DELETED',
    entityType: 'COMMENT',
    entityId: commentId,
  });

  return { message: 'Comment deleted successfully' };
};
