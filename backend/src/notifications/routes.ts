import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as notificationService from './service';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const { page, limit, read } = req.query;
    const result = await notificationService.listNotifications(req.user!.userId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      read: read !== undefined ? read === 'true' : undefined,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await notificationService.markAsRead(req.params.id, req.user!.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.patch('/read-all', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user!.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const result = await notificationService.deleteNotification(req.params.id, req.user!.userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
