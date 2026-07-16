import prisma from '../config/database';
import { createError } from '../middleware/error';
import { PAGINATION } from '../config/constants';
import fs from 'fs/promises';
import path from 'path';
import { logActivity } from '../activity/service';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

export const ensureUploadsDir = async () => {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
};

export const listAttachments = async (
  taskId: string,
  userId: string,
  tenantId?: string,
  page?: number,
  limit?: number
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true, tenantId: true },
  });

  if (!task) {
    throw createError(404, 'Task not found');
  }

  if (tenantId && task.tenantId !== tenantId) {
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

  const pageNum = page || PAGINATION.DEFAULT_PAGE;
  const limitNum = Math.min(limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  const [attachments, total] = await Promise.all([
    prisma.attachment.findMany({
      where: { taskId },
      include: {
        uploadedBy: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
    }),
    prisma.attachment.count({ where: { taskId } }),
  ]);

  return {
    attachments,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

export const uploadAttachment = async (
  taskId: string,
  userId: string,
  file: Express.Multer.File,
  tenantId?: string
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true, tenantId: true },
  });

  if (!task) {
    throw createError(404, 'Task not found');
  }

  if (tenantId && task.tenantId !== tenantId) {
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

  const attachment = await prisma.attachment.create({
    data: {
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      taskId,
      uploadedById: userId,
    },
    include: {
      uploadedBy: {
        select: { id: true, name: true, avatar: true },
      },
    },
  });

  // Log activity
  if (tenantId) {
    await logActivity({
      tenantId,
      userId,
      action: 'UPLOADED',
      entityType: 'TASK',
      entityId: taskId,
    });
  }

  return attachment;
};

export const deleteAttachment = async (
  attachmentId: string,
  userId: string,
  tenantId?: string,
  userRole?: string
) => {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { task: { select: { tenantId: true } } },
  });

  if (!attachment) {
    throw createError(404, 'Attachment not found');
  }

  if (tenantId && attachment.task.tenantId !== tenantId) {
    throw createError(404, 'Attachment not found');
  }

  if (attachment.uploadedById !== userId && userRole !== 'OWNER' && userRole !== 'ADMIN') {
    throw createError(403, 'Can only delete your own attachments');
  }

  const filePath = path.join(UPLOADS_DIR, attachment.filename);

  try {
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Failed to delete file from disk:', error);
  }

  await prisma.attachment.delete({
    where: { id: attachmentId },
  });

  // Log activity
  if (tenantId) {
    await logActivity({
      tenantId,
      userId,
      action: 'DELETED',
      entityType: 'TASK',
      entityId: attachment.taskId,
    });
  }

  return { message: 'Attachment deleted' };
};

export const getAttachment = async (attachmentId: string, tenantId?: string, userId?: string) => {
  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    include: { task: { select: { tenantId: true, projectId: true } } },
  });

  if (!attachment) {
    throw createError(404, 'Attachment not found');
  }

  if (tenantId && attachment.task.tenantId !== tenantId) {
    throw createError(404, 'Attachment not found');
  }

  if (userId) {
    const membership = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId: attachment.task.projectId,
        },
      },
    });
    if (!membership) {
      throw createError(403, 'Not a member of this project');
    }
  }

  return attachment;
};
