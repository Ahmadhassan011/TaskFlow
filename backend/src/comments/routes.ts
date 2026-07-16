import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as commentService from './service';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { createCommentSchema, updateCommentSchema, listCommentsSchema } from './validator';

const router = Router();

router.use(authenticate);

// GET /api/tasks/:taskId/comments
router.get(
  '/:taskId/comments',
  validate(listCommentsSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { page, limit } = req.query;
      const comments = await commentService.listComments(
        req.params.taskId,
        req.user!.userId,
        req.user!.tenantId,
        page ? parseInt(page as string) : undefined,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(comments);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/tasks/:taskId/comments
router.post(
  '/:taskId/comments',
  validate(createCommentSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const comment = await commentService.addComment(
        req.params.taskId,
        req.body.content,
        req.user!.userId,
        req.user!.tenantId
      );
      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/tasks/:taskId/comments/:commentId
router.put(
  '/:taskId/comments/:commentId',
  validate(updateCommentSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const comment = await commentService.updateComment(
        req.params.taskId,
        req.params.commentId,
        req.body.content,
        req.user!.userId,
        req.user!.tenantId,
        req.user!.role
      );
      res.json(comment);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/tasks/:taskId/comments/:commentId
router.delete(
  '/:taskId/comments/:commentId',
  async (req: AuthRequest, res, next) => {
    try {
      const result = await commentService.deleteComment(
        req.params.taskId,
        req.params.commentId,
        req.user!.userId,
        req.user!.tenantId,
        req.user!.role
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
