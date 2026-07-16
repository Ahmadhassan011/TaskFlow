"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, MoreHorizontal, Pencil, Trash2, UserPlus, RotateCcw, Copy, Mail } from "lucide-react";
import { apiClient, extractErrorMessage } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import { SearchInput } from "@/components/shared/search-input";
import { Pagination } from "@/components/shared/pagination";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { EditUserDialog } from "@/components/shared/edit-user-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/use-debounce";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, ROLE_COLORS } from "@/lib/constants";
import type { User, PaginatedResponse, Role, Invitation } from "@/types";

type RoleFilter = "ALL" | Role;

const roleFilters: { label: string; value: RoleFilter }[] = [
  { label: "All", value: "ALL" },
  { label: "Owner", value: "OWNER" },
  { label: "Admin", value: "ADMIN" },
  { label: "Manager", value: "MANAGER" },
  { label: "Member", value: "MEMBER" },
  { label: "Guest", value: "GUEST" },
];

export default function UsersPage() {
  const reducedMotion = useReducedMotion();
  const { tenantId, user } = useAuth();
  const canInvite = user?.role === "OWNER" || user?.role === "ADMIN";

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<Role>("MEMBER");
  const [isCreating, setIsCreating] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [invites, setInvites] = useState<Invitation[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [invitesError, setInvitesError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      const res = await apiClient.get<PaginatedResponse<User>>(
        `/users?${params}`
      );
      setUsers(res.data || []);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setIsCreating(true);
    try {
      const res = await apiClient.post<{ token: string }>(
        `/tenants/${tenantId}/invites`,
        { email: newEmail, role: newRole }
      );
      toast.success("Invitation sent");
      setInviteLink(`${window.location.origin}/invite/${res.token}`);
      setNewRole("MEMBER");
      fetchInvites();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  const fetchInvites = useCallback(async () => {
    if (!tenantId) return;
    setInvitesLoading(true);
    setInvitesError(null);
    try {
      const res = await apiClient.get<Invitation[]>(
        `/tenants/${tenantId}/invites`
      );
      setInvites(res || []);
    } catch (err) {
      setInvitesError(extractErrorMessage(err));
    } finally {
      setInvitesLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (canInvite && tenantId) {
      fetchInvites();
    }
  }, [canInvite, tenantId, fetchInvites]);

  const handleDeactivate = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/users/${deletingUser.id}`);
      toast.success("User deactivated");
      setDeletingUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleActivate = async (user: User) => {
    try {
      await apiClient.put(`/users/${user.id}`, { isActive: true });
      toast.success("User activated");
      fetchUsers();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">
            Manage team members and roles.
          </p>
        </div>
        {canInvite && (
        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setInviteLink(null); }}>
          <DialogTrigger render={<Button />}>
            <UserPlus className="mr-2 size-4" />
            Invite Member
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            {inviteLink ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Invitation created. Share this link with{" "}
                  <span className="font-medium text-foreground">{newEmail || "the invitee"}</span>{" "}
                  so they can join this workspace.
                </p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={inviteLink} className="text-xs" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => copyToClipboard(inviteLink)}
                    aria-label="Copy invite link"
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setInviteLink(null); setNewEmail(""); }}
                  >
                    Invite another
                  </Button>
                  <Button type="button" onClick={() => { setCreateOpen(false); setInviteLink(null); setNewEmail(""); }}>
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="uemail">Email</Label>
                  <Input
                    id="uemail"
                    type="email"
                    placeholder="teammate@company.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={newRole} onValueChange={(v) => v && setNewRole(v as Role)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                  <SelectItem value="OWNER">Owner</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="GUEST">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    Send Invite
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
        )}
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search users..."
      />

      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Filter users by role">
        {roleFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setRoleFilter(f.value)}
            role="tab"
            aria-selected={roleFilter === f.value}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              roleFilter === f.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorState message={error} onRetry={fetchUsers} />
            </div>
          ) : users.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon="default"
                title="No users found"
                description="No team members match your current filters."
              />
            </div>
          ) : (
            <div className="divide-y">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{getInitials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{u.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {u.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pl-0 sm:ml-auto sm:pl-0">
                    <Badge
                      variant="outline"
                      className={ROLE_COLORS[u.role]}
                    >
                      {ROLE_LABEL[u.role]}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={
                        u.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                      }
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" />}
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingUser(u)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        {!u.isActive && (
                          <DropdownMenuItem onClick={() => handleActivate(u)}>
                            <RotateCcw className="size-4" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        {u.isActive && (
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeletingUser(u)}
                          >
                            <Trash2 className="size-4" />
                            Deactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="size-4" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {invitesLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : invitesError ? (
              <div className="p-6">
                <ErrorState message={invitesError} onRetry={fetchInvites} />
              </div>
            ) : invites.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon="default"
                  title="No pending invitations"
                  description="Invite a teammate to get started."
                />
              </div>
            ) : (
              <div className="divide-y">
                {invites.map((inv) => {
                  const expired = !inv.acceptedAt && new Date(inv.expiresAt) < new Date();
                  const status = inv.acceptedAt
                    ? "Accepted"
                    : expired
                    ? "Expired"
                    : "Pending";
                  return (
                    <div
                      key={inv.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{inv.email}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={ROLE_COLORS[inv.role]}>
                          {ROLE_LABEL[inv.role]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            status === "Accepted"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : status === "Expired"
                              ? "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
                              : "bg-primary/10 text-primary border-primary/20"
                          }
                        >
                          {status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {editingUser && (
        <EditUserDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(o) => { if (!o) setEditingUser(null); }}
          onUpdated={() => { setEditingUser(null); fetchUsers(); }}
        />
      )}

      <ConfirmDialog
        open={!!deletingUser}
        onOpenChange={(o) => { if (!o) setDeletingUser(null); }}
        title="Deactivate User"
        description={`Are you sure you want to deactivate "${deletingUser?.name}"? They will no longer be able to log in.`}
        confirmLabel="Deactivate"
        onConfirm={handleDeactivate}
        loading={isDeleting}
      />
    </motion.div>
  );
}
