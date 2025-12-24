import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Supabase client
const mockSelect = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  delete: mockDelete,
}));

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
      auth: {
        getUser: mockGetUser,
      },
    })
  ),
}));

// Import after mocks
import {
  dismissAllNotifications,
  dismissNotification,
  dismissNotificationsByType,
  getNotifications,
  getUnreadCount,
} from "./actions";

describe("notifications actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default chain for select
    mockSelect.mockReturnValue({
      eq: mockEq,
    });
    mockEq.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
    });
    mockOrder.mockReturnValue({
      limit: mockLimit,
    });
    mockLimit.mockResolvedValue({ data: [], error: null });

    // Setup default chain for delete
    mockDelete.mockReturnValue({
      eq: mockEq,
    });

    // Default authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
  });

  describe("getNotifications", () => {
    it("returns empty array when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getNotifications();

      expect(result.notifications).toEqual([]);
      expect(result.error).toBe("Not authenticated");
    });

    it("returns notifications for authenticated user", async () => {
      const mockData = [
        {
          id: "1",
          user_id: "user-123",
          type: "news",
          title: "Test",
          message: null,
          metadata: null,
          created_at: "2025-01-01T00:00:00Z",
        },
      ];
      mockLimit.mockResolvedValue({ data: mockData, error: null });

      const result = await getNotifications();

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].title).toBe("Test");
      expect(result.error).toBeNull();
    });

    it("respects limit parameter", async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });

      await getNotifications(5);

      expect(mockLimit).toHaveBeenCalledWith(5);
    });

    it("returns error on database failure", async () => {
      mockLimit.mockResolvedValue({ data: null, error: { message: "DB error" } });

      const result = await getNotifications();

      expect(result.notifications).toEqual([]);
      expect(result.error).toBe("DB error");
    });

    it("catches and returns thrown Error", async () => {
      mockGetUser.mockRejectedValue(new Error("Network error"));

      const result = await getNotifications();

      expect(result.notifications).toEqual([]);
      expect(result.error).toBe("Network error");
    });

    it("catches and returns unknown error", async () => {
      mockGetUser.mockRejectedValue("Unknown failure");

      const result = await getNotifications();

      expect(result.notifications).toEqual([]);
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("getUnreadCount", () => {
    it("returns 0 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getUnreadCount();

      expect(result.count).toBe(0);
      expect(result.error).toBe("Not authenticated");
    });

    it("returns count for authenticated user", async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
      });

      const result = await getUnreadCount();

      expect(result.count).toBe(5);
      expect(result.error).toBeNull();
    });

    it("returns 0 on error", async () => {
      mockSelect.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: null, error: { message: "DB error" } }),
      });

      const result = await getUnreadCount();

      expect(result.count).toBe(0);
      expect(result.error).toBe("DB error");
    });

    it("catches and returns thrown Error", async () => {
      mockGetUser.mockRejectedValue(new Error("Network error"));

      const result = await getUnreadCount();

      expect(result.count).toBe(0);
      expect(result.error).toBe("Network error");
    });

    it("catches and returns unknown error", async () => {
      mockGetUser.mockRejectedValue("Unknown failure");

      const result = await getUnreadCount();

      expect(result.count).toBe(0);
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("dismissNotification", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await dismissNotification("notif-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("deletes notification for authenticated user", async () => {
      mockEq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const result = await dismissNotification("notif-1");

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
      expect(mockFrom).toHaveBeenCalledWith("notifications");
      expect(mockDelete).toHaveBeenCalled();
    });

    it("returns error on database failure", async () => {
      mockEq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
      });

      const result = await dismissNotification("notif-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete failed");
    });

    it("catches and returns thrown Error", async () => {
      mockGetUser.mockRejectedValue(new Error("Network error"));

      const result = await dismissNotification("notif-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("catches and returns unknown error", async () => {
      mockGetUser.mockRejectedValue("Unknown failure");

      const result = await dismissNotification("notif-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("dismissAllNotifications", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await dismissAllNotifications();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("deletes all notifications for user", async () => {
      mockEq.mockResolvedValue({ error: null });

      const result = await dismissAllNotifications();

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it("returns error on database failure", async () => {
      mockEq.mockResolvedValue({ error: { message: "Delete failed" } });

      const result = await dismissAllNotifications();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete failed");
    });

    it("catches and returns thrown Error", async () => {
      mockGetUser.mockRejectedValue(new Error("Network error"));

      const result = await dismissAllNotifications();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("catches and returns unknown error", async () => {
      mockGetUser.mockRejectedValue("Unknown failure");

      const result = await dismissAllNotifications();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("dismissNotificationsByType", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await dismissNotificationsByType("news");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("deletes notifications by type", async () => {
      mockEq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const result = await dismissNotificationsByType("news");

      expect(result.success).toBe(true);
      expect(result.error).toBeNull();
    });

    it("returns error on database failure", async () => {
      mockEq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
      });

      const result = await dismissNotificationsByType("news");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete failed");
    });

    it("catches and returns thrown Error", async () => {
      mockGetUser.mockRejectedValue(new Error("Network error"));

      const result = await dismissNotificationsByType("news");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("catches and returns unknown error", async () => {
      mockGetUser.mockRejectedValue("Unknown failure");

      const result = await dismissNotificationsByType("news");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });
});
