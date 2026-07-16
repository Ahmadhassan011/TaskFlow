import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as labelService from './service';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { createLabelSchema, updateLabelSchema, deleteLabelSchema, listLabelsSchema } from './validator';

const router = Router();

router.use(authenticate);

// GET /api/projects/:projectId/labels
router.get(
  '/:projectId/labels',
  validate(listLabelsSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { page, limit } = req.query;
      const labels = await labelService.listLabels(
        req.params.projectId,
        req.user!.tenantId,
        page ? parseInt(page as string) : undefined,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(labels);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/projects/:projectId/labels
router.post(
  '/:projectId/labels',
  checkPermission('labels:create'),
  validate(createLabelSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const label = await labelService.createLabel(
        req.params.projectId,
        req.body.name,
        req.body.color,
        req.user!.userId,
        req.user!.tenantId
      );
      res.status(201).json(label);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/projects/:projectId/labels/:labelId
router.put(
  '/:projectId/labels/:labelId',
  checkPermission('labels:update'),
  validate(updateLabelSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const label = await labelService.updateLabel(
        req.params.projectId,
        req.params.labelId,
        req.body,
        req.user!.userId,
        req.user!.tenantId
      );
      res.json(label);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/projects/:projectId/labels/:labelId
router.delete(
  '/:projectId/labels/:labelId',
  checkPermission('labels:delete'),
  validate(deleteLabelSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await labelService.deleteLabel(
        req.params.projectId,
        req.params.labelId,
        req.user!.userId,
        req.user!.tenantId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
