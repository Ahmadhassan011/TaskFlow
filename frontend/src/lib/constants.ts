import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Settings,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import type { Role, TaskStatus } from "@/types";

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Tasks", href: "/dashboard/tasks", icon: CheckSquare },
  { label: "Team", href: "/dashboard/users", icon: Users, adminOnly: true },
  { label: "Audit Log", href: "/dashboard/audit", icon: ScrollText, adminOnly: true },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

export const ROLE_LABEL: Record<Role, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MANAGER: "Manager",
  MEMBER: "Member",
  GUEST: "Guest",
};

export const ROLE_COLORS: Record<Role, string> = {
  OWNER: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  ADMIN: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  MANAGER: "bg-primary/10 text-primary border-primary/20",
  MEMBER: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  GUEST: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

// ---------------------------------------------------------------------------
// Kanban columns
// ---------------------------------------------------------------------------

export interface KanbanColumn {
  status: TaskStatus;
  label: string;
}

export const TASK_COLUMNS: KanbanColumn[] = [
  { status: "TODO", label: "To Do" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "IN_REVIEW", label: "In Review" },
  { status: "DONE", label: "Done" },
];

// ---------------------------------------------------------------------------
// Activity action labels
// ---------------------------------------------------------------------------

export const actionLabels: Record<string, string> = {
  CREATED: "created",
  UPDATED: "updated",
  DELETED: "deleted",
  STATUS_CHANGED: "changed status of",
  ASSIGNED: "assigned",
  COMMENTED: "commented on",
  LOGIN: "logged in",
  LOGOUT: "logged out",
  REGISTERED: "registered",
  PASSWORD_CHANGED: "changed password",
  PASSWORD_RESET: "reset password",
  MEMBER_ADDED: "added a member",
  MEMBER_REMOVED: "removed a member",
  MEMBER_ROLE_CHANGED: "changed member role",
  UPLOADED: "uploaded a file",
  SUBTASK_CREATED: "added a subtask",
  SUBTASK_COMPLETED: "completed a subtask",
  SUBTASK_UNCOMPLETED: "uncompleted a subtask",
};

// ---------------------------------------------------------------------------
// Framer Motion animation variants
// ---------------------------------------------------------------------------

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};
