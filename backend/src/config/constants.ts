// Tenant role hierarchy: OWNER ⊃ ADMIN ⊃ MANAGER ⊃ MEMBER ⊃ GUEST
export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER',
  GUEST: 'GUEST',
} as const;

export type Permission =
  | 'tenant:read'
  | 'tenant:update'
  | 'tenant:delete'
  | 'tenant:transfer'
  | 'members:read'
  | 'members:manage'
  | 'members:invite'
  | 'roles:manage'
  | 'users:create'
  | 'users:read'
  | 'users:update'
  | 'users:delete'
  | 'projects:create'
  | 'projects:read:all'
  | 'projects:read:assigned'
  | 'projects:update'
  | 'projects:delete'
  | 'projects:members:manage'
  | 'tasks:create'
  | 'tasks:read'
  | 'tasks:update'
  | 'tasks:delete'
  | 'tasks:status:change'
  | 'labels:create'
  | 'labels:update'
  | 'labels:delete'
  | 'dashboard:view:all'
  | 'dashboard:view:own'
  | 'dashboard:workload:view'
  | 'shares:manage'
  | 'shares:read'
  | 'audit:read';

// Permission set per tenant role (no inheritance — each role lists its full grants).
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  GUEST: ['projects:read:assigned', 'tasks:read', 'dashboard:view:own'],
  MEMBER: [
    'projects:read:assigned',
    'tasks:read',
    'tasks:create',
    'tasks:update',
    'tasks:status:change',
    'dashboard:view:own',
    'shares:read',
  ],
  MANAGER: [
    'projects:read:assigned',
    'projects:create',
    'projects:update',
    'projects:delete',
    'projects:members:manage',
    'tasks:read',
    'tasks:create',
    'tasks:update',
    'tasks:delete',
    'tasks:status:change',
    'labels:create',
    'labels:update',
    'labels:delete',
    'dashboard:view:all',
    'dashboard:workload:view',
    'shares:manage',
    'shares:read',
    'members:read',
  ],
  ADMIN: [
    'tenant:read',
    'tenant:update',
    'members:read',
    'members:manage',
    'members:invite',
    'roles:manage',
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'projects:read:all',
    'projects:read:assigned',
    'projects:create',
    'projects:update',
    'projects:delete',
    'projects:members:manage',
    'tasks:read',
    'tasks:create',
    'tasks:update',
    'tasks:delete',
    'tasks:status:change',
    'labels:create',
    'labels:update',
    'labels:delete',
    'dashboard:view:all',
    'dashboard:workload:view',
    'shares:manage',
    'shares:read',
    'audit:read',
  ],
  OWNER: [
    'tenant:read',
    'tenant:update',
    'tenant:delete',
    'tenant:transfer',
    'members:read',
    'members:manage',
    'members:invite',
    'roles:manage',
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'projects:read:all',
    'projects:read:assigned',
    'projects:create',
    'projects:update',
    'projects:delete',
    'projects:members:manage',
    'tasks:read',
    'tasks:create',
    'tasks:update',
    'tasks:delete',
    'tasks:status:change',
    'labels:create',
    'labels:update',
    'labels:delete',
    'dashboard:view:all',
    'dashboard:workload:view',
    'shares:manage',
    'shares:read',
    'audit:read',
  ],
};

export const TASK_STATUSES = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  DONE: 'DONE',
} as const;

export const TASK_STATUS_ORDER = [
  TASK_STATUSES.TODO,
  TASK_STATUSES.IN_PROGRESS,
  TASK_STATUSES.IN_REVIEW,
  TASK_STATUSES.DONE,
] as const;

export const PRIORITIES = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export const PROJECT_STATUSES = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ON_HOLD: 'ON_HOLD',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const SALT_ROUNDS = 12;

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-') || 'workspace';
