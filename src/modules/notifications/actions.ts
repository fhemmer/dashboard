"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  DismissResult,
  Notification,
  NotificationsResult,
  UnreadCountResult,
} from "./types";
import { toNotification } from "./types";

/**
 * Get notifications for the current user.
 * Returns most recent notifications up to the specified limit.
 */
export async function getNotifications(
  limit: number = 10
): Promise<NotificationsResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { notifications: [], error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching notifications:", error);
      return { notifications: [], error: error.message };
    }

    const notifications: Notification[] = (data ?? []).map(toNotification);
    return { notifications, error: null };
  } catch (err) {
    console.error("Error in getNotifications:", err);
    return {
      notifications: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get the count of unread (all) notifications for the current user.
 * Since notifications are ephemeral and deleted on dismiss,
 * all existing notifications are considered "unread".
 */
export async function getUnreadCount(): Promise<UnreadCountResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { count: 0, error: "Not authenticated" };
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (error) {
      console.error("Error fetching notification count:", error);
      return { count: 0, error: error.message };
    }

    return { count: count ?? 0, error: null };
  } catch (err) {
    console.error("Error in getUnreadCount:", err);
    return {
      count: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Dismiss (delete) a single notification.
 */
export async function dismissNotification(
  notificationId: string
): Promise<DismissResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error dismissing notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Error in dismissNotification:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Dismiss all notifications for the current user.
 */
export async function dismissAllNotifications(): Promise<DismissResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      console.error("Error dismissing all notifications:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Error in dismissAllNotifications:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Dismiss notifications by type.
 */
export async function dismissNotificationsByType(
  type: string
): Promise<DismissResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("type", type);

    if (error) {
      console.error("Error dismissing notifications by type:", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error("Error in dismissNotificationsByType:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
