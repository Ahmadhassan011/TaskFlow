import prisma from '../config/database';
import { createError } from '../middleware/error';
import { PAGINATION } from '../config/constants';
import { logActivity } from '../activity/service';

const verifyTenantProject = async (projectId: string, tenantId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { tenantId: true },
  });
  if (!project || project.tenantId !== tenantId) {
    throw createError(404, 'Project not found');
  }
};

export const listLabels = async (
  projectId: string,
  tenantId: string,
  page?: number,
  limit?: number
) => {
  await verifyTenantProject(projectId, tenantId);

  const pageNum = page || PAGINATION.DEFAULT_PAGE;
  const limitNum = Math.min(limit || 50, PAGINATION.MAX_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  const [labels, total] = await Promise.all([
    prisma.label.findMany({
      where: { projectId, tenantId },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { name: 'asc' },
      skip,
      take: limitNum,
    }),
    prisma.label.count({ where: { projectId, tenantId } }),
  ]);

  return {
    labels,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

export const createLabel = async (
  projectId: string,
  name: string,
  color?: string,
  userId?: string,
  tenantId?: string
) => {
  if (tenantId) {
    await verifyTenantProject(projectId, tenantId);
  }

  // Check if label with same name exists in project
  const existingLabel = await prisma.label.findUnique({
    where: {
      name_projectId: {
        name,
        projectId,
      },
    },
  });

  if (existingLabel) {
    throw createError(409, 'Label with this name already exists in project');
  }

  if (!tenantId) {
    throw createError(400, 'Workspace context is required');
  }

  const label = await prisma.label.create({
    data: {
      name,
      color: color || '#3B82F6',
      projectId,
      tenantId,
    },
  });

  // Log activity
  if (userId && tenantId) {
    await logActivity({
      tenantId,
      userId,
      action: 'CREATED',
      entityType: 'LABEL',
      entityId: label.id,
    });
  }

  return label;
};

export const updateLabel = async (
  projectId: string,
  labelId: string,
  data: { name?: string; color?: string },
  userId?: string,
  tenantId?: string
) => {
  const where = tenantId
    ? { id: labelId, projectId, tenantId }
    : { id: labelId, projectId };
  const label = await prisma.label.findFirst({ where });

  if (!label) {
    throw createError(404, 'Label not found');
  }

  // Check for name conflict if updating name
  if (data.name && data.name !== label.name) {
    const existingLabel = await prisma.label.findUnique({
      where: {
        name_projectId: {
          name: data.name,
          projectId,
        },
      },
    });

    if (existingLabel) {
      throw createError(409, 'Label with this name already exists in project');
    }
  }

  const updatedLabel = await prisma.label.update({
    where: { id: labelId },
    data,
  });

  // Log activity
  if (userId && tenantId) {
    await logActivity({
      tenantId,
      userId,
      action: 'UPDATED',
      entityType: 'LABEL',
      entityId: labelId,
    });
  }

  return updatedLabel;
};

export const deleteLabel = async (
  projectId: string,
  labelId: string,
  userId?: string,
  tenantId?: string
) => {
  const where = tenantId
    ? { id: labelId, projectId, tenantId }
    : { id: labelId, projectId };
  const label = await prisma.label.findFirst({ where });

  if (!label) {
    throw createError(404, 'Label not found');
  }

  await prisma.label.delete({
    where: { id: labelId },
  });

  // Log activity
  if (userId && tenantId) {
    await logActivity({
      tenantId,
      userId,
      action: 'DELETED',
      entityType: 'LABEL',
      entityId: labelId,
    });
  }

  return { message: 'Label deleted successfully' };
};
