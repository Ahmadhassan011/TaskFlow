"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import { FolderKanban, Users, CheckSquare, MoreHorizontal, Pencil, Trash2, ArrowUpDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ErrorState } from "@/components/shared/error-state";
import { apiClient, extractErrorMessage } from "@/lib/api";
import { ProjectStatusBadge } from "@/components/shared/status-badge";
import { CreateProjectDialog } from "@/components/shared/create-project-dialog";
import { EditProjectDialog } from "@/components/shared/edit-project-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { useDebounce } from "@/hooks/use-debounce";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { Project, PaginatedResponse, ProjectStatus } from "@/types";
import { useAuth } from "@/hooks/use-auth";

type SortOption = "newest" | "oldest" | "name" | "tasks";

const statusFilters: { label: string; value: ProjectStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Completed", value: "COMPLETED" },
  { label: "On Hold", value: "ON_HOLD" },
];

const sortOptions: { label: string; value: SortOption }[] = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Name", value: "name" },
  { label: "Most tasks", value: "tasks" },
];

import { cn } from "@/lib/utils";
import { containerVariants, itemVariants } from "@/lib/constants";

export default function ProjectsPage() {
  const { user, tenantId } = useAuth();
  const reducedMotion = useReducedMotion();
  const canManageProjects = user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "12" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const res = await apiClient.get<PaginatedResponse<Project>>(
        `/projects?${params}`
      );
      setProjects(res.data || []);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      setError(extractErrorMessage(err, "Failed to load projects"));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, tenantId]);

  const sortedProjects = [...projects].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "name":
        return a.name.localeCompare(b.name);
      case "tasks":
        return (b._count?.tasks ?? 0) - (a._count?.tasks ?? 0);
      default:
        return 0;
    }
  });

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const handleDelete = async () => {
    if (!deletingProject) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/projects/${deletingProject.id}`);
      toast.success("Project deleted");
      setDeletingProject(null);
      fetchProjects();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setIsDeleting(false);
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
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your projects and teams.
          </p>
        </div>
        {canManageProjects && <CreateProjectDialog onCreated={() => fetchProjects()} />}
      </motion.div>

      <motion.div variants={reducedMotion ? undefined : itemVariants}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search projects..."
        />
      </motion.div>

      <motion.div variants={reducedMotion ? undefined : itemVariants} className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border bg-muted p-0.5">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                statusFilter === f.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="appearance-none rounded-lg border bg-background px-3 py-1.5 pr-8 text-sm text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ArrowUpDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
      </motion.div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Skeleton className="size-5 rounded" />
                  <Skeleton className="h-5 w-32" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchProjects} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon="projects"
          title="No projects yet"
          description="Create your first project to get started."
        />
      ) : (
        <>
          <motion.div
            variants={reducedMotion ? undefined : containerVariants}
            initial={reducedMotion ? false : "hidden"}
            animate="visible"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {sortedProjects.map((project) => (
              <motion.div key={project.id} variants={reducedMotion ? undefined : itemVariants}>
                <Card className="transition-all duration-150 hover:shadow-md hover:-translate-y-0.5">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        className="flex items-center gap-2 truncate"
                      >
                        <FolderKanban className="size-4 shrink-0 text-muted-foreground" />
                        {project.name}
                      </Link>
                      <div className="flex items-center gap-1 shrink-0">
                        <ProjectStatusBadge status={project.status} />
                          {canManageProjects && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon-sm" />
                              }
                            >
                              <MoreHorizontal className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingProject(project)}>
                                <Pencil className="size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setDeletingProject(project)}
                              >
                                <Trash2 className="size-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {project.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckSquare className="size-3" />
                        {project._count?.tasks ?? 0} tasks
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {project._count?.members ?? 0} members
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {editingProject && (
        <EditProjectDialog
          project={editingProject}
          open={!!editingProject}
          onOpenChange={(o) => { if (!o) setEditingProject(null); }}
          onUpdated={() => { setEditingProject(null); fetchProjects(); }}
        />
      )}

      <ConfirmDialog
        open={!!deletingProject}
        onOpenChange={(o) => { if (!o) setDeletingProject(null); }}
        title="Delete Project"
        description={`Are you sure you want to delete "${deletingProject?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        loading={isDeleting}
      />
    </motion.div>
  );
}
