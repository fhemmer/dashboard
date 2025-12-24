"use client";

import { formatDistanceToNow } from "date-fns";
import {
    GitPullRequest,
    Info,
    Newspaper,
    Wallet,
    X,
} from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { Notification, NotificationType } from "../types";

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => Promise<void>;
}

const typeIcons: Record<NotificationType, typeof Newspaper> = {
  news: Newspaper,
  pr: GitPullRequest,
  expenditure: Wallet,
  system: Info,
};

const typeColors: Record<NotificationType, string> = {
  news: "text-blue-500",
  pr: "text-green-500",
  expenditure: "text-orange-500",
  system: "text-purple-500",
};

export function NotificationItem({
  notification,
  onDismiss,
}: NotificationItemProps) {
  const [isPending, startTransition] = useTransition();
  const Icon = typeIcons[notification.type];
  const colorClass = typeColors[notification.type];

  const handleDismiss = () => {
    startTransition(async () => {
      await onDismiss(notification.id);
    });
  };

  const timeAgo = formatDistanceToNow(notification.createdAt, {
    addSuffix: true,
  });

  return (
    <div
      className="group flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors rounded-md"
      data-testid="notification-item"
    >
      <div className={`mt-0.5 ${colorClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleDismiss}
        disabled={isPending}
        aria-label="Dismiss notification"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
