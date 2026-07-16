import { Router } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as tenantService from './service';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  listTenantsSchema,
  getTenantSchema,
  updateTenantSchema,
  listMembersSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
  createInviteSchema,
  listInvitesSchema,
  listAuditLogsSchema,
  acceptInviteSchema,
  listSharesSchema,
  createShareSchema,
  deleteShareSchema,
} from './validator';

const router = Router();

router.use(authenticate);

// GET /api/tenants  — workspaces the caller belongs to
router.get('/', validate(listTenantsSchema), async (req: AuthRequest, res, next) => {
  try {
    const tenants = await tenantService.listMyTenants(req.user!.userId);
    res.json(tenants);
  } catch (error) {
    next(error);
  }
});

// POST /api/tenants/invites/accept  — accept an invitation (authenticated)
router.post(
  '/invites/accept',
  validate(acceptInviteSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await tenantService.acceptInvite(req.body.token, req.user!.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tenants/:id  — workspace settings + stats (tenant:read)
router.get(
  '/:id',
  requirePermission('tenant:read'),
  validate(getTenantSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const tenant = await tenantService.getTenant(req.params.id, req.user!.userId);
      res.json(tenant);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/tenants/:id  — rename (tenant:update)
router.patch(
  '/:id',
  requirePermission('tenant:update'),
  validate(updateTenantSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const tenant = await tenantService.updateTenant(
        req.params.id,
        req.user!.userId,
        req.body
      );
      res.json(tenant);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/tenants/:id  — delete workspace (tenant:delete, OWNER only)
router.delete(
  '/:id',
  requirePermission('tenant:delete'),
  validate(getTenantSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await tenantService.deleteTenant(req.params.id, req.user!.userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tenants/:id/members
router.get(
  '/:id/members',
  requirePermission('members:read'),
  validate(listMembersSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { page, limit } = req.query;
      const result = await tenantService.listMembers(
        req.params.id,
        req.user!.userId,
        page ? parseInt(page as string) : undefined,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/tenants/:id/members/:userId  — change role (roles:manage)
router.patch(
  '/:id/members/:userId',
  requirePermission('roles:manage'),
  validate(updateMemberRoleSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await tenantService.updateMemberRole(
        req.params.id,
        req.params.userId,
        req.body.role,
        req.user!.userId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/tenants/:id/members/:userId  — remove member (members:manage)
router.delete(
  '/:id/members/:userId',
  requirePermission('members:manage'),
  validate(removeMemberSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await tenantService.removeMember(
        req.params.id,
        req.params.userId,
        req.user!.userId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/tenants/:id/invites  (members:invite)
router.post(
  '/:id/invites',
  requirePermission('members:invite'),
  validate(createInviteSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const invite = await tenantService.createInvite(
        req.params.id,
        req.body.email,
        req.body.role,
        req.user!.userId
      );
      res.status(201).json(invite);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tenants/:id/invites
router.get(
  '/:id/invites',
  requirePermission('members:read'),
  validate(listInvitesSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const invites = await tenantService.listInvites(req.params.id, req.user!.userId);
      res.json(invites);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tenants/:id/audit-logs  (audit:read)
router.get(
  '/:id/audit-logs',
  requirePermission('audit:read'),
  validate(listAuditLogsSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { page, limit, action, decision } = req.query;
      const result = await tenantService.listAuditLogs(
        req.params.id,
        req.user!.userId,
        {
          page: page ? parseInt(page as string) : undefined,
          limit: limit ? parseInt(limit as string) : undefined,
          action: action as string | undefined,
          decision: decision as 'ALLOW' | 'DENY' | undefined,
        }
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/tenants/:id/shares  (shares:read)
router.get(
  '/:id/shares',
  requirePermission('shares:read'),
  validate(listSharesSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const shares = await tenantService.listShares(
        req.params.id,
        req.user!.userId,
        req.query.resourceType as string | undefined,
        req.query.resourceId as string | undefined
      );
      res.json(shares);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/tenants/:id/shares  (shares:manage)
router.post(
  '/:id/shares',
  requirePermission('shares:manage'),
  validate(createShareSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const { resourceType, resourceId, targetType, target, access } = req.body;
      const share = await tenantService.createShare(
        req.params.id,
        resourceType,
        resourceId,
        targetType,
        target,
        access,
        req.user!.userId
      );
      res.status(201).json(share);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/tenants/:id/shares/:shareId  (shares:manage)
router.delete(
  '/:id/shares/:shareId',
  requirePermission('shares:manage'),
  validate(deleteShareSchema),
  async (req: AuthRequest, res, next) => {
    try {
      const result = await tenantService.deleteShare(
        req.params.id,
        req.params.shareId,
        req.user!.userId
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
