import { FolderX, Inbox, CheckSquare } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: "projects" | "tasks" | "default";
  action?: React.ReactNode;
}

const icons = {
  projects: FolderX,
  tasks: CheckSquare,
  default: Inbox,
};

export function EmptyState({
  title,
  description,
  icon = "default",
  action,
}: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted/50">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-base font-medium">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
