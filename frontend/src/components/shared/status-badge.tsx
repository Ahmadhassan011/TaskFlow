import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskStatus, ProjectStatus, Priority } from "@/types";

const statusConfig: Record<
  TaskStatus,
  { label: string; className: string }
> = {
  TODO: {
    label: "To Do",
    className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  },
  IN_PROGRESS: {
    label: "In Progress",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  IN_REVIEW: {
    label: "In Review",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  DONE: {
    label: "Done",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
};

const projectStatusConfig: Record<
  ProjectStatus,
  { label: string; className: string }
> = {
  ACTIVE: {
    label: "Active",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  ON_HOLD: {
    label: "On Hold",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
};

const priorityConfig: Record<Priority, { label: string; className: string }> =
  {
    LOW: {
      label: "Low",
      className: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
    },
    MEDIUM: {
      label: "Medium",
      className: "bg-primary/10 text-primary border-primary/20",
    },
    HIGH: {
      label: "High",
      className: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    },
    URGENT: {
      label: "Urgent",
      className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
    },
  };

export function StatusBadge({ status }: { status: TaskStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const config = projectStatusConfig[status];
  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const config = priorityConfig[priority];
  return (
    <Badge variant="outline" className={cn("font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
