"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { apiClient, extractErrorMessage } from "@/lib/api";
import { CreateTaskDialog } from "@/components/shared/create-task-dialog";
import { SearchInput } from "@/components/shared/search-input";
import { KanbanBoard } from "@/components/shared/kanban-board";
import { EmptyState } from "@/components/shared/empty-state";
import { useDebounce } from "@/hooks/use-debounce";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { TASK_COLUMNS, containerVariants, itemVariants } from "@/lib/constants";
import type { Task, TaskStatus, Priority, PaginatedResponse } from "@/types";

type FilterPriority = "ALL" | Priority;

const priorityFilters: { label: string; value: FilterPriority }[] = [
  { label: "All", value: "ALL" },
  { label: "Low", value: "LOW" },
  { label: "Medium", value: "MEDIUM" },
  { label: "High", value: "HIGH" },
  { label: "Urgent", value: "URGENT" },
];

export default function TasksPage() {
  const { user, tenantId } = useAuth();
  const reducedMotion = useReducedMotion();
  const canCreateTask = user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [priorityFilter, setPriorityFilter] = useState<FilterPriority>("ALL");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await apiClient.get<PaginatedResponse<Task>>(
        `/tasks?${params}`
      );
      setTasks(res.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, tenantId]);

  const filteredTasks = tasks.filter(
    (t) => priorityFilter === "ALL" || t.priority === priorityFilter
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleTaskMoved = async (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await apiClient.patch(`/tasks/${taskId}/status`, { status: newStatus });
      toast.success("Task moved");
    } catch {
      fetchTasks();
      toast.error("Failed to move task");
    }
  };

  return (
    <motion.div
      variants={reducedMotion ? undefined : containerVariants}
      initial={reducedMotion ? false : "hidden"}
      animate="visible"
      className="space-y-6"
    >
      <motion.div
        variants={reducedMotion ? undefined : itemVariants}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Track and manage your tasks. Drag to change status.
          </p>
        </div>
        {canCreateTask && <CreateTaskDialog onCreated={() => fetchTasks()} />}
      </motion.div>

      <motion.div variants={reducedMotion ? undefined : itemVariants}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search tasks..."
        />
      </motion.div>

      <motion.div variants={reducedMotion ? undefined : itemVariants} className="flex flex-wrap gap-1" role="tablist" aria-label="Filter tasks by priority">
        {priorityFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setPriorityFilter(f.value)}
            role="tab"
            aria-selected={priorityFilter === f.value}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              priorityFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {TASK_COLUMNS.map((col) => (
            <Card key={col.status}>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {col.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-4 w-12 rounded-full" />
                      <Skeleton className="h-4 w-8 rounded-full" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchTasks} />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon="tasks"
          title="No tasks yet"
          description="Create your first task to start tracking work."
        />
      ) : (
        <motion.div variants={reducedMotion ? undefined : itemVariants}>
          <KanbanBoard tasks={filteredTasks} onTaskMoved={handleTaskMoved} />
        </motion.div>
      )}
    </motion.div>
  );
}
