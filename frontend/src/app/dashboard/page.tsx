"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import {
  FolderKanban,
  CheckSquare,
  ListTodo,
  Clock,
  AlertTriangle,
  TrendingUp,
  CircleCheck,
  Plus,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ErrorState } from "@/components/shared/error-state";
import { UserActivityFeed } from "@/components/shared/user-activity-feed";
import { apiClient, extractErrorMessage } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { getInitials } from "@/lib/utils";
import { containerVariants, itemVariants } from "@/lib/constants";
import type { DashboardStats } from "@/types";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  delay,
  reducedMotion,
  valueClassName,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  delay: number;
  reducedMotion: boolean;
  valueClassName?: string;
}) {
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="transition-all duration-150 hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="flex items-center gap-4">
          <div className={`rounded-lg p-3 ${color}`}>
            <Icon className="size-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold${valueClassName ? ` ${valueClassName}` : ""}`}>{value}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-4">
              <Skeleton className="size-11 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-7 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="py-6 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TeamWorkload({ stats, reducedMotion }: { stats: DashboardStats; reducedMotion: boolean }) {
  const workload = stats.teamWorkload || [];
  const maxTasks = Math.max(...workload.map((w) => w.taskCount), 1);

  if (workload.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="size-4" />
          Team Workload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {workload.map((w) => (
          <div key={w.user.id} className="flex items-center gap-3">
            <Avatar size="sm">
              <AvatarFallback>{getInitials(w.user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate">{w.user.name}</span>
                <span className="text-xs text-muted-foreground ml-2 shrink-0">
                  {w.taskCount} tasks
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={reducedMotion ? false : { width: 0 }}
                  animate={{ width: `${(w.taskCount / maxTasks) * 100}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, tenantId } = useAuth();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const canCreate = user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fabOpen, setFabOpen] = useState(false);

  const fetchStats = () => {
    setLoading(true);
    setError(null);
    apiClient
      .get<DashboardStats>("/dashboard/stats")
      .then(setStats)
      .catch((err) => setError(extractErrorMessage(err, "Failed to load dashboard")))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
  }, [tenantId]);

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={fetchStats} />;

  return (
    <motion.div
      variants={reducedMotion ? undefined : containerVariants}
      initial={reducedMotion ? false : "hidden"}
      animate="visible"
      className="space-y-6"
    >
      <motion.div variants={reducedMotion ? undefined : itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your projects and tasks.
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Dashboard statistics">
        <StatCard
          title="Projects"
          value={stats?.totalProjects ?? 0}
          icon={FolderKanban}
          color="bg-primary/10 text-primary"
          delay={0.1}
          reducedMotion={reducedMotion}
        />
        <StatCard
          title="Total Tasks"
          value={stats?.totalTasks ?? 0}
          icon={ListTodo}
          color="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          delay={0.15}
          reducedMotion={reducedMotion}
        />
        <StatCard
          title="Completed"
          value={stats?.completedTasks ?? 0}
          icon={CircleCheck}
          color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          delay={0.2}
          reducedMotion={reducedMotion}
        />
        <StatCard
          title="Overdue"
          value={stats?.overdueTasks ?? 0}
          icon={AlertTriangle}
          color="bg-red-500/10 text-red-600 dark:text-red-400"
          delay={0.25}
          reducedMotion={reducedMotion}
          valueClassName="text-red-600 dark:text-red-400"
        />
      </div>

      {stats?.statusDistribution && (
        <motion.div variants={reducedMotion ? undefined : itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Task Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Object.entries(stats.statusDistribution).map(
                  ([status, count]) => {
                    const dotColor =
                      status === "TODO"
                        ? "bg-slate-400"
                        : status === "IN_PROGRESS"
                          ? "bg-primary"
                          : status === "IN_REVIEW"
                            ? "bg-amber-500"
                            : "bg-emerald-500";
                    return (
                      <div key={status} className="flex-1 text-center">
                        <div className="text-lg font-bold">{count}</div>
                        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                          <span className={`inline-block size-2 rounded-full ${dotColor}`} />
                          {status.replace("_", " ")}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {stats?.recentDeadlines && stats.recentDeadlines.length > 0 && (
        <motion.div variants={reducedMotion ? undefined : itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-4" />
                Upcoming Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentDeadlines.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border p-3 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.project?.name}
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString()
                        : "No date"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div variants={reducedMotion ? undefined : itemVariants}>
          <UserActivityFeed limit={8} />
        </motion.div>
        <motion.div variants={reducedMotion ? undefined : itemVariants}>
          <TeamWorkload stats={stats!} reducedMotion={reducedMotion} />
        </motion.div>
      </div>

      {canCreate && (
      <div
        className="fixed bottom-6 right-6 z-40 md:hidden"
        role="region"
        aria-label="Quick actions"
      >
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="mb-3 space-y-2"
          >
            <Button
              size="sm"
              className="shadow-lg"
              onClick={() => { setFabOpen(false); router.push("/dashboard/projects"); }}
            >
              <FolderKanban className="mr-2 size-4" />
              New Project
            </Button>
            <Button
              size="sm"
              className="shadow-lg"
              onClick={() => { setFabOpen(false); router.push("/dashboard/tasks"); }}
            >
              <CheckSquare className="mr-2 size-4" />
              New Task
            </Button>
          </motion.div>
        )}
        <Button
          size="icon"
          className="size-14 rounded-full shadow-lg"
          onClick={() => setFabOpen(!fabOpen)}
          aria-label={fabOpen ? "Close quick actions" : "Open quick actions"}
          aria-expanded={fabOpen}
        >
          {fabOpen ? <X className="size-6" /> : <Plus className="size-6" />}
        </Button>
      </div>
      )}
    </motion.div>
  );
}
