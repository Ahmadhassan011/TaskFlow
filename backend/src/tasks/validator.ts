import { z } from 'zod';
import { dateString } from '../validators/common';

export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Task title is required'),
    description: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    dueDate: dateString.optional(),
    assigneeId: z.string().uuid().optional(),
    projectId: z.string().uuid('Invalid project ID'),
    labelIds: z.array(z.string().uuid()).optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    dueDate: dateString.optional(),
    assigneeId: z.string().uuid().optional(),
    labelIds: z.array(z.string().uuid()).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
});

export const updateTaskStatusSchema = z.object({
  body: z.object({
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']),
  }),
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
});

export const getTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID'),
  }),
});

export const listTasksSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    assigneeId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    search: z.string().optional(),
  }),
});

export const createSubtaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Subtask title is required'),
  }),
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
  }),
});

export const updateSubtaskSchema = z.object({
  body: z.object({
    isCompleted: z.boolean(),
  }),
  params: z.object({
    taskId: z.string().uuid('Invalid task ID'),
    subtaskId: z.string().uuid('Invalid subtask ID'),
  }),
});
