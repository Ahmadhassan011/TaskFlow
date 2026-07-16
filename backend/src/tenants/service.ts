import prisma from '../config/database';
import { Prisma } from '@prisma/client';
import { createError } from '../middleware/error';
import { ROLES, PAGINATION } from '../config/constants';
import { logActivity } from '../activity/service';
import crypto from 'crypto';

const requireMembership = async (tenantId: string, userId: string) => {
  const membership = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
  });
  if (!membership || membership.status !== 'ACTIVE') {
    throw createError(404, 'Workspace not found');
  }
  return membership;
};

export const getTenant = async (tenantId: string, userId: string) => {
  await requireMembership(tenantId, userId);

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      _count: { select: { members: true, projects: true, invites: true } },
    },
  });
  if (!tenant) {
    throw createError(404, 'Workspace not found');
  }

  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    ownerId: tenant.ownerId,
    createdAt: tenant.createdAt.toISOString(),
    memberCount: tenant._count.members,
    projectCount: tenant._count.projects,
    inviteCount: tenant._count.invites,
  };
};

export const listMyTenants = async (userId: string) => {
  const memberships = await prisma.tenantMembership.findMany({
    where: { userId, status: 'ACTIVE' },
    include: { tenant: { select: { id: true, name: true, slug: true } } },
    orderBy: { joinedAt: 'asc' },
  });
  return memberships.map((m) => ({
    id: m.tenant.id,
    name: m.tenant.name,
    slug: m.tenant.slug,
    role: m.role,
  }));
};

export const updateTenant = async (tenantId: string, userId: string, data: { name?: string }) => {
  await requireMembership(tenantId, userId);

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw createError(404, 'Workspace not found');
  }

  const updated = await prisma.tenant.update({
    where: { id: tenantId },
    data: { name: data.name ?? tenant.name },
  });

  await logActivity({
    tenantId,
    userId,
    action: 'TENANT_UPDATED',
    entityType: 'TENANT',
    entityId: tenantId,
  });

  return { id: updated.id, name: updated.name, slug: updated.slug };
};

export const deleteTenant = async (tenantId: string, userId: string) => {
  await requireMembership(tenantId, userId);

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw createError(404, 'Workspace not found');
  }

  // Cascade deletes all tenant data (projects, tasks, members, shares, audit).
  await prisma.tenant.delete({ where: { id: tenantId } });

  await logActivity({
    tenantId,
    userId,
    action: 'TENANT_DELETED',
    entityType: 'TENANT',
    entityId: tenantId,
  });

  return { message: 'Workspace deleted successfully' };
};

export const listMembers = async (tenantId: string, userId: string, page = 1, limit = 50) => {
  await requireMembership(tenantId, userId);

  const skip = (page - 1) * limit;
  const [members, total] = await Promise.all([
    prisma.tenantMembership.findMany({
      where: { tenantId },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true, isActive: true },
        },
      },
      skip,
      take: limit,
      orderBy: { joinedAt: 'asc' },
    }),
    prisma.tenantMembership.count({ where: { tenantId } }),
  ]);

  return {
    members: members.map((m) => ({
      userId: m.user.id,
      email: m.user.email,
      name: m.user.name,
      avatar: m.user.avatar,
      isActive: m.user.isActive,
      role: m.role,
      status: m.status,
      joinedAt: m.joinedAt.toISOString(),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

// SoD: only an OWNER can grant the OWNER role; ADMINs manage other roles.
export const updateMemberRole = async (
  tenantId: string,
  memberUserId: string,
  newRole: string,
  callerId: string
) => {
  const caller = await requireMembership(tenantId, callerId);

  if (newRole === 'OWNER' && caller.role !== 'OWNER') {
    throw createError(403, 'Only an owner can assign the owner role');
  }
  if (caller.role !== 'OWNER' && caller.role !== 'ADMIN') {
    throw createError(403, 'Insufficient permissions to change roles');
  }

  const target = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId: memberUserId, tenantId } },
  });
  if (!target) {
    throw createError(404, 'Member not found in workspace');
  }

  // SoD: cannot demote the last OWNER.
  if (target.role === 'OWNER' && newRole !== 'OWNER') {
    const ownerCount = await prisma.tenantMembership.count({ where: { tenantId, role: 'OWNER' } });
    if (ownerCount <= 1) {
      throw createError(400, 'Cannot change the role of the last owner');
    }
  }

  const updated = await prisma.tenantMembership.update({
    where: { userId_tenantId: { userId: memberUserId, tenantId } },
    data: { role: newRole as typeof ROLES[keyof typeof ROLES] },
  });

  await logActivity({
    tenantId,
    userId: callerId,
    action: 'MEMBER_ROLE_CHANGED',
    entityType: 'TENANT',
    entityId: tenantId,
    changes: { role: { old: target.role, new: newRole } },
  });

  return { userId: memberUserId, role: updated.role };
};

