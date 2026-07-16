import bcrypt from 'bcrypt';
import prisma from '../config/database';
import { createError } from '../middleware/error';
import { PAGINATION, ROLES, SALT_ROUNDS } from '../config/constants';
import { Prisma } from '@prisma/client';
import { logActivity } from '../activity/service';

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  tenantId: string;
}

export interface TenantMember {
  id: string;
  email: string;
  name: string;
  role: string; // tenant role
  isActive: boolean;
  avatar: string | null;
  createdAt: string;
  membershipId: string;
  status: string;
  assignedTasks: number;
}

export const listUsers = async (filters: UserFilters): Promise<{ data: TenantMember[]; pagination: object }> => {
  const page = filters.page || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(filters.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const where: Prisma.TenantMembershipWhereInput = { tenantId: filters.tenantId };
  if (filters.role) where.role = filters.role as typeof ROLES[keyof typeof ROLES];
  if (filters.search) {
    where.user = {
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ],
    };
  }

  const [members, total] = await Promise.all([
    prisma.tenantMembership.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            avatar: true,
            createdAt: true,
            _count: { select: { assignedTasks: true } },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { joinedAt: 'desc' },
    }),
    prisma.tenantMembership.count({ where }),
  ]);

  const data: TenantMember[] = members.map((m) => ({
    id: m.user.id,
    email: m.user.email,
    name: m.user.name,
    role: m.role,
    isActive: m.user.isActive,
    avatar: m.user.avatar,
    createdAt: m.user.createdAt.toISOString(),
    membershipId: m.id,
    status: m.status,
    assignedTasks: m.user._count.assignedTasks,
  }));

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getUser = async (userId: string, tenantId: string) => {
  const membership = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          avatar: true,
          createdAt: true,
          _count: { select: { assignedTasks: true } },
        },
      },
    },
  });

  if (!membership) {
    throw createError(404, 'User not found in this workspace');
  }

  const u = membership.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: membership.role,
    isActive: u.isActive,
    avatar: u.avatar,
    createdAt: u.createdAt.toISOString(),
    membershipId: membership.id,
    status: membership.status,
    assignedTasks: u._count.assignedTasks,
  };
};

/**
 * Creates a user (if needed) and adds them as a member of the active tenant.
 * This is the backend behind the "Add Team Member" flow.
 */
export const createUser = async (
  email: string,
  name: string,
  password: string,
  role?: string,
  tenantId?: string,
  callerId?: string
) => {
  if (!tenantId) {
    throw createError(400, 'A workspace context is required to add a member');
  }

  const existingMembership = await prisma.tenantMembership.findFirst({
    where: { tenantId, user: { email } },
  });
  if (existingMembership) {
    throw createError(409, 'User is already a member of this workspace');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name,
      password: hashedPassword,
      role: (role as typeof ROLES[keyof typeof ROLES]) || ROLES.MEMBER,
      isVerified: true,
    },
    select: { id: true, email: true, name: true, role: true, isActive: true, avatar: true, createdAt: true },
  });

  await prisma.tenantMembership.create({
    data: {
      userId: user.id,
      tenantId,
      role: (role as typeof ROLES[keyof typeof ROLES]) || ROLES.MEMBER,
      status: 'ACTIVE',
      invitedById: callerId,
    },
  });

  if (callerId) {
    await logActivity({
      tenantId,
      userId: callerId,
      action: 'MEMBER_ADDED',
      entityType: 'USER',
      entityId: user.id,
    });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: (role as typeof ROLES[keyof typeof ROLES]) || ROLES.MEMBER,
    isActive: user.isActive,
    avatar: user.avatar,
    createdAt: user.createdAt.toISOString(),
  };
};

export const updateUser = async (
  userId: string,
  data: {
    name?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
  },
  tenantId: string,
  callerId?: string
) => {
  const membership = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
  });
  if (!membership) {
    throw createError(404, 'User not found in this workspace');
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (data.email && currentUser && data.email !== currentUser.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email: data.email } });
    if (emailTaken) throw createError(409, 'Email already in use');
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: data.name, email: data.email, isActive: data.isActive },
    select: { id: true, email: true, name: true, role: true, isActive: true, avatar: true, createdAt: true },
  });

  // Role change updates the tenant membership (SoD enforced at the route layer)
  if (data.role) {
    await prisma.tenantMembership.update({
      where: { userId_tenantId: { userId, tenantId } },
      data: { role: data.role as typeof ROLES[keyof typeof ROLES] },
    });
  }

  if (callerId) {
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    if (data.role !== undefined) changes.role = { old: membership.role, new: data.role };
    if (data.isActive !== undefined) changes.isActive = { old: user.isActive, new: data.isActive };

    await logActivity({
      tenantId,
      userId: callerId,
      action: 'UPDATED',
      entityType: 'USER',
      entityId: userId,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
    });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: (data.role as typeof ROLES[keyof typeof ROLES]) || membership.role,
    isActive: user.isActive,
    avatar: user.avatar,
    createdAt: user.createdAt.toISOString(),
  };
};

export const deleteUser = async (userId: string, tenantId: string, currentUserId: string) => {
  if (userId === currentUserId) {
    throw createError(400, 'Cannot remove yourself from the workspace');
  }

  const membership = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
  });
  if (!membership) {
    throw createError(404, 'User not found in this workspace');
  }

  // SoD: cannot remove the last OWNER of a tenant.
  if (membership.role === 'OWNER') {
    const ownerCount = await prisma.tenantMembership.count({ where: { tenantId, role: 'OWNER' } });
    if (ownerCount <= 1) {
      throw createError(400, 'Cannot remove the last owner of the workspace');
    }
  }

  await prisma.tenantMembership.delete({
    where: { userId_tenantId: { userId, tenantId } },
  });

  await logActivity({
    tenantId,
    userId: currentUserId,
    action: 'MEMBER_REMOVED',
    entityType: 'USER',
    entityId: userId,
  });

  return { message: 'Member removed from workspace successfully' };
};
