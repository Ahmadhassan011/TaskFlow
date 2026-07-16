"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiClient, extractErrorMessage } from "@/lib/api";
import { getInitials, timeAgo } from "@/lib/utils";
import { ErrorState } from "@/components/shared/error-state";
import { actionLabels } from "@/lib/constants";
import type { ActivityLog } from "@/types";

interface ActivityFeedProps {
  entityType: string;
  entityId: string;
  limit?: number;
}

interface ActivityResponse {
  data: ActivityLog[];
  pagination: { page: number; totalPages: number };
}

export function ActivityFeed({
  entityType,
  entityId,
  limit = 20,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<ActivityResponse>(
        `/activity/entity/${entityType}/${entityId}?limit=${limit}`
      );
      setActivities(res.data || []);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, limit]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-4" />
          Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchActivity} />
        ) : activities.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No activity yet
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <Avatar size="sm">
                  <AvatarFallback>
                    {activity.user
                      ? getInitials(activity.user.name)
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">
                      {activity.user?.name || "Unknown"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {actionLabels[activity.action] || activity.action}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {activity.entityType}
                    </span>
                  </p>
                  {activity.changes && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {JSON.stringify(activity.changes)}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {timeAgo(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
