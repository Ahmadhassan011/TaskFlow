import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as activityService from './service';
import { authenticate } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

async function isProjectMember(
  projectId: string,
  userId: string,
  role: string,
  tenantId: string
): Promise<boolean> {
  if (role === 'OWNER' || role === 'ADMIN') return true;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { tenantId: true },
  });
  if (!project || project.tenantId !== tenantId) return false;
  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
  return membership !== null;
}

async function canAccessEntity(
  entityType: string,
  entityId: string,
  userId: string,
  role: string,
  tenantId: string
): Promise<boolean> {
  switch (entityType) {
    case 'PROJECT':
      return isProjectMember(entityId, userId, role, tenantId);
    case 'TASK': {
      const task = await prisma.task.findUnique({
        where: { id: entityId },
        select: { projectId: true, tenantId: true },
      });
      if (!task || task.tenantId !== tenantId) return false;
      return isProjectMember(task.projectId, userId, role, tenantId);
    }
    case 'COMMENT': {
      const comment = await prisma.comment.findUnique({
        where: { id: entityId },
        select: { task: { select: { projectId: true, tenantId: true } } },
      });
      if (!comment || comment.task.tenantId !== tenantId) return false;
      return isProjectMember(comment.task.projectId, userId, role, tenantId);
    }
    default:
      return true;
  }
}

// GET /api/activity/entity/:entityType/:entityId
router.get(
  '/entity/:entityType/:entityId',
  authenticate,
  async (req: AuthRequest, res, next) => {
    try {
      const { entityType, entityId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const allowed = await canAccessEntity(
        entityType,
        entityId,
        req.user!.userId,
        req.user!.role,
        req.user!.tenantId
      );
      if (!allowed) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const result = await activityService.getEntityActivity(
        entityType,
        entityId,
        req.user!.tenantId,
        page,
        limit
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/activity/user/:userId
router.get(
  '/user/:userId',
  authenticate,
  async (req: AuthRequest, res, next) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      if (req.user!.userId !== userId && req.user!.role !== 'ADMIN') {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const result = await activityService.getUserActivity(
        userId,
        req.user!.tenantId,
        page,
        limit
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/activity/me
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await activityService.getUserActivity(
      req.user!.userId,
      req.user!.tenantId,
      page,
      limit
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
