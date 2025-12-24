import { describe, expect, it } from "vitest";
import type { NotificationRow } from "./types";
import {
  getNotificationColor,
  getNotificationIcon,
  toNotification,
} from "./types";

describe("notifications types", () => {
  describe("toNotification", () => {
    it("converts database row to notification object", () => {
      const row: NotificationRow = {
        id: "123",
        user_id: "user-456",
        type: "news",
        title: "Test Title",
        message: "Test message",
        metadata: { type: "news", sourceId: "src-1", sourceName: "Test Source", itemCount: 5 },
        created_at: "2025-01-01T12:00:00Z",
      };

      const notification = toNotification(row);

      expect(notification).toEqual({
        id: "123",
        userId: "user-456",
        type: "news",
        title: "Test Title",
        message: "Test message",
        metadata: { type: "news", sourceId: "src-1", sourceName: "Test Source", itemCount: 5 },
        createdAt: new Date("2025-01-01T12:00:00Z"),
      });
    });

    it("handles null message", () => {
      const row: NotificationRow = {
        id: "123",
        user_id: "user-456",
        type: "system",
        title: "System Alert",
        message: null,
        metadata: { type: "system" },
        created_at: "2025-01-01T12:00:00Z",
      };

      const notification = toNotification(row);

      expect(notification.message).toBeNull();
    });

    it("handles null metadata", () => {
      const row: NotificationRow = {
        id: "123",
        user_id: "user-456",
        type: "pr",
        title: "PR Update",
        message: null,
        metadata: null,
        created_at: "2025-01-01T12:00:00Z",
      };

      const notification = toNotification(row);

      expect(notification.metadata).toEqual({ type: "pr" });
    });

    it("converts all notification types", () => {
      const types = ["news", "pr", "expenditure", "system"] as const;

      for (const type of types) {
        const row: NotificationRow = {
          id: `id-${type}`,
          user_id: "user-1",
          type,
          title: `${type} notification`,
          message: null,
          metadata: null,
          created_at: "2025-01-01T12:00:00Z",
        };

        const notification = toNotification(row);
        expect(notification.type).toBe(type);
      }
    });
  });

  describe("getNotificationIcon", () => {
    it("returns correct icon for news", () => {
      expect(getNotificationIcon("news")).toBe("newspaper");
    });

    it("returns correct icon for pr", () => {
      expect(getNotificationIcon("pr")).toBe("git-pull-request");
    });

    it("returns correct icon for expenditure", () => {
      expect(getNotificationIcon("expenditure")).toBe("wallet");
    });

    it("returns correct icon for system", () => {
      expect(getNotificationIcon("system")).toBe("info");
    });
  });

  describe("getNotificationColor", () => {
    it("returns correct color for news", () => {
      expect(getNotificationColor("news")).toBe("text-blue-500");
    });

    it("returns correct color for pr", () => {
      expect(getNotificationColor("pr")).toBe("text-green-500");
    });

    it("returns correct color for expenditure", () => {
      expect(getNotificationColor("expenditure")).toBe("text-orange-500");
    });

    it("returns correct color for system", () => {
      expect(getNotificationColor("system")).toBe("text-purple-500");
    });
  });
});
