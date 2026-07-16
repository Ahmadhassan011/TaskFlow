import { z } from 'zod';

export const listTenantsSchema = z.object({
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const getTenantSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid workspace ID') }),
});

export const updateTenantSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid workspace ID') }),
  body: z.object({ name: z.string().min(2, 'Name must be at least 2 characters') }),
});

export const listMembersSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid workspace ID') }),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});

export const updateMemberRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid workspace ID'),
    userId: z.string().uuid('Invalid user ID'),
  }),
  body: z.object({
    role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'GUEST']),
  }),
});

export const removeMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid workspace ID'),
    userId: z.string().uuid('Invalid user ID'),
  }),
});

export const createInviteSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid workspace ID') }),
  body: z.object({
    email: z.string().email('Invalid email format'),
    role: z.enum(['OWNER', 'ADMIN', 'MANAGER', 'MEMBER', 'GUEST']).optional(),
  }),
});

export const listInvitesSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid workspace ID') }),
});

export const listAuditLogsSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid workspace ID') }),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    action: z.string().optional(),
    decision: z.enum(['ALLOW', 'DENY']).optional(),
  }),
});

export const acceptInviteSchema = z.object({
  body: z.object({ token: z.string().min(1, 'Invitation token is required') }),
});

export const listSharesSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid workspace ID') }),
  query: z.object({
    resourceType: z.enum(['PROJECT', 'TASK']).optional(),
    resourceId: z.string().optional(),
  }),
});

export const createShareSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid workspace ID') }),
  body: z.object({
    resourceType: z.enum(['PROJECT', 'TASK']),
    resourceId: z.string().min(1, 'Resource ID is required'),
    targetType: z.enum(['USER', 'EMAIL']),
    target: z.string().min(1, 'Target (userId or email) is required'),
    access: z.enum(['VIEW', 'EDIT', 'MANAGE']),
  }),
});

export const deleteShareSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid workspace ID'),
    shareId: z.string().uuid('Invalid share ID'),
  }),
});
