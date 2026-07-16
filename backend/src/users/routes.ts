import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as userService from './service';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { checkPermission } from '../middleware/rbac';
import { createUserSchema, updateUserSchema, getUserSchema, listUsersSchema } from './validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/users  (tenant members)
router.get(
  '/',
  checkPermission('members:read'),
  validate(listUsersSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { page, limit, search, role } = req.query;
      const result = await userService.listUsers({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string,
        role: role as string,
        tenantId: req.user!.tenantId,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/users/:id
router.get(
  '/:id',
  checkPermission('members:read'),
  validate(getUserSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const user = await userService.getUser(req.params.id, req.user!.tenantId);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/users  (invite/add member to workspace)
router.post(
  '/',
  checkPermission('members:manage'),
  validate(createUserSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { email, name, password, role } = req.body;
      const user = await userService.createUser(
        email,
        name,
        password,
        role,
        req.user!.tenantId,
        req.user!.userId
      );
      res.status(201).json(user);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/users/:id
router.put(
  '/:id',
  checkPermission('members:manage'),
  validate(updateUserSchema),
  async (req: AuthRequest, res, next) => {
    try {
      // Role changes require the higher "roles:manage" capability.
      if (req.body.role && req.user!.role !== 'OWNER' && req.user!.role !== 'ADMIN') {
        res.status(403).json({ error: 'Insufficient permissions to change roles' });
        return;
      }
      const user = await userService.updateUser(
        req.params.id,
        req.body,
        req.user!.tenantId,
        req.user!.userId
      );
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/users/:id
router.delete(
  '/:id',
  checkPermission('members:manage'),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await userService.deleteUser(
        req.params.id,
        req.user!.tenantId,
        req.user!.userId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
