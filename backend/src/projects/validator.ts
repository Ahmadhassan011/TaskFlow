import { z } from 'zod';
import { dateString } from '../validators/common';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string().optional(),
    startDate: dateString,
    endDate: dateString.optional(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD']).optional(),
  }),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    startDate: dateString.optional(),
    endDate: dateString.optional(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD']).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
});

export const getProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
});

export const listProjectsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    status: z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD']).optional(),
    search: z.string().optional(),
  }),
});

export const addMemberSchema = z.object({
  body: z.object({
    userId: z.string().uuid('Invalid user ID'),
    role: z.enum(['member', 'manager']).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
  }),
});

export const updateMemberRoleSchema = z.object({
  body: z.object({
    role: z.enum(['member', 'manager']),
  }),
  params: z.object({
    id: z.string().uuid('Invalid project ID'),
    memberId: z.string().uuid('Invalid member ID'),
  }),
});
