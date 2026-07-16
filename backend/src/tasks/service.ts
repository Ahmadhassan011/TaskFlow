import prisma from '../config/database';
import { createError } from '../middleware/error';
import { PAGINATION, TASK_STATUS_ORDER, TASK_STATUSES, PRIORITIES } from '../config/constants';
import { Prisma } from '@prisma/client';
import { logActivity } from '../activity/service';
import { createTaskAssignedNotification, createStatusChangeNotification } from '../notifications/service';

export interface TaskFilters {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  assigneeId?: string;
  projectId?: string;
  search?: string;
}

export const listTasks = async (
  userId: string,
  role: string,
  tenantId: string,
  filters: TaskFilters
) => {
  const page = filters.page || PAGINATION.DEFAULT_PAGE;
  const limit = Math.min(filters.limit || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const skip = (page - 1) * limit;

  const where: Prisma.TaskWhereInput = { tenantId };

  // Role-based filtering
  if (role === 'MEMBER') {
    where.assigneeId = userId;
  } else if (role === 'MANAGER') {
    where.project = {
      members: {
        some: { userId },
      },
    };
  } else if (role === 'GUEST') {
    const userEmail = await prisma.user
      .findUnique({ where: { id: userId }, select: { email: true } })
      .then((u) => u?.email);
    const shared = await prisma.resourceShare.findMany({
      where: {
        tenantId,
        resourceType: 'TASK',
        OR: [
          { targetType: 'USER', userId },
          ...(userEmail ? [{ targetType: 'EMAIL' as const, email: userEmail }] : []),
        ],
      },
      select: { resourceId: true },
    });
    const sharedIds = shared.map((s) => s.resourceId);
    where.OR = [
      { assigneeId: userId },
      { id: { in: sharedIds } },
    ];
  }
  // OWNER / ADMIN see all tenant tasks

  if (filters.status) {
    where.status = filters.status as typeof TASK_STATUSES[keyof typeof TASK_STATUSES];
  }

  if (filters.priority) {
    where.priority = filters.priority as typeof PRIORITIES[keyof typeof PRIORITIES];
  }

  if (filters.assigneeId) {
    where.assigneeId = filters.assigneeId;
  }

  if (filters.projectId) {
    where.projectId = filters.projectId;
  }

  if (filters.search) {
    // Combine role-based filter with search using $and to avoid
    // overwriting tenant-scope restrictions set above.
    const andFilters: Prisma.TaskWhereInput[] = [];
    if (where.OR) andFilters.push({ OR: where.OR });
    if (where.assigneeId) andFilters.push({ assigneeId: where.assigneeId });
    if (where.project) andFilters.push({ project: where.project });
    andFilters.push({
      OR: [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ],
    });
    delete where.OR;
    delete where.assigneeId;
    delete where.project;
    where.AND = andFilters;
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, slug: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        subtasks: true,
        labels: {
          include: {
            label: true,
          },
        },
        _count: {
          select: { comments: true },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.task.count({ where }),
  ]);

  return {
    data: tasks,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getTask = async (
  taskId: string,
  userId: string,
  role: string,
  tenantId: string
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        select: { id: true, name: true, slug: true },
      },
      assignee: {
        select: { id: true, name: true, email: true },
      },
      subtasks: true,
      labels: {
        include: {
          label: true,
        },
      },
      comments: {
        include: {
          author: {
            select: { id: true, name: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!task) {
    throw createError(404, 'Task not found');
  }

  if (task.tenantId !== tenantId) {
    throw createError(404, 'Task not found');
  }

  // Non-owner/admin members/guests must be assignee, project member, or sharee.
  if (role !== 'OWNER' && role !== 'ADMIN') {
    const isMember = await prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId: task.projectId } },
    });
    const share = await prisma.resourceShare.findFirst({
      where: {
        tenantId,
        resourceType: 'TASK',
        resourceId: taskId,
        OR: [
          { targetType: 'USER', userId },
          { targetType: 'EMAIL', email: (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))?.email ?? '' },
        ],
      },
    });
    if (!isMember && !share && task.assigneeId !== userId) {
      throw createError(403, 'Not authorized to view this task');
    }
  }

  return task;
};

