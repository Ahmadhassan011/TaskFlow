"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Pencil, Trash2, CheckSquare, Share2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient, extractErrorMessage } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import {
  ProjectStatusBadge,
  StatusBadge,
  PriorityBadge,
} from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EditProjectDialog } from "@/components/shared/edit-project-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LabelManager } from "@/components/shared/label-manager";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { MemberManager } from "@/components/shared/member-manager";
import { ShareDialog } from "@/components/shared/share-dialog";
import type { Project, Task } from "@/types";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const canShare = user?.role === "MANAGER" || user?.role === "ADMIN" || user?.role === "OWNER";
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [proj, taskRes] = await Promise.all([
        apiClient.get<Project>(`/projects/${id}`),
        apiClient.get<{ data: Task[] }>(`/tasks?projectId=${id}&limit=50`),
      ]);
      setProject(proj);
      setTasks(taskRes.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/projects/${id}`);
      toast.success("Project deleted");
      router.push("/dashboard/projects");
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="space-y-3 py-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="space-y-2 py-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Projects
        </Link>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  if (!project) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Projects
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <ProjectStatusBadge status={project.status} />
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 size-3" />
            Edit
          </Button>
          {canShare && (
            <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
              <Share2 className="mr-2 size-3" />
              Share
            </Button>
          )}
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-2 size-3" />
            Delete
          </Button>
        </div>
        {project.description && (
          <p className="text-muted-foreground">{project.description}</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="size-4" />
                Tasks ({tasks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No tasks yet
                </p>
              ) : (
                tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/dashboard/tasks/${task.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge status={task.status} />
                      <span className="text-sm font-medium">{task.title}</span>
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {project.startDate && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-4" />
                  Start: {new Date(project.startDate).toLocaleDateString()}
                </div>
              )}
              {project.endDate && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="size-4" />
                  End: {new Date(project.endDate).toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>

          <MemberManager
            projectId={id}
            members={project.members || []}
            onMembersChange={(members) => setProject((prev) => prev ? { ...prev, members } : null)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <LabelManager projectId={id} />
        <ActivityFeed entityType="project" entityId={id} />
      </div>

      <EditProjectDialog
        project={project}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={(updated) => {
          setProject((prev) => (prev ? { ...prev, ...updated } : null));
          setEditOpen(false);
        }}
      />

      {canShare && (
        <ShareDialog
          resourceType="PROJECT"
          resourceId={id}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Project"
        description={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </motion.div>
  );
}