export const removeMember = async (tenantId: string, memberUserId: string, callerId: string) => {
  const caller = await requireMembership(tenantId, callerId);

  if (memberUserId === callerId) {
    throw createError(400, 'Cannot remove yourself from the workspace');
  }
  if (caller.role !== 'OWNER' && caller.role !== 'ADMIN') {
    throw createError(403, 'Insufficient permissions');
  }

  const target = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId: memberUserId, tenantId } },
  });
  if (!target) {
    throw createError(404, 'Member not found in workspace');
  }

  // SoD: cannot remove the last OWNER.
  if (target.role === 'OWNER') {
    const ownerCount = await prisma.tenantMembership.count({ where: { tenantId, role: 'OWNER' } });
    if (ownerCount <= 1) {
      throw createError(400, 'Cannot remove the last owner of the workspace');
    }
  }

  await prisma.tenantMembership.delete({
    where: { userId_tenantId: { userId: memberUserId, tenantId } },
  });

  await logActivity({
    tenantId,
    userId: callerId,
    action: 'MEMBER_REMOVED',
    entityType: 'TENANT',
    entityId: tenantId,
  });

  return { message: 'Member removed from workspace' };
};

export const createInvite = async (
  tenantId: string,
  email: string,
  role: string,
  callerId: string
) => {
  const caller = await requireMembership(tenantId, callerId);

  if (role === 'OWNER' && caller.role !== 'OWNER') {
    throw createError(403, 'Only an owner can invite an owner');
  }
  if (caller.role !== 'OWNER' && caller.role !== 'ADMIN') {
    throw createError(403, 'Insufficient permissions to invite');
  }

  const existing = await prisma.invitation.findFirst({
    where: { tenantId, email, acceptedAt: null, expiresAt: { gt: new Date() } },
  });
  if (existing) {
    throw createError(409, 'An active invitation already exists for this email');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invite = await prisma.invitation.create({
    data: {
      tenantId,
      email,
      role: (role as typeof ROLES[keyof typeof ROLES]) || ROLES.MEMBER,
      token,
      expiresAt,
      invitedById: callerId,
    },
  });

  await logActivity({
    tenantId,
    userId: callerId,
    action: 'INVITED',
    entityType: 'TENANT',
    entityId: tenantId,
  });

  // In production, email the invitation link with `token`.
  console.log(`Invitation for ${email} to workspace ${tenantId}: token=${token}`);

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    expiresAt: invite.expiresAt.toISOString(),
  };
};

export const listInvites = async (tenantId: string, userId: string) => {
  await requireMembership(tenantId, userId);

  const invites = await prisma.invitation.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  return invites.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    acceptedAt: i.acceptedAt?.toISOString() ?? null,
    expiresAt: i.expiresAt.toISOString(),
  }));
};

