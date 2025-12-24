import { createClient } from "@/lib/supabase/server";
import {
  getNotifications,
  getUnreadCount,
  NotificationBellWrapper,
} from "@/modules/notifications";

/**
 * Server component that fetches notification data and renders the bell.
 * Should be used in server components like layout.tsx
 */
export async function NotificationBellServer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [notificationsResult, countResult] = await Promise.all([
    getNotifications(10),
    getUnreadCount(),
  ]);

  return (
    <NotificationBellWrapper
      initialNotifications={notificationsResult.notifications}
      initialCount={countResult.count}
    />
  );
}
