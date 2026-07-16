"use client";

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  User,
  MessageSquare,
  CheckSquare as CheckSquareIcon,
  Paperclip,
  Pencil,
  Send,
  Loader2,
  Trash2,
  Share2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient, extractErrorMessage } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { getInitials } from "@/lib/utils";
import {
  StatusBadge,
  PriorityBadge,
} from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EditTaskDialog } from "@/components/shared/edit-task-dialog";
import { TaskAttachments } from "@/components/shared/task-attachments";
import { ActivityFeed } from "@/components/shared/activity-feed";
import { ShareDialog } from "@/components/shared/share-dialog";
import type {
  Task,
  Comment,
  Subtask,
  TaskStatus,
} from "@/types";

const statusFlow: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const canShare = user?.role === "MANAGER" || user?.role === "ADMIN" || user?.role === "OWNER";
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  const [submittingSubtask, setSubmittingSubtask] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchTask = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Task>(`/tasks/${id}`);
      setTask(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const handleStatusChange = async (newStatus: TaskStatus) => {
    try {
      await apiClient.patch(`/tasks/${id}/status`, { status: newStatus });
      setTask((prev) => (prev ? { ...prev, status: newStatus } : null));
      toast.success("Status updated");
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      const comment = await apiClient.post<Comment>(
        `/tasks/${id}/comments`,
        { content: commentText }
      );
      setTask((prev) =>
        prev
          ? { ...prev, comments: [...(prev.comments || []), comment] }
          : null
      );
      setCommentText("");
      toast.success("Comment added");
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    setSubmittingSubtask(true);
    try {
      const subtask = await apiClient.post<Subtask>(
        `/tasks/${id}/subtasks`,
        { title: newSubtask }
      );
      setTask((prev) =>
        prev
          ? { ...prev, subtasks: [...(prev.subtasks || []), subtask] }
          : null
      );
      setNewSubtask("");
      toast.success("Subtask added");
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmittingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      await apiClient.patch(`/tasks/${id}/subtasks/${subtaskId}`, {
        isCompleted: completed,
      });
      setTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: (prev.subtasks || []).map((s) =>
                s.id === subtaskId ? { ...s, isCompleted: completed } : s
              ),
            }
          : null
      );
    } catch {
      toast.error("Failed to update subtask");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await apiClient.delete(`/tasks/${id}/comments/${commentId}`);
      setTask((prev) =>
        prev
          ? {
              ...prev,
              comments: (prev.comments || []).filter(
                (c) => c.id !== commentId
              ),
            }
          : null
      );
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    try {
      await apiClient.delete(`/tasks/${id}/subtasks/${subtaskId}`);
      setTask((prev) =>
        prev
          ? {
              ...prev,
              subtasks: (prev.subtasks || []).filter((s) => s.id !== subtaskId),
            }
          : null
      );
      toast.success("Subtask deleted");
    } catch {
      toast.error("Failed to delete subtask");
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiClient.delete(`/tasks/${id}`);
      toast.success("Task deleted");
      router.push("/dashboard/tasks");
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
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="space-y-3 py-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="space-y-2 py-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
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
          href="/dashboard/tasks"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Tasks
        </Link>
        <ErrorState message={error} onRetry={fetchTask} />
      </div>
    );
  }

  if (!task) return null;

  const completedSubtasks = (task.subtasks || []).filter(
    (s) => s.isCompleted
  ).length;
  const totalSubtasks = (task.subtasks || []).length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="space-y-2">
        <Link
          href="/dashboard/tasks"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Tasks
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{task.title}</h1>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              {task.labels?.map((label) => (
                <Badge
                  key={label.id}
                  variant="outline"
                  style={{
                    borderColor: label.color,
                    color: label.color,
                  }}
                >
                  {label.name}
                </Badge>
              ))}
            </div>
          </div>
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
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {task.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {task.description}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckSquareIcon className="size-4" />
                Subtasks ({completedSubtasks}/{totalSubtasks})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(task.subtasks || []).map((subtask) => (
                <div
                  key={subtask.id}
                  className="flex items-center gap-3 rounded-lg border p-2"
                >
                  <input
                    type="checkbox"
                    checked={subtask.isCompleted}
                    onChange={(e) =>
                      handleToggleSubtask(subtask.id, e.target.checked)
                    }
                    className="size-4 rounded"
                  />
                  <span
                    className={
                      subtask.isCompleted
                        ? "flex-1 text-sm text-muted-foreground line-through"
                        : "flex-1 text-sm"
                    }
                  >
                    {subtask.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleDeleteSubtask(subtask.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              ))}
              <form onSubmit={handleAddSubtask} className="flex gap-2 pt-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Add a subtask..."
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingSubtask || !newSubtask.trim()}
                >
                  {submittingSubtask ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="size-4" />
                Comments ({(task.comments || []).length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(task.comments || []).map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <Avatar size="sm">
                    <AvatarFallback>
                      {getInitials(comment.author.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">
                          {comment.author.name}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {(comment.authorId === user?.id ||
                        user?.role === "OWNER" ||
                          user?.role === "ADMIN") && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                    <p className="mt-1 text-sm">{comment.content}</p>
                  </div>
                </div>
              ))}

              <Separator />

              <form onSubmit={handleAddComment} className="flex gap-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  rows={2}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={submittingComment || !commentText.trim()}
                >
                  {submittingComment ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <TaskAttachments
            taskId={id}
            attachments={task.attachments || []}
            onAttachmentAdded={(a) =>
              setTask((prev) =>
                prev
                  ? { ...prev, attachments: [...(prev.attachments || []), a] }
                  : null
              )
            }
            onAttachmentDeleted={(aid) =>
              setTask((prev) =>
                prev
                  ? {
                      ...prev,
                      attachments: (prev.attachments || []).filter(
                        (a) => a.id !== aid
                      ),
                    }
                  : null
              )
            }
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Select
                  value={task.status}
                  onValueChange={(v) => v && handleStatusChange(v as TaskStatus)}
                >
                  <SelectTrigger className="w-auto h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFlow.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              {task.assignee && (
                <>
                  <div className="flex items-center gap-2">
                    <User className="size-4 text-muted-foreground" />
                    <span>{task.assignee.name}</span>
                  </div>
                  <Separator />
                </>
              )}
              {task.dueDate && (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground" />
                    <span>
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <Separator />
                </>
              )}
              {task.project && (
                <Link
                  href={`/dashboard/projects/${task.project.id}`}
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                >
                  <Paperclip className="size-4" />
                  <span className="truncate">{task.project.name}</span>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ActivityFeed entityType="task" entityId={id} />

      <EditTaskDialog
        task={task}
        open={editOpen}
        onOpenChange={setEditOpen}
        onUpdated={(updated) => {
          setTask((prev) => (prev ? { ...prev, ...updated } : null));
          setEditOpen(false);
        }}
      />

      {canShare && (
        <ShareDialog
          resourceType="TASK"
          resourceId={id}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete Task"
        description={`Are you sure you want to delete "${task.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </motion.div>
  );
}