export const listAuditLogs = async (
  tenantId: string,
  userId: string,
  options: { page?: number; limit?: number; action?: string; decision?: 'ALLOW' | 'DENY' } = {}
) => {
  await requireMembership(tenantId, userId);

  const page = options.page || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(options.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = { tenantId };
  if (options.action) where.action = options.action;
  if (options.decision) where.decision = options.decision;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

export const acceptInvite = async (token: string, userId: string) => {
  const invite = await prisma.invitation.findUnique({ where: { token } });
  if (!invite) {
    throw createError(404, 'Invitation not found');
  }
  if (invite.acceptedAt) {
    throw createError(400, 'Invitation already accepted');
  }
  if (invite.expiresAt < new Date()) {
    throw createError(400, 'Invitation expired');
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw createError(404, 'User not found');
  }
  if (user.email !== invite.email) {
    throw createError(403, 'This invitation is for a different email address');
  }

  const existing = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId, tenantId: invite.tenantId } },
  });
  if (existing) {
    throw createError(409, 'Already a member of this workspace');
  }

  await prisma.tenantMembership.create({
    data: {
      userId,
      tenantId: invite.tenantId,
      role: invite.role,
      status: 'ACTIVE',
      invitedById: invite.invitedById,
    },
  });
  await prisma.invitation.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });

  await logActivity({
    tenantId: invite.tenantId,
    userId,
    action: 'INVITE_ACCEPTED',
    entityType: 'TENANT',
    entityId: invite.tenantId,
  });

  return { tenantId: invite.tenantId, role: invite.role };
};

export const listShares = async (
  tenantId: string,
  userId: string,
  resourceType?: string,
  resourceId?: string
) => {
  await requireMembership(tenantId, userId);

  const where: Record<string, unknown> = { tenantId };
  if (resourceType) where.resourceType = resourceType;
  if (resourceId) where.resourceId = resourceId;

  const shares = await prisma.resourceShare.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return shares.map((s) => ({
    id: s.id,
    resourceType: s.resourceType,
    resourceId: s.resourceId,
    targetType: s.targetType,
    userId: s.userId,
    email: s.email,
    access: s.access,
    createdAt: s.createdAt.toISOString(),
  }));
};

export const createShare = async (
  tenantId: string,
  resourceType: string,
  resourceId: string,
  targetType: 'USER' | 'EMAIL',
  target: string,
  access: 'VIEW' | 'EDIT' | 'MANAGE',
  callerId: string
) => {
  await requireMembership(tenantId, callerId);

  // The shared resource must belong to the tenant.
  if (resourceType === 'PROJECT') {
    const r = await prisma.project.findUnique({ where: { id: resourceId }, select: { tenantId: true } });
    if (!r || r.tenantId !== tenantId) {
      throw createError(404, 'Project not found');
    }
  } else if (resourceType === 'TASK') {
    const r = await prisma.task.findUnique({ where: { id: resourceId }, select: { tenantId: true } });
    if (!r || r.tenantId !== tenantId) {
      throw createError(404, 'Task not found');
    }
  } else {
    throw createError(400, 'Unsupported resource type');
  }

  const share = await prisma.resourceShare.create({
    data: {
      tenantId,
      resourceType,
      resourceId,
      targetType,
      userId: targetType === 'USER' ? target : null,
      email: targetType === 'EMAIL' ? target : null,
      access,
      createdById: callerId,
    },
  });

  await logActivity({
    tenantId,
    userId: callerId,
    action: 'SHARE_CREATED',
    entityType: resourceType,
    entityId: resourceId,
  });

  return { id: share.id, resourceType, resourceId, targetType, access };
};

export const deleteShare = async (tenantId: string, shareId: string, callerId: string) => {
  await requireMembership(tenantId, callerId);

  const share = await prisma.resourceShare.findUnique({ where: { id: shareId } });
  if (!share || share.tenantId !== tenantId) {
    throw createError(404, 'Share not found');
  }

  await prisma.resourceShare.delete({ where: { id: shareId } });

  await logActivity({
    tenantId,
    userId: callerId,
    action: 'SHARE_DELETED',
    entityType: share.resourceType,
    entityId: share.resourceId,
  });

  return { message: 'Share removed' };
};
