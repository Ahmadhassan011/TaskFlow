import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as projectService from './service';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import {
  createProjectSchema,
  updateProjectSchema,
  getProjectSchema,
  listProjectsSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from './validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/projects
router.get(
  '/',
  validate(listProjectsSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { page, limit, status, search } = req.query;
      const result = await projectService.listProjects(
        req.user!.userId,
        req.user!.role,
        req.user!.tenantId,
        {
          page: page ? parseInt(page as string) : undefined,
          limit: limit ? parseInt(limit as string) : undefined,
          status: status as string,
          search: search as string,
        }
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/projects/:id
router.get(
  '/:id',
  validate(getProjectSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const project = await projectService.getProject(
        req.params.id,
        req.user!.userId,
        req.user!.role,
        req.user!.tenantId
      );
      res.json(project);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/projects
router.post(
  '/',
  checkPermission('projects:create'),
  validate(createProjectSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const project = await projectService.createProject(
        req.user!.userId,
        req.user!.tenantId,
        req.body
      );
      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/projects/:id
router.put(
  '/:id',
  checkPermission('projects:update'),
  validate(updateProjectSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const project = await projectService.updateProject(
        req.params.id,
        req.user!.userId,
        req.user!.role,
        req.user!.tenantId,
        req.body
      );
      res.json(project);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/projects/:id
router.delete(
  '/:id',
  checkPermission('projects:delete'),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await projectService.deleteProject(
        req.params.id,
        req.user!.userId,
        req.user!.role,
        req.user!.tenantId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/projects/:id/members
router.post(
  '/:id/members',
  checkPermission('projects:members:manage'),
  validate(addMemberSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const member = await projectService.addMember(
        req.params.id,
        req.body.userId,
        req.user!.tenantId,
        req.body.role,
        req.user!.userId
      );
      res.status(201).json(member);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/projects/:id/members/:memberId
router.delete(
  '/:id/members/:memberId',
  checkPermission('projects:members:manage'),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await projectService.removeMember(
        req.params.id,
        req.params.memberId,
        req.user!.tenantId,
        req.user!.userId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/projects/:id/members/:memberId
router.put(
  '/:id/members/:memberId',
  checkPermission('projects:members:manage'),
  validate(updateMemberRoleSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const member = await projectService.updateMemberRole(
        req.params.id,
        req.params.memberId,
        req.body.role,
        req.user!.tenantId,
        req.user!.userId
      );
      res.json(member);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
