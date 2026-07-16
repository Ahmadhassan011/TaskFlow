import prisma from '../config/database';
import { Prisma } from '@prisma/client';

export const getDashboardStats = async (userId: string, role: string, tenantId: string) => {
  const projectWhere: Prisma.ProjectWhereInput = { tenantId };
  const taskWhere: Prisma.TaskWhereInput = { tenantId };

  const isPrivileged = role === 'OWNER' || role === 'ADMIN';

  if (role === 'MANAGER') {
    projectWhere.members = {
      some: { userId, role: 'manager' },
    };
    taskWhere.project = projectWhere;
  } else if (role === 'MEMBER' || role === 'GUEST') {
    // Members/guests see only the projects they belong to and the tasks assigned to them
    projectWhere.members = {
      some: { userId },
    };
    taskWhere.assigneeId = userId;
  }
  // OWNER / ADMIN see everything in the tenant

  const [
    totalProjects,
    totalTasks,
    completedTasks,
    overdueTasks,
    totalUsers,
    tasksByStatus,
    upcomingDeadlines,
    teamWorkload,
  ] = await Promise.all([
    // Total projects
    prisma.project.count({
      where: projectWhere,
    }),

    // Total tasks
    prisma.task.count({
      where: taskWhere,
    }),

    // Completed tasks
    prisma.task.count({
      where: {
        ...taskWhere,
        status: 'DONE',
      },
    }),

    // Overdue tasks (due date passed, not done)
    prisma.task.count({
      where: {
        ...taskWhere,
        dueDate: { lt: new Date() },
        status: { not: 'DONE' },
      },
    }),

    // Total users (privileged roles only) — tenant member count
    isPrivileged
      ? prisma.tenantMembership.count({ where: { tenantId } })
      : Promise.resolve(0),

    // Tasks by status
    prisma.task.groupBy({
      by: ['status'],
      where: taskWhere,
      _count: true,
    }),

    // Upcoming deadlines (next 7 days)
    prisma.task.findMany({
      where: {
        ...taskWhere,
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        status: { not: 'DONE' },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        priority: true,
        project: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),

    // Team workload (privileged / manager only)
    isPrivileged || role === 'MANAGER'
      ? prisma.task.groupBy({
          by: ['assigneeId'],
          where: {
            ...taskWhere,
            assigneeId: { not: null },
          },
          _count: true,
        })
      : Promise.resolve([]),
  ]);

  // Format tasks by status
  const statusDistribution = {
    TODO: 0,
    IN_PROGRESS: 0,
    IN_REVIEW: 0,
    DONE: 0,
  };

  tasksByStatus.forEach((item) => {
    statusDistribution[item.status as keyof typeof statusDistribution] = item._count;
  });

  // Get team workload with user details
  let workloadWithUsers: { user: { id: string; name: string; email: string } | undefined; taskCount: number }[] = [];
  if (teamWorkload.length > 0) {
    const assigneeIds = teamWorkload
      .map((w) => w.assigneeId)
      .filter((id): id is string => id !== null);

    const users = await prisma.user.findMany({
      where: { id: { in: assigneeIds } },
      select: { id: true, name: true, email: true },
    });

    workloadWithUsers = teamWorkload.map((w) => ({
      user: users.find((u) => u.id === w.assigneeId),
      taskCount: w._count,
    }));
  }

  // Return the shape the frontend DashboardStats type expects
  // (top-level fields, `recentDeadlines` key).
  return {
    totalProjects,
    totalTasks,
    completedTasks,
    overdueTasks,
    myTasks: role === 'MEMBER' ? totalTasks : 0,
    statusDistribution,
    recentDeadlines: upcomingDeadlines,
    teamWorkload: workloadWithUsers,
  };
};

export const getTaskCompletionTrend = async (
  userId: string,
  role: string,
  tenantId: string,
  days: number = 30
) => {
  const where: Prisma.TaskWhereInput = {
    status: 'DONE',
    tenantId,
    updatedAt: {
      gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
    },
  };

  if (role === 'MANAGER') {
    where.project = {
      members: {
        some: { userId, role: 'manager' },
      },
    };
  } else if (role === 'MEMBER' || role === 'GUEST') {
    where.assigneeId = userId;
  }

  // Get completed tasks grouped by day
  const tasks = await prisma.task.findMany({
    where,
    select: {
      updatedAt: true,
    },
  });

  // Group by date
  const trend: Record<string, number> = {};
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    trend[dateStr] = 0;
  }

  tasks.forEach((task) => {
    const dateStr = task.updatedAt.toISOString().split('T')[0];
    if (trend[dateStr] !== undefined) {
      trend[dateStr]++;
    }
  });

  return Object.entries(trend).map(([date, count]) => ({
    date,
    count,
  }));
};
