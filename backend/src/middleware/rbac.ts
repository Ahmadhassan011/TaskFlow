import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../config/database';
import { requirePermission } from './authorize';
import type { Permission } from '../config/constants';

/**
 * Route-level guard. Delegates to the centralized authorization engine
 * (RBAC + ReBAC + audit). `permission` is the capability required.
 */
export const checkPermission = (permission: Permission) => {
  return requirePermission(permission);
};

/**
 * Resource-level guard for tasks. Ensures the task belongs to the caller's
 * tenant and (for MEMBERs) that they are the assignee or hold a resource share.
 * ADMIN/OWNER bypass the assignee restriction.
 */
export const checkTaskAccess = (action: 'read' | 'update' | 'delete') => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role === 'OWNER' || req.user.role === 'ADMIN') {
      next();
      return;
    }

    const taskId = req.params.taskId || req.params.id;
    if (!taskId) {
      res.status(400).json({ error: 'Task ID required' });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            members: { where: { userId: req.user.userId } },
          },
        },
      },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Tenant isolation — task must live in the caller's tenant.
    if (task.tenantId !== req.user.tenantId) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const membership = task.project.members[0];
    const isShared = await prisma.resourceShare.findFirst({
      where: {
        tenantId: req.user.tenantId,
        resourceType: 'TASK',
        resourceId: taskId,
        OR: [
          { targetType: 'USER', userId: req.user.userId },
          { targetType: 'EMAIL', email: req.user.email },
        ],
      },
    });

    if (req.user.role === 'GUEST' && !isShared) {
      res.status(403).json({ error: 'Not shared with you' });
      return;
    }

    if (req.user.role === 'MEMBER' && action !== 'read') {
      const hasProjectAccess = !!membership;
      const allowedByShare =
        !!isShared && (isShared.access === 'EDIT' || isShared.access === 'MANAGE');
      if (task.assigneeId !== req.user.userId && !hasProjectAccess && !allowedByShare) {
        res.status(403).json({ error: 'Can only modify assigned tasks' });
        return;
      }
    }

    next();
  };
};
