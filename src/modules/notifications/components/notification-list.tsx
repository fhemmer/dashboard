"use client";

import { Bell, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  dismissAllNotifications,
  dismissNotification,
} from "../actions";
import type { Notification } from "../types";
import { NotificationItem } from "./notification-item";

interface NotificationListProps {
  initialNotifications: Notification[];
}

export function NotificationList({
  initialNotifications,
}: NotificationListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticNotifications, removeOptimistic] = useOptimistic(
    initialNotifications,
    (state, idToRemove: string | "all") => {
      if (idToRemove === "all") return [];
      return state.filter((n) => n.id !== idToRemove);
    }
  );

  const handleDismiss = async (id: string) => {
    removeOptimistic(id);
    await dismissNotification(id);
    router.refresh();
  };

  const handleDismissAll = () => {
    startTransition(async () => {
      removeOptimistic("all");
      await dismissAllNotifications();
      router.refresh();
    });
  };

  if (optimisticNotifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium mb-1">All caught up!</h3>
        <p className="text-sm text-muted-foreground mb-4">
          You have no notifications at the moment.
        </p>
        <Button variant="outline" asChild>
          <Link href="/">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {optimisticNotifications.length} notification
          {optimisticNotifications.length !== 1 ? "s" : ""}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDismissAll}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Clear all
        </Button>
      </div>
      <div className="divide-y rounded-lg border bg-card">
        {optimisticNotifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </div>
  );
}