export const createTask = async (
  data: {
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    assigneeId?: string;
    projectId: string;
    labelIds?: string[];
  },
  creatorId: string,
  tenantId: string
) => {
  // Verify project exists and belongs to the tenant
  const project = await prisma.project.findUnique({
    where: { id: data.projectId },
  });

  if (!project || project.tenantId !== tenantId) {
    throw createError(404, 'Project not found');
  }

  // Verify assignee is project member if provided
  if (data.assigneeId) {
    const assigneeMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: data.assigneeId,
          projectId: data.projectId,
        },
      },
    });

    if (!assigneeMember) {
      throw createError(400, 'Assignee must be a project member');
    }
  }

  // Verify labels exist and belong to project
  if (data.labelIds && data.labelIds.length > 0) {
    const labels = await prisma.label.findMany({
      where: {
        id: { in: data.labelIds },
        projectId: data.projectId,
        tenantId,
      },
    });

    if (labels.length !== data.labelIds.length) {
      throw createError(400, 'One or more labels not found in this project');
    }
  }

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      priority: (data.priority as typeof PRIORITIES[keyof typeof PRIORITIES]) || PRIORITIES.MEDIUM,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assigneeId: data.assigneeId,
      projectId: data.projectId,
      tenantId,
      labels: data.labelIds
        ? {
            create: data.labelIds.map((labelId) => ({
              labelId,
            })),
          }
        : undefined,
    },
    include: {
      project: {
        select: { id: true, name: true, slug: true },
      },
      assignee: {
        select: { id: true, name: true, email: true },
      },
      labels: {
        include: { label: true },
      },
    },
  });

  // Log activity
  await logActivity({
    tenantId,
    userId: creatorId,
    action: 'CREATED',
    entityType: 'TASK',
    entityId: task.id,
  });

  // Send notification to assignee
  if (task.assigneeId && task.assigneeId !== creatorId) {
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { name: true },
    });

    await createTaskAssignedNotification(
      task.id,
      task.title,
      task.assigneeId,
      creator?.name || 'Someone',
      tenantId
    );
  }

  return task;
};

export const updateTask = async (
  taskId: string,
  data: {
    title?: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    assigneeId?: string;
    labelIds?: string[];
  },
  userId?: string,
  tenantId?: string
) => {
  const existingTask = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!existingTask) {
    throw createError(404, 'Task not found');
  }

  if (tenantId && existingTask.tenantId !== tenantId) {
    throw createError(404, 'Task not found');
  }

  // Verify assignee if provided
  if (data.assigneeId) {
    const assigneeMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: data.assigneeId,
          projectId: existingTask.projectId,
        },
      },
    });

    if (!assigneeMember) {
      throw createError(400, 'Assignee must be a project member');
    }
  }

  // Handle label updates
  if (data.labelIds !== undefined) {
    // Delete existing labels
    await prisma.taskLabel.deleteMany({
      where: { taskId },
    });

    // Add new labels (must belong to the tenant's project)
    if (data.labelIds.length > 0) {
      const project = await prisma.project.findUnique({
        where: { id: existingTask.projectId },
        select: { tenantId: true },
      });
      const labels = await prisma.label.findMany({
        where: {
          id: { in: data.labelIds },
          projectId: existingTask.projectId,
          tenantId: project?.tenantId,
        },
      });
      if (labels.length !== data.labelIds.length) {
        throw createError(400, 'One or more labels not found in this project');
      }
      await prisma.taskLabel.createMany({
        data: data.labelIds.map((labelId) => ({
          taskId,
          labelId,
        })),
      });
    }
  }

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority as typeof PRIORITIES[keyof typeof PRIORITIES] | undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      assigneeId: data.assigneeId,
    },
    include: {
      project: {
        select: { id: true, name: true, slug: true },
      },
      assignee: {
        select: { id: true, name: true, email: true },
      },
      labels: {
        include: { label: true },
      },
    },
  });

  // Log activity
  if (userId && tenantId) {
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    if (data.title !== undefined) changes.title = { old: existingTask.title, new: data.title };
    if (data.description !== undefined) changes.description = { old: existingTask.description, new: data.description };
    if (data.priority !== undefined) changes.priority = { old: existingTask.priority, new: data.priority };
    if (data.assigneeId !== undefined) changes.assigneeId = { old: existingTask.assigneeId, new: data.assigneeId };

    await logActivity({
      tenantId,
      userId,
      action: 'UPDATED',
      entityType: 'TASK',
      entityId: taskId,
      changes: Object.keys(changes).length > 0 ? changes : undefined,
    });

    // Send notification to new assignee
    if (data.assigneeId && data.assigneeId !== existingTask.assigneeId && data.assigneeId !== userId) {
      const updater = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      await createTaskAssignedNotification(
        taskId,
        task.title,
        data.assigneeId,
        updater?.name || 'Someone',
        tenantId
      );
    }
  }

  return task;
};

