"use client";

import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { UserPlus, MoreHorizontal, Trash2, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient, extractErrorMessage } from "@/lib/api";
import { getInitials } from "@/lib/utils";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { ProjectMember, User, PaginatedResponse } from "@/types";

interface MemberManagerProps {
  projectId: string;
  members: ProjectMember[];
  onMembersChange: (members: ProjectMember[]) => void;
}

export function MemberManager({
  projectId,
  members,
  onMembersChange,
}: MemberManagerProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"member" | "manager">("member");
  const [isAdding, setIsAdding] = useState(false);
  const [removingMember, setRemovingMember] = useState<ProjectMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const memberUserIds = new Set(members.map((m) => m.userId));

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await apiClient.get<PaginatedResponse<User>>("/users?limit=100");
      setAllUsers(res.data || []);
    } catch {
      // silent
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (addOpen) fetchUsers();
  }, [addOpen, fetchUsers]);

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setIsAdding(true);
    try {
      const member = await apiClient.post<ProjectMember>(
        `/projects/${projectId}/members`,
        { userId: selectedUserId, role: selectedRole }
      );
      onMembersChange([...members, member]);
      toast.success("Member added");
      setAddOpen(false);
      setSelectedUserId("");
      setSelectedRole("member");
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async () => {
    if (!removingMember) return;
    setIsRemoving(true);
    try {
      await apiClient.delete(
        `/projects/${projectId}/members/${removingMember.id}`
      );
      onMembersChange(members.filter((m) => m.id !== removingMember.id));
      toast.success("Member removed");
      setRemovingMember(null);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setIsRemoving(false);
    }
  };

  const handleChangeRole = async (member: ProjectMember, newRole: "member" | "manager") => {
    try {
      const updated = await apiClient.put<ProjectMember>(
        `/projects/${projectId}/members/${member.id}`,
        { role: newRole }
      );
      onMembersChange(
        members.map((m) => (m.id === member.id ? updated : m))
      );
      toast.success("Role updated");
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const availableUsers = allUsers.filter((u) => !memberUserIds.has(u.id));

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Members ({members.length})</span>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger
                render={<Button variant="outline" size="sm" />}
              >
                <UserPlus className="mr-1.5 size-3.5" />
                Add
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">User</label>
                    <Select
                      value={selectedUserId}
                      onValueChange={(v) => setSelectedUserId(v || "")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {loadingUsers ? (
                          <SelectItem value="loading" disabled>
                            Loading users...
                          </SelectItem>
                        ) : availableUsers.length === 0 ? (
                          <SelectItem value="none" disabled>
                            No users available
                          </SelectItem>
                        ) : (
                          availableUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <Select
                      value={selectedRole}
                      onValueChange={(v) => v && setSelectedRole(v as "member" | "manager")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAdd} disabled={!selectedUserId || isAdding}>
                      Add Member
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              No members yet
            </p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg border p-2"
              >
                <Avatar size="sm">
                  <AvatarFallback>
                    {getInitials(member.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{member.user.name}</p>
                  <p className="text-xs text-muted-foreground">{member.user.email}</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    member.role === "manager"
                      ? "bg-primary/10 text-primary border-primary/20"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  }
                >
                  {member.role === "manager" ? "Manager" : "Member"}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={<Button variant="ghost" size="icon-sm" />}
                  >
                    <MoreHorizontal className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {member.role === "member" ? (
                      <DropdownMenuItem
                        onClick={() => handleChangeRole(member, "manager")}
                      >
                        <Shield className="size-4" />
                        Make Manager
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => handleChangeRole(member, "member")}
                      >
                        <Shield className="size-4" />
                        Make Member
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setRemovingMember(member)}
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!removingMember}
        onOpenChange={(o) => { if (!o) setRemovingMember(null); }}
        title="Remove Member"
        description={`Remove "${removingMember?.user.name}" from this project?`}
        confirmLabel="Remove"
        onConfirm={handleRemove}
        loading={isRemoving}
      />
    </>
  );
}
