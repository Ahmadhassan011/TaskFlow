import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import prisma from '../config/database';
import { ROLE_PERMISSIONS, type Permission } from '../config/constants';

export interface AuthorizeOptions {
  resourceType?: 'PROJECT' | 'TASK';
  resourceId?: string;
  ip?: string;
}

// Minimum share access level required to satisfy a given permission via a
// per-resource share (ReBAC). Absent => role permission only.
const SHARE_REQUIRED: Partial<Record<Permission, 'VIEW' | 'EDIT' | 'MANAGE'>> = {
  'projects:read:all': 'VIEW',
  'projects:read:assigned': 'VIEW',
  'tasks:read': 'VIEW',
  'tasks:update': 'EDIT',
  'tasks:status:change': 'EDIT',
  'tasks:delete': 'EDIT',
  'projects:update': 'MANAGE',
  'projects:delete': 'MANAGE',
  'projects:members:manage': 'MANAGE',
  'shares:manage': 'MANAGE',
};

const ACCESS_RANK: Record<string, number> = { VIEW: 1, EDIT: 2, MANAGE: 3 };

/**
 * Centralized authorization decision.
 *
 * Combines three layers:
 *  1. RBAC  — does the actor's tenant role grant `permission`?
 *  2. ReBAC — does a per-resource share (USER or EMAIL target) grant enough
 *             access for `permission` on the specific resource?
 *  3. Audit — every decision (ALLOW/DENY) is persisted to `AuditLog`.
 *
 * Returns `{ allowed, reason }`. Throws nothing.
 */
export const authorize = async (
  req: AuthRequest,
  permission: Permission,
  opts: AuthorizeOptions = {}
): Promise<{ allowed: boolean; reason: string }> => {
  const user = req.user;
  if (!user) return { allowed: false, reason: 'unauthenticated' };

  const rolePerms = ROLE_PERMISSIONS[user.role] || [];
  let allowed = rolePerms.includes(permission);
  let reason = allowed ? 'role-permission' : 'no-role-permission';

  // ReBAC: a fine-grained resource share can grant the permission even when
  // the role does not. Used for per-project / per-task sharing and guests.
  if (!allowed && opts.resourceType && opts.resourceId) {
    const shares = await prisma.resourceShare.findMany({
      where: {
        tenantId: user.tenantId,
        resourceType: opts.resourceType,
        resourceId: opts.resourceId,
        OR: [
          { targetType: 'USER', userId: user.userId },
          { targetType: 'EMAIL', email: user.email },
        ],
      },
    });
    const required = SHARE_REQUIRED[permission];
    if (required && shares.some((s) => (ACCESS_RANK[s.access] || 0) >= ACCESS_RANK[required])) {
      allowed = true;
      reason = 'resource-share';
    }
  }

  try {
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        actorId: user.userId,
        actorRole: user.role as any,
        action: permission,
        resourceType: opts.resourceType ?? null,
        resourceId: opts.resourceId ?? null,
        decision: allowed ? 'ALLOW' : 'DENY',
        reason,
        ipAddress: opts.ip ?? (req.ip || null),
      },
    });
  } catch {
    // Audit logging must never break the request
  }

  return { allowed, reason };
};

/**
 * Express middleware factory — the single entry point for route-level authz.
 * Replaces the scattered `checkPermission` calls across the API.
 */
export const requirePermission = (
  permission: Permission,
  opts?: Omit<AuthorizeOptions, 'ip'>
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const result = await authorize(req, permission, { ...opts, ip: req.ip });
    if (!result.allowed) {
      res.status(403).json({ error: 'Insufficient permissions', reason: result.reason });
      return;
    }
    next();
  };
};