export const updateTaskStatus = async (
  taskId: string,
  newStatus: string,
  userRole: string,
  userId?: string,
  tenantId?: string
) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw createError(404, 'Task not found');
  }

  if (tenantId && task.tenantId !== tenantId) {
    throw createError(404, 'Task not found');
  }

  // Validate status transition (only admins/owners can skip stages)
  if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
    const currentStatusIndex = TASK_STATUS_ORDER.indexOf(task.status as typeof TASK_STATUSES[keyof typeof TASK_STATUSES]);
    const newStatusIndex = TASK_STATUS_ORDER.indexOf(newStatus as typeof TASK_STATUSES[keyof typeof TASK_STATUSES]);

    if (newStatusIndex !== currentStatusIndex + 1) {
      throw createError(400, `Cannot skip stages. Current status: ${task.status}`);
    }
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { status: newStatus as typeof TASK_STATUSES[keyof typeof TASK_STATUSES] },
    include: {
      project: {
        select: { id: true, name: true, slug: true },
      },
      assignee: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Log activity
  if (userId && tenantId) {
    await logActivity({
      tenantId,
      userId,
      action: 'STATUS_CHANGED',
      entityType: 'TASK',
      entityId: taskId,
      changes: {
        status: { old: task.status, new: newStatus },
      },
    });

    // Send notification to assignee
    if (task.assigneeId && task.assigneeId !== userId) {
      const changer = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      await createStatusChangeNotification(
        taskId,
        task.title,
        task.assigneeId,
        changer?.name || 'Someone',
        newStatus,
        tenantId
      );
    }
  }

  return updatedTask;
};

export const deleteTask = async (taskId: string, userId?: string, tenantId?: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw createError(404, 'Task not found');
  }

  if (tenantId && task.tenantId !== tenantId) {
    throw createError(404, 'Task not found');
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  // Log activity
  if (userId && tenantId) {
    await logActivity({
      tenantId,
      userId,
      action: 'DELETED',
      entityType: 'TASK',
      entityId: taskId,
    });
  }

  return { message: 'Task deleted successfully' };
};

export const addSubtask = async (taskId: string, title: string, userId?: string, tenantId?: string) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw createError(404, 'Task not found');
  }

  if (tenantId && task.tenantId !== tenantId) {
    throw createError(404, 'Task not found');
  }

  const subtask = await prisma.subtask.create({
    data: {
      title,
      taskId,
    },
  });

  // Log activity
  if (userId && tenantId) {
    await logActivity({
      tenantId,
      userId,
      action: 'SUBTASK_CREATED',
      entityType: 'TASK',
      entityId: taskId,
    });
  }

  return subtask;
};

export const updateSubtask = async (
  taskId: string,
  subtaskId: string,
  isCompleted: boolean,
  userId?: string,
  tenantId?: string
) => {
  const subtask = await prisma.subtask.findFirst({
    where: {
      id: subtaskId,
      taskId,
    },
  });

  if (!subtask) {
    throw createError(404, 'Subtask not found');
  }

  const updatedSubtask = await prisma.subtask.update({
    where: { id: subtaskId },
    data: { isCompleted },
  });

  // Log activity
  if (userId && tenantId) {
    await logActivity({
      tenantId,
      userId,
      action: isCompleted ? 'SUBTASK_COMPLETED' : 'SUBTASK_UNCOMPLETED',
      entityType: 'TASK',
      entityId: taskId,
    });
  }

  return updatedSubtask;
};

export const deleteSubtask = async (taskId: string, subtaskId: string, userId?: string, tenantId?: string) => {
  const subtask = await prisma.subtask.findFirst({
    where: {
      id: subtaskId,
      taskId,
    },
  });

  if (!subtask) {
    throw createError(404, 'Subtask not found');
  }

  await prisma.subtask.delete({
    where: { id: subtaskId },
  });

  // Log activity
  if (userId && tenantId) {
    await logActivity({
      tenantId,
      userId,
      action: 'SUBTASK_DELETED',
      entityType: 'TASK',
      entityId: taskId,
    });
  }

  return { message: 'Subtask deleted successfully' };
};
