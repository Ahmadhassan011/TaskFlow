// Tenant (workspace) role hierarchy: OWNER > ADMIN > MANAGER > MEMBER > GUEST
export type Role = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "GUEST";

export type ProjectStatus = "ACTIVE" | "COMPLETED" | "ON_HOLD";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  isVerified: boolean;
  avatar: string | null;
  createdAt: string;
  updatedAt: string;
  tenantId?: string | null;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  tenantId: string;
}

// A workspace the current user belongs to (shape returned by GET /api/tenants).
export interface UserTenant {
  id: string;
  name: string;
  slug: string;
  role: Role;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  ownerId: string;
  owner: User;
  members?: ProjectMember[];
  _count?: { tasks: number; members: number };
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  role: "member" | "manager";
  userId: string;
  user: User;
  projectId: string;
  joinedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  projectId: string;
  assigneeId: string | null;
  assignee?: User | null;
  project?: Project;
  subtasks?: Subtask[];
  comments?: Comment[];
  labels?: Label[];
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  taskId: string;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  author: User;
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  projectId: string;
}

export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  taskId: string;
  uploadedById: string;
  uploadedBy?: User;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: "ASSIGNED" | "COMMENTED" | "DUE_SOON" | "STATUS_CHANGED";
  message: string;
  read: boolean;
  link: string | null;
  userId: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  myTasks: number;
  statusDistribution: Record<TaskStatus, number>;
  recentDeadlines: Task[];
  teamWorkload: { user: User; taskCount: number }[];
}

export interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: Record<string, unknown> | null;
  userId: string;
  user?: User;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  memberCount?: number;
  projectCount?: number;
  inviteCount?: number;
}

export interface TenantMember {
  userId: string;
  email: string;
  name: string;
  avatar: string | null;
  isActive: boolean;
  role: Role;
  status: string;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  acceptedAt: string | null;
  expiresAt: string;
}

export interface ResourceShare {
  id: string;
  resourceType: string;
  resourceId: string;
  targetType: "USER" | "EMAIL";
  userId?: string | null;
  email?: string | null;
  access: "VIEW" | "EDIT" | "MANAGE";
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actorId: string;
  actorRole: Role;
  actor?: { id: string; name: string; email: string } | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  decision: "ALLOW" | "DENY";
  reason: string | null;
  ipAddress?: string | null;
  createdAt: string;
}
