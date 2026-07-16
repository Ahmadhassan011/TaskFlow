import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as dashboardService from './service';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { trendSchema } from './validator';

const router = Router();

router.use(authenticate);

// GET /api/dashboard/stats
router.get('/stats', async (req: AuthRequest, res, next) => {
  try {
    const stats = await dashboardService.getDashboardStats(
      req.user!.userId,
      req.user!.role,
      req.user!.tenantId
    );
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// GET /api/dashboard/trend
router.get('/trend', validate(trendSchema), async (req: AuthRequest, res, next) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 30;
    const trend = await dashboardService.getTaskCompletionTrend(
      req.user!.userId,
      req.user!.role,
      req.user!.tenantId,
      days
    );
    res.json(trend);
  } catch (error) {
    next(error);
  }
});

export default router;
