import prisma from '../config/database';
import { createError } from '../middleware/error';
import { PAGINATION, PROJECT_STATUSES, slugify } from '../config/constants';
import { Prisma } from '@prisma/client';
import { logActivity } from '../activity/service';

export interface ProjectFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export const listProjects = async (
  userId: string,
  role: string,
  tenantId: string,
  filters: ProjectFilters
) => {
  const page = filters.page || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(filters.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const where: Prisma.ProjectWhereInput = { tenantId };

  // Owners/Admins see all tenant projects; others see member/shared projects.
  if (role !== 'OWNER' && role !== 'ADMIN') {
    const userEmail = await prisma.user
      .findUnique({ where: { id: userId }, select: { email: true } })
      .then((u) => u?.email);

    const shared = await prisma.resourceShare.findMany({
      where: {
        tenantId,
        resourceType: 'PROJECT',
        OR: [
          { targetType: 'USER', userId },
          ...(userEmail ? [{ targetType: 'EMAIL' as const, email: userEmail }] : []),
        ],
      },
      select: { resourceId: true },
    });
    const sharedIds = shared.map((s) => s.resourceId);

    where.OR = [
      { members: { some: { userId } } },
      { id: { in: sharedIds } },
    ];
  }

  if (filters.status) {
    where.status = filters.status as typeof PROJECT_STATUSES[keyof typeof PROJECT_STATUSES];
  }

  if (filters.search) {
    // Combine membership filter with search using $and to avoid
    // overwriting tenant-scope restrictions set above.
    const andFilters: Prisma.ProjectWhereInput[] = [
      { OR: where.OR as Prisma.ProjectWhereInput[] },
    ];
    if (where.status) andFilters.push({ status: where.status });
    andFilters.push({
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ],
    });
    delete where.OR;
    delete where.status;
    where.AND = andFilters;
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { members: true, tasks: true },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.project.count({ where }),
  ]);

  return {
    data: projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getProject = async (
  projectId: string,
  userId: string,
  role: string,
  tenantId: string
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      },
      _count: {
        select: { tasks: true },
      },
    },
  });

  if (!project) {
    throw createError(404, 'Project not found');
  }

  // Tenant isolation
  if (project.tenantId !== tenantId) {
    throw createError(404, 'Project not found');
  }

  // Owners/Admins bypass; others must be a member or hold a resource share.
  if (role !== 'OWNER' && role !== 'ADMIN') {
    const isMember = project.members.some((m) => m.userId === userId);
    const share = await prisma.resourceShare.findFirst({
      where: {
        tenantId,
        resourceType: 'PROJECT',
        resourceId: projectId,
        OR: [
          { targetType: 'USER', userId },
          { targetType: 'EMAIL', email: (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email ?? '' },
        ],
      },
    });
    if (!isMember && !share) {
      throw createError(403, 'Not a member of this project');
    }
  }

  return project;
};

export const createProject = async (
  ownerId: string,
  tenantId: string,
  data: {
    name: string;
    description?: string;
    startDate: string;
    endDate?: string;
    status?: string;
  }
) => {
  // Generate slug
  let slug = slugify(data.name);
  const existingSlug = await prisma.project.findUnique({ where: { slug } });
  if (existingSlug) {
    slug = `${slug}-${Date.now()}`;
  }

  // Create project with owner as member
  const project = await prisma.project.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: (data.status as typeof PROJECT_STATUSES[keyof typeof PROJECT_STATUSES]) || PROJECT_STATUSES.ACTIVE,
      ownerId,
      tenantId,
      members: {
        create: {
          userId: ownerId,
          role: 'manager',
        },
      },
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
      members: true,
    },
  });

  // Log activity
  await logActivity({
    tenantId,
    userId: ownerId,
    action: 'CREATED',
    entityType: 'PROJECT',
    entityId: project.id,
  });

  return project;
};

