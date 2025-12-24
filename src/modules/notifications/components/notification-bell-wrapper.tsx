"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import {
    dismissAllNotifications,
    dismissNotification,
} from "../actions";
import type { Notification } from "../types";
import { NotificationBell } from "./notification-bell";

interface NotificationBellWrapperProps {
  initialNotifications: Notification[];
  initialCount: number;
}

export function NotificationBellWrapper({
  initialNotifications,
  initialCount,
}: NotificationBellWrapperProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [optimisticState, updateOptimistic] = useOptimistic(
    { notifications: initialNotifications, count: initialCount },
    (state, action: { type: "dismiss"; id: string } | { type: "dismissAll" }) => {
      if (action.type === "dismissAll") {
        return { notifications: [], count: 0 };
      }
      const newNotifications = state.notifications.filter(
        (n) => n.id !== action.id
      );
      return {
        notifications: newNotifications,
        count: Math.max(0, state.count - 1),
      };
    }
  );

  const handleDismiss = async (id: string) => {
    startTransition(async () => {
      updateOptimistic({ type: "dismiss", id });
      await dismissNotification(id);
      router.refresh();
    });
  };

  const handleDismissAll = async () => {
    startTransition(async () => {
      updateOptimistic({ type: "dismissAll" });
      await dismissAllNotifications();
      router.refresh();
    });
  };

  return (
    <NotificationBell
      notifications={optimisticState.notifications}
      count={optimisticState.count}
      onDismiss={handleDismiss}
      onDismissAll={handleDismissAll}
    />
  );
}
