import { describe, expect, it } from "vitest";
import {
    dismissAllNotifications,
    dismissNotification,
    dismissNotificationsByType,
    getNotificationColor,
    getNotificationIcon,
    getNotifications,
    getUnreadCount,
    NotificationBell,
    NotificationBellServer,
    NotificationBellWrapper,
    NotificationItem,
    NotificationList,
    toNotification,
} from "./index";

describe("notifications module exports", () => {
  it("exports getNotifications", () => {
    expect(getNotifications).toBeDefined();
    expect(typeof getNotifications).toBe("function");
  });

  it("exports getUnreadCount", () => {
    expect(getUnreadCount).toBeDefined();
    expect(typeof getUnreadCount).toBe("function");
  });

  it("exports dismissNotification", () => {
    expect(dismissNotification).toBeDefined();
    expect(typeof dismissNotification).toBe("function");
  });

  it("exports dismissAllNotifications", () => {
    expect(dismissAllNotifications).toBeDefined();
    expect(typeof dismissAllNotifications).toBe("function");
  });

  it("exports dismissNotificationsByType", () => {
    expect(dismissNotificationsByType).toBeDefined();
    expect(typeof dismissNotificationsByType).toBe("function");
  });

  it("exports NotificationBell", () => {
    expect(NotificationBell).toBeDefined();
  });

  it("exports NotificationBellServer", () => {
    expect(NotificationBellServer).toBeDefined();
  });

  it("exports NotificationBellWrapper", () => {
    expect(NotificationBellWrapper).toBeDefined();
  });

  it("exports NotificationItem", () => {
    expect(NotificationItem).toBeDefined();
  });

  it("exports NotificationList", () => {
    expect(NotificationList).toBeDefined();
  });

  it("exports toNotification", () => {
    expect(toNotification).toBeDefined();
    expect(typeof toNotification).toBe("function");
  });

  it("exports getNotificationIcon", () => {
    expect(getNotificationIcon).toBeDefined();
    expect(typeof getNotificationIcon).toBe("function");
  });

  it("exports getNotificationColor", () => {
    expect(getNotificationColor).toBeDefined();
    expect(typeof getNotificationColor).toBe("function");
  });
});
