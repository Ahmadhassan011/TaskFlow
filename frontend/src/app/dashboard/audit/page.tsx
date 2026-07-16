"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import {
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/shared/pagination";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { apiClient, extractErrorMessage } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { getInitials } from "@/lib/utils";
import type { AuditLog } from "@/types";

type DecisionFilter = "ALL" | "ALLOW" | "DENY";

const formatAction = (action: string) =>
  action
    .replace(/[_:]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

export default function AuditLogPage() {
  const { tenantId, user } = useAuth();
  const canView =
    user?.role === "OWNER" || user?.role === "ADMIN";

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [decision, setDecision] = useState<DecisionFilter>("ALL");

  const fetchLogs = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (decision !== "ALL") params.set("decision", decision);
      const res = await apiClient.get<{
        logs: AuditLog[];
        pagination: { totalPages: number };
      }>(`/tenants/${tenantId}/audit-logs?${params}`);
      setLogs(res.logs || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tenantId, page, decision]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  if (!canView) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
      >
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon="default"
              title="Access restricted"
              description="Only workspace owners and admins can view the audit log."
            />
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">
            A record of security and access decisions in this workspace.
          </p>
        </div>
        <Select
          value={decision}
          onValueChange={(v) => {
            if (v) {
              setDecision(v as DecisionFilter);
              setPage(1);
            }
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All decisions</SelectItem>
            <SelectItem value="ALLOW">Allowed</SelectItem>
            <SelectItem value="DENY">Denied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6">
              <ErrorState message={error} onRetry={fetchLogs} />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon="default"
                title="No audit entries"
                description="Security and access decisions will appear here."
              />
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const allowed = log.decision === "ALLOW";
                return (
                  <div
                    key={log.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <Avatar size="sm">
                      <AvatarFallback>
                        {getInitials(log.actor?.name || "Unknown")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {log.actor?.name || "Unknown"}
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          {log.actor?.email}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {formatAction(log.action)}
                        {log.resourceType ? ` · ${log.resourceType}` : ""}
                      </p>
                      {log.reason && (
                        <p className="text-xs text-muted-foreground truncate">
                          Reason: {log.reason}
                          {log.ipAddress ? ` · ${log.ipAddress}` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <Badge
                        variant="outline"
                        className={
                          allowed
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                        }
                      >
                        {allowed ? (
                          <ShieldCheck className="mr-1 size-3" />
                        ) : (
                          <ShieldX className="mr-1 size-3" />
                        )}
                        {allowed ? "Allowed" : "Denied"}
                      </Badge>
                      <span className="hidden text-xs text-muted-foreground sm:block">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </motion.div>
  );
}
