import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as taskService from './service';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { checkPermission, checkTaskAccess } from '../middleware/rbac';
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  getTaskSchema,
  listTasksSchema,
  createSubtaskSchema,
  updateSubtaskSchema,
} from './validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/tasks
router.get(
  '/',
  validate(listTasksSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { page, limit, status, priority, assigneeId, projectId, search } = req.query;
      const result = await taskService.listTasks(
        req.user!.userId,
        req.user!.role,
        req.user!.tenantId,
        {
          page: page ? parseInt(page as string) : undefined,
          limit: limit ? parseInt(limit as string) : undefined,
          status: status as string,
          priority: priority as string,
          assigneeId: assigneeId as string,
          projectId: projectId as string,
          search: search as string,
        }
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tasks/:id
router.get(
  '/:id',
  validate(getTaskSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const task = await taskService.getTask(
        req.params.id,
        req.user!.userId,
        req.user!.role,
        req.user!.tenantId
      );
      res.json(task);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/tasks
router.post(
  '/',
  checkPermission('tasks:create'),
  validate(createTaskSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const task = await taskService.createTask(req.body, req.user!.userId, req.user!.tenantId);
      res.status(201).json(task);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/tasks/:id
router.put(
  '/:id',
  checkPermission('tasks:update'),
  checkTaskAccess('update'),
  validate(updateTaskSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const task = await taskService.updateTask(req.params.id, req.body, req.user!.userId, req.user!.tenantId);
      res.json(task);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/tasks/:id/status
router.patch(
  '/:id/status',
  checkPermission('tasks:status:change'),
  checkTaskAccess('update'),
  validate(updateTaskStatusSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const task = await taskService.updateTaskStatus(
        req.params.id,
        req.body.status,
        req.user!.role,
        req.user!.userId,
        req.user!.tenantId
      );
      res.json(task);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/tasks/:id
router.delete(
  '/:id',
  checkPermission('tasks:delete'),
  checkTaskAccess('delete'),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await taskService.deleteTask(req.params.id, req.user!.userId, req.user!.tenantId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/tasks/:taskId/subtasks
router.post(
  '/:taskId/subtasks',
  checkPermission('tasks:update'),
  checkTaskAccess('update'),
  validate(createSubtaskSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const subtask = await taskService.addSubtask(
        req.params.taskId,
        req.body.title,
        req.user!.userId,
        req.user!.tenantId
      );
      res.status(201).json(subtask);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/tasks/:taskId/subtasks/:subtaskId
router.patch(
  '/:taskId/subtasks/:subtaskId',
  checkPermission('tasks:update'),
  checkTaskAccess('update'),
  validate(updateSubtaskSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const subtask = await taskService.updateSubtask(
        req.params.taskId,
        req.params.subtaskId,
        req.body.isCompleted,
        req.user!.userId,
        req.user!.tenantId
      );
      res.json(subtask);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/tasks/:taskId/subtasks/:subtaskId
router.delete(
  '/:taskId/subtasks/:subtaskId',
  checkPermission('tasks:update'),
  checkTaskAccess('update'),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await taskService.deleteSubtask(
        req.params.taskId,
        req.params.subtaskId,
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
