"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Share2, Trash2, Loader2, Mail, User as UserIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { ResourceShare, User, PaginatedResponse } from "@/types";

type Access = "VIEW" | "EDIT" | "MANAGE";
type TargetType = "USER" | "EMAIL";

const accessLabels: Record<Access, string> = {
  VIEW: "View",
  EDIT: "Edit",
  MANAGE: "Manage",
};

const accessColors: Record<Access, string> = {
  VIEW: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  EDIT: "bg-primary/10 text-primary border-primary/20",
  MANAGE: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
};

interface ShareDialogProps {
  resourceType: "PROJECT" | "TASK";
  resourceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({
  resourceType,
  resourceId,
  open,
  onOpenChange,
}: ShareDialogProps) {
  const { tenantId } = useAuth();
  const [shares, setShares] = useState<ResourceShare[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<TargetType>("USER");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [email, setEmail] = useState("");
  const [access, setAccess] = useState<Access>("VIEW");
  const [isSaving, setIsSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const [sharesRes, usersRes] = await Promise.all([
        apiClient.get<ResourceShare[]>(
          `/tenants/${tenantId}/shares?resourceType=${resourceType}&resourceId=${resourceId}`
        ),
        apiClient.get<PaginatedResponse<User>>("/users?limit=100"),
      ]);
      setShares(sharesRes || []);
      setUsers(usersRes.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tenantId, resourceType, resourceId]);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      // Reset the form and load current shares/members each time the dialog opens.
      setTargetType("USER");
      setSelectedUserId("");
      setEmail("");
      setAccess("VIEW");
      loadData();
    }
    onOpenChange(next);
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    if (targetType === "USER" && !selectedUserId) return;
    if (targetType === "EMAIL" && !email.trim()) return;
    setIsSaving(true);
    try {
      const share = await apiClient.post<ResourceShare>(
        `/tenants/${tenantId}/shares`,
        {
          resourceType,
          resourceId,
          targetType,
          target: targetType === "USER" ? selectedUserId : email.trim(),
          access,
        }
      );
      setShares((prev) => [...prev, share]);
      toast.success("Shared successfully");
      setSelectedUserId("");
      setEmail("");
      setAccess("VIEW");
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (shareId: string) => {
    if (!tenantId) return;
    try {
      await apiClient.delete(`/tenants/${tenantId}/shares/${shareId}`);
      setShares((prev) => prev.filter((s) => s.id !== shareId));
      toast.success("Share removed");
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const displayName = (share: ResourceShare): string => {
    if (share.targetType === "EMAIL") return share.email || "Unknown";
    const u = users.find((x) => x.id === share.userId);
    return u ? u.name : share.email || "Unknown";
  };

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-4" />
            Share {resourceType === "PROJECT" ? "Project" : "Task"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing shares */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              People with access ({shares.length})
            </p>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border p-2">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not shared with anyone yet.
              </p>
            ) : (
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center gap-3 rounded-lg border p-2"
                  >
                    <Avatar size="sm">
                      <AvatarFallback>
                        {getInitials(displayName(share))}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {displayName(share)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {share.targetType === "EMAIL" ? "Via email" : "Workspace member"}
                      </p>
                    </div>
                    <Badge variant="outline" className={accessColors[share.access as Access]}>
                      {accessLabels[share.access as Access]}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleRemove(share.id)}
                      aria-label="Remove share"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add a share */}
          <form onSubmit={handleShare} className="space-y-3 rounded-lg border p-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Share with</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={targetType === "USER" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTargetType("USER")}
                >
                  <UserIcon className="mr-1.5 size-3.5" />
                  Member
                </Button>
                <Button
                  type="button"
                  variant={targetType === "EMAIL" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTargetType("EMAIL")}
                >
                  <Mail className="mr-1.5 size-3.5" />
                  Email
                </Button>
              </div>
            </div>

            {targetType === "USER" ? (
              <Select
                value={selectedUserId}
                onValueChange={(v) => setSelectedUserId(v || "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a member" />
                </SelectTrigger>
                <SelectContent>
                  {users.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No members available
                    </SelectItem>
                  ) : (
                    users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="email"
                placeholder="teammate@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Access</label>
              <Select
                value={access}
                onValueChange={(v) => v && setAccess(v as Access)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEW">View</SelectItem>
                  <SelectItem value="EDIT">Edit</SelectItem>
                  <SelectItem value="MANAGE">Manage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={
                isSaving ||
                (targetType === "USER" && !selectedUserId) ||
                (targetType === "EMAIL" && (!email.trim() || !isEmailValid))
              }
            >
              {isSaving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Share
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
