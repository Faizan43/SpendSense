"use client";

import { Bell, CheckCheck, Target, TriangleAlert, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  clearNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/(app)/notifications/actions";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/date";
import type { NotificationRow } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Bell> = {
  budget_threshold: Target,
  budget_exceeded: TriangleAlert,
};

export function NotificationList({
  notifications,
}: {
  notifications: NotificationRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.read_at).length;

  function run(action: () => Promise<{ ok: boolean; error?: string }>, message: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "That didn't work.");
        return;
      }
      toast.success(message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending || unread === 0}
          onClick={() => run(markAllNotificationsRead, "All marked as read")}
        >
          <CheckCheck className="size-3.5" /> Mark all read
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending || notifications.length === unread}
          onClick={() => run(clearNotifications, "Read alerts cleared")}
        >
          <Trash2 className="size-3.5" /> Clear read
        </Button>
      </div>

      <ul className="divide-y rounded-xl border">
        {notifications.map((notification) => {
          const Icon = ICONS[notification.type] ?? Bell;
          return (
            <li
              key={notification.id}
              className={cn(
                "flex items-start gap-3 px-3 py-3",
                !notification.read_at && "bg-accent/40",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  notification.type === "budget_exceeded"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{notification.title}</p>
                {notification.body ? (
                  <p className="text-muted-foreground text-sm">
                    {notification.body}
                  </p>
                ) : null}
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {formatRelativeTime(notification.created_at)}
                </p>
              </div>

              {!notification.read_at ? (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => markNotificationRead(notification.id),
                      "Marked as read",
                    )
                  }
                >
                  Mark read
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
