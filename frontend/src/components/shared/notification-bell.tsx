"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  UserPlus,
  MessageCircle,
  Clock,
  ArrowRightCircle,
  X,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiClient } from "@/lib/api";
import { timeAgo, cn } from "@/lib/utils";
import type { Notification } from "@/types";

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

const typeConfig: Record<
  Notification["type"],
  { icon: React.ElementType; color: string; bg: string }
> = {
  ASSIGNED: {
    icon: UserPlus,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  COMMENTED: {
    icon: MessageCircle,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  DUE_SOON: {
    icon: Clock,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10",
  },
  STATUS_CHANGED: {
    icon: ArrowRightCircle,
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10",
  },
};

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<NotificationsResponse>(
        "/notifications?limit=20"
      );
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const grouped = useMemo(() => {
    const today: Notification[] = [];
    const earlier: Notification[] = [];
    for (const n of notifications) {
      if (isToday(n.createdAt)) {
        today.push(n);
      } else {
        earlier.push(n);
      }
    }
    return { today, earlier };
  }, [notifications]);

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.patch("/notifications/read-all");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // silent
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // silent
    }
  };

  const handleDismiss = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const wasUnread = notifications.find((n) => n.id === id && !n.read);
    try {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
      await apiClient.delete(`/notifications/${id}`);
    } catch {
      fetchNotifications();
    }
  };

  const handleClick = (n: Notification) => {
    if (!n.read) handleMarkRead(n.id);
    if (n.link) {
      const path = n.link.startsWith("/") ? n.link : `/dashboard${n.link}`;
      router.push(path);
    }
  };

  const renderSection = (label: string, items: Notification[]) => {
    if (items.length === 0) return null;
    return (
      <>
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground py-1.5">
          {label}
        </DropdownMenuLabel>
        {items.map((n) => {
          const config = typeConfig[n.type];
          const Icon = config.icon;
          return (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={cn(
                "group flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                n.read
                  ? "hover:bg-muted/50"
                  : "bg-primary/5 hover:bg-primary/10"
              )}
            >
              <div
                className={cn(
                  "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                  config.bg
                )}
              >
                <Icon className={cn("size-3.5", config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm leading-snug",
                    !n.read && "font-medium"
                  )}
                >
                  {n.message}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {timeAgo(n.createdAt)}
                </p>
              </div>
              <button
                onClick={(e) => handleDismiss(n.id, e)}
                className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground/0 opacity-0 group-hover:opacity-100 group-hover:text-muted-foreground hover:text-foreground transition-colors duration-150"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="relative" aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`} />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 size-4 p-0 text-[10px] flex items-center justify-center animate-pulse-subtle"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleMarkAllRead}
              >
                <CheckCheck className="size-3.5" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
        <Separator />
        <DropdownMenuGroup className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <div className="rounded-full bg-muted p-3">
                <Bell className="size-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                No notifications yet
              </p>
              <p className="text-xs text-muted-foreground/70 max-w-[200px]">
                You'll see task assignments, comments, and deadline reminders
                here.
              </p>
            </div>
          ) : (
            <>
              {renderSection("Today", grouped.today)}
              {renderSection("Earlier", grouped.earlier)}
            </>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