export const updateProject = async (
  projectId: string,
  userId: string,
  role: string,
  tenantId: string,
  data: {
    name?: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }
) => {
  // Check project exists
  const existingProject = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!existingProject) {
    throw createError(404, 'Project not found');
  }

  if (existingProject.tenantId !== tenantId) {
    throw createError(404, 'Project not found');
  }

  // Check ownership (admin/owner or owner/manager)
  if (role !== 'OWNER' && role !== 'ADMIN') {
    const membership = existingProject.members.find((m) => m.userId === userId);
    if (!membership || membership.role !== 'manager') {
      throw createError(403, 'Only project managers can update');
    }
  }

  const project = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      status: data.status as typeof PROJECT_STATUSES[keyof typeof PROJECT_STATUSES] | undefined,
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Log activity
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  if (data.name !== undefined) changes.name = { old: existingProject.name, new: data.name };
  if (data.description !== undefined) changes.description = { old: existingProject.description, new: data.description };
  if (data.status !== undefined) changes.status = { old: existingProject.status, new: data.status };

  await logActivity({
    tenantId,
    userId,
    action: 'UPDATED',
    entityType: 'PROJECT',
    entityId: projectId,
    changes: Object.keys(changes).length > 0 ? changes : undefined,
  });

  return project;
};

export const deleteProject = async (
  projectId: string,
  userId: string,
  role: string,
  tenantId: string
) => {
  // Check project exists
  const existingProject = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!existingProject) {
    throw createError(404, 'Project not found');
  }

  if (existingProject.tenantId !== tenantId) {
    throw createError(404, 'Project not found');
  }

  // Check ownership
  if (role !== 'OWNER' && role !== 'ADMIN') {
    const membership = existingProject.members.find((m) => m.userId === userId);
    if (!membership || membership.role !== 'manager') {
      throw createError(403, 'Only project managers can delete');
    }
  }

  await prisma.project.delete({
    where: { id: projectId },
  });

  // Log activity
  await logActivity({
    tenantId,
    userId,
    action: 'DELETED',
    entityType: 'PROJECT',
    entityId: projectId,
  });

  return { message: 'Project deleted successfully' };
};

export const addMember = async (
  projectId: string,
  userId: string,
  tenantId: string,
  role: string = 'member',
  callerId?: string
) => {
  // Check project exists and belongs to the tenant
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.tenantId !== tenantId) {
    throw createError(404, 'Project not found');
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw createError(404, 'User not found');
  }

  // The added user must belong to the same tenant
  const tenantMembership = await prisma.tenantMembership.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
  });
  if (!tenantMembership) {
    throw createError(400, 'User is not a member of this workspace');
  }

  // Check if already a member
  const existingMember = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId,
      },
    },
  });

  if (existingMember) {
    throw createError(409, 'User is already a member');
  }

  const member = await prisma.projectMember.create({
    data: {
      userId,
      projectId,
      role,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Log activity
  if (callerId) {
    await logActivity({
      tenantId,
      userId: callerId,
      action: 'MEMBER_ADDED',
      entityType: 'PROJECT',
      entityId: projectId,
    });
  }

  return member;
};

export const removeMember = async (
  projectId: string,
  memberId: string,
  tenantId: string,
  callerId?: string
) => {
  // Check membership exists
  const membership = await prisma.projectMember.findUnique({
    where: { id: memberId },
  });

  if (!membership) {
    throw createError(404, 'Member not found');
  }

  await prisma.projectMember.delete({
    where: { id: memberId },
  });

  // Log activity
  if (callerId) {
    await logActivity({
      tenantId,
      userId: callerId,
      action: 'MEMBER_REMOVED',
      entityType: 'PROJECT',
      entityId: projectId,
    });
  }

  return { message: 'Member removed successfully' };
};

export const updateMemberRole = async (
  projectId: string,
  memberId: string,
  newRole: string,
  tenantId: string,
  callerId?: string
) => {
  const membership = await prisma.projectMember.findUnique({
    where: { id: memberId },
  });

  if (!membership) {
    throw createError(404, 'Member not found');
  }

  if (membership.projectId !== projectId) {
    throw createError(400, 'Member does not belong to this project');
  }

  const oldRole = membership.role;

  const updatedMember = await prisma.projectMember.update({
    where: { id: memberId },
    data: { role: newRole },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Log activity
  if (callerId) {
    await logActivity({
      tenantId,
      userId: callerId,
      action: 'MEMBER_ROLE_CHANGED',
      entityType: 'PROJECT',
      entityId: projectId,
      changes: {
        role: { old: oldRole, new: newRole },
      },
    });
  }

  return updatedMember;
};
