import type { Database } from "@/lib/supabase/database.types";

/**
 * Notification types supported by the system.
 */
export type NotificationType = "news" | "pr" | "expenditure" | "system";

/**
 * Database row type for notifications.
 */
export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

/**
 * Notification with computed fields for display.
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  metadata: NotificationMetadata;
  createdAt: Date;
}

/**
 * Metadata structure varies by notification type.
 */
export type NotificationMetadata =
  | NewsNotificationMetadata
  | PrNotificationMetadata
  | ExpenditureNotificationMetadata
  | SystemNotificationMetadata;

/**
 * News notification metadata.
 * Contains batched news items from a single source.
 */
export interface NewsNotificationMetadata {
  type: "news";
  sourceId: string;
  sourceName: string;
  itemCount: number;
  items?: Array<{
    id: string;
    title: string;
    link: string;
  }>;
}

/**
 * PR notification metadata.
 */
export interface PrNotificationMetadata {
  type: "pr";
  repoOwner: string;
  repoName: string;
  prNumber: number;
  prTitle: string;
  action: "merged" | "commented" | "reviewed" | "approved" | "changes_requested";
}

/**
 * Expenditure notification metadata.
 */
export interface ExpenditureNotificationMetadata {
  type: "expenditure";
  sourceId: string;
  sourceName: string;
  amount: number;
  threshold: number;
}

/**
 * System notification metadata.
 */
export interface SystemNotificationMetadata {
  type: "system";
  category?: "announcement" | "maintenance" | "update";
}

/**
 * Result of fetching notifications.
 */
export interface NotificationsResult {
  notifications: Notification[];
  error: string | null;
}

/**
 * Result of getting unread count.
 */
export interface UnreadCountResult {
  count: number;
  error: string | null;
}

/**
 * Result of dismissing notifications.
 */
export interface DismissResult {
  success: boolean;
  error: string | null;
}

/**
 * Transform a database row to a Notification object.
 */
export function toNotification(row: NotificationRow): Notification {
  const metadata = row.metadata as Record<string, unknown> | null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as NotificationType,
    title: row.title,
    message: row.message,
    metadata: (metadata ?? { type: row.type }) as unknown as NotificationMetadata,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Get the icon name for a notification type.
 */
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case "news":
      return "newspaper";
    case "pr":
      return "git-pull-request";
    case "expenditure":
      return "wallet";
    case "system":
      return "info";
  }
}

/**
 * Get the color class for a notification type.
 */
export function getNotificationColor(type: NotificationType): string {
  switch (type) {
    case "news":
      return "text-blue-500";
    case "pr":
      return "text-green-500";
    case "expenditure":
      return "text-orange-500";
    case "system":
      return "text-purple-500";
  }
}
