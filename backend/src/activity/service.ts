import prisma from '../config/database';
import { Prisma } from '@prisma/client';

export interface LogActivityParams {
  tenantId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, { old: unknown; new: unknown }>;
  ipAddress?: string;
}

export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    await prisma.activityLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes: params.changes ? JSON.parse(JSON.stringify(params.changes)) : Prisma.DbNull,
        ipAddress: params.ipAddress ?? null,
      },
    });
  } catch (error) {
    // Log error but don't throw - activity logging shouldn't break main flow
    console.error('Failed to log activity:', error);
  }
};

export const getEntityActivity = async (
  entityType: string,
  entityId: string,
  tenantId: string,
  page: number = 1,
  limit: number = 20
) => {
  const skip = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: {
        entityType,
        entityId,
        tenantId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.activityLog.count({
      where: {
        entityType,
        entityId,
        tenantId,
      },
    }),
  ]);

  return {
    activities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getUserActivity = async (
  userId: string,
  tenantId: string,
  page: number = 1,
  limit: number = 20
) => {
  const skip = (page - 1) * limit;

  const [activities, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.activityLog.count({
      where: { userId, tenantId },
    }),
  ]);

  return {
    activities,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};
