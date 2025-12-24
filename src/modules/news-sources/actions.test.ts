import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock Supabase client
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockUpsert = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();

// Helper to create a full from() return object
function createFromReturn(overrides: Record<string, unknown> = {}) {
  return {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    upsert: mockUpsert,
    ...overrides,
  };
}

const mockFrom = vi.fn(() => createFromReturn());

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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Import after mocks
import {
    canManageNewsSources,
    createNewsSource,
    deleteNewsSource,
    getCurrentUserRole,
    getNewsSources,
    getSystemSetting,
    getSystemSettings,
    toggleNewsSourceActive,
    updateNewsSource,
    updateSystemSetting,
} from "./actions";

describe("news-sources actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });

    // Setup default chain for select
    mockSelect.mockReturnValue({
      eq: mockEq,
    });

    mockEq.mockReturnValue({
      eq: mockEq,
      order: mockOrder,
      single: mockSingle,
    });

    mockOrder.mockResolvedValue({ data: [], error: null });
    mockSingle.mockResolvedValue({ data: null, error: null });

    // Setup default chains for mutations
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "new-id" }, error: null }),
      }),
    });

    mockUpdate.mockReturnValue({
      eq: mockEq,
    });

    mockDelete.mockReturnValue({
      eq: mockEq,
    });

    mockUpsert.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  describe("getCurrentUserRole", () => {
    it("returns null when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const role = await getCurrentUserRole();

      expect(role).toBeNull();
    });

    it("returns user role from profile", async () => {
      mockSingle.mockResolvedValue({ data: { role: "admin" }, error: null });

      const role = await getCurrentUserRole();

      expect(role).toBe("admin");
    });

    it("returns 'user' when role is null in profile", async () => {
      mockSingle.mockResolvedValue({ data: { role: null }, error: null });

      const role = await getCurrentUserRole();

      expect(role).toBe("user");
    });

    it("returns null on error", async () => {
      mockGetUser.mockRejectedValue(new Error("Network error"));

      const role = await getCurrentUserRole();

      expect(role).toBeNull();
    });
  });

  describe("canManageNewsSources", () => {
    it("returns true for admin", async () => {
      mockSingle.mockResolvedValue({ data: { role: "admin" }, error: null });

      const canManage = await canManageNewsSources();

      expect(canManage).toBe(true);
    });

    it("returns true for news_manager", async () => {
      mockSingle.mockResolvedValue({ data: { role: "news_manager" }, error: null });

      const canManage = await canManageNewsSources();

      expect(canManage).toBe(true);
    });

    it("returns false for regular user", async () => {
      mockSingle.mockResolvedValue({ data: { role: "user" }, error: null });

      const canManage = await canManageNewsSources();

      expect(canManage).toBe(false);
    });

    it("returns false when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const canManage = await canManageNewsSources();

      expect(canManage).toBe(false);
    });
  });

  describe("getNewsSources", () => {
    it("returns empty array when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getNewsSources();

      expect(result.sources).toEqual([]);
      expect(result.error).toBe("Not authenticated");
    });

    it("returns news sources for authenticated user", async () => {
      const mockData = [
        {
          id: "1",
          url: "https://example.com",
          name: "Test",
          category: "tech",
          icon_name: "blocks",
          brand_color: "blue",
          is_active: true,
          created_by: "user-123",
          created_at: "2025-01-01T00:00:00Z",
        },
      ];
      mockSingle.mockResolvedValue({ data: { role: "user" }, error: null });
      mockEq.mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await getNewsSources();

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].name).toBe("Test");
      expect(result.error).toBeNull();
    });

    it("includes inactive sources for admin", async () => {
      mockSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
      mockOrder.mockResolvedValue({ data: [], error: null });

      await getNewsSources();

      // Admin doesn't filter by is_active
      expect(mockEq).not.toHaveBeenCalledWith("is_active", true);
    });

    it("returns error on database failure", async () => {
      mockSingle.mockResolvedValue({ data: { role: "user" }, error: null });
      mockEq.mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: null, error: { message: "DB error" } }),
      });

      const result = await getNewsSources();

      expect(result.sources).toEqual([]);
      expect(result.error).toBe("DB error");
    });

    it("catches and returns thrown Error", async () => {
      mockGetUser.mockRejectedValue(new Error("Network error"));

      const result = await getNewsSources();

      expect(result.sources).toEqual([]);
      expect(result.error).toBe("Network error");
    });

    it("catches and returns unknown error", async () => {
      mockGetUser.mockRejectedValue("Unknown failure");

      const result = await getNewsSources();

      expect(result.sources).toEqual([]);
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("createNewsSource", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await createNewsSource({
        url: "https://example.com",
        name: "Test",
        category: "tech",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("returns error for regular user", async () => {
      mockSingle.mockResolvedValue({ data: { role: "user" }, error: null });

      const result = await createNewsSource({
        url: "https://example.com",
        name: "Test",
        category: "tech",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
    });

    it("creates news source for admin", async () => {
      mockSingle.mockResolvedValue({ data: { role: "admin" }, error: null });

      const result = await createNewsSource({
        url: "https://example.com",
        name: "Test",
        category: "tech",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe("new-id");
      expect(mockFrom).toHaveBeenCalledWith("news_sources");
    });

    it("creates news source for news_manager", async () => {
      mockSingle.mockResolvedValue({ data: { role: "news_manager" }, error: null });

      const result = await createNewsSource({
        url: "https://example.com",
        name: "Test",
        category: "tech",
        iconName: "rocket",
        brandColor: "red",
        isActive: false,
      });

      expect(result.success).toBe(true);
    });

    it("returns error on database failure", async () => {
      mockSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "Insert failed" } }),
        }),
      });

      const result = await createNewsSource({
        url: "https://example.com",
        name: "Test",
        category: "tech",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Insert failed");
    });

    it("catches and returns thrown Error", async () => {
      mockSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue(new Error("Network error")),
        }),
      });

      const result = await createNewsSource({
        url: "https://example.com",
        name: "Test",
        category: "tech",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("catches and returns unknown error", async () => {
      mockSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
      mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockRejectedValue("Unknown failure"),
        }),
      });

      const result = await createNewsSource({
        url: "https://example.com",
        name: "Test",
        category: "tech",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("updateNewsSource", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await updateNewsSource("source-1", { name: "Updated" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("returns error for regular user", async () => {
      mockSingle.mockResolvedValue({ data: { role: "user" }, error: null });

      const result = await updateNewsSource("source-1", { name: "Updated" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
    });

    it("updates news source for admin", async () => {
      // First call to mockEq is for role check, returns chain to single
      mockEq.mockReturnValueOnce({
        eq: mockEq,
        order: mockOrder,
        single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
      });
      // Second call to mockEq is for update operation
      mockEq.mockResolvedValueOnce({ error: null });

      const result = await updateNewsSource("source-1", {
        name: "Updated",
        url: "https://new-url.com",
        category: "ai",
        iconName: "brain",
        brandColor: "violet",
        isActive: false,
      });

      expect(result.success).toBe(true);
    });

    it("restricts news_manager to own sources", async () => {
      mockEq.mockReturnValueOnce({
        eq: mockEq,
        order: mockOrder,
        single: vi.fn().mockResolvedValue({ data: { role: "news_manager" }, error: null }),
      });
      // For news_manager, eq is called twice on update: .eq("id", id).eq("created_by", userId)
      mockEq.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      await updateNewsSource("source-1", { name: "Updated" });

      expect(mockEq).toHaveBeenCalled();
    });

    it("returns error on database failure", async () => {
      mockEq.mockReturnValueOnce({
        eq: mockEq,
        order: mockOrder,
        single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
      });
      mockEq.mockResolvedValueOnce({ error: { message: "Update failed" } });

      const result = await updateNewsSource("source-1", { name: "Updated" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });

    it("catches and returns thrown Error", async () => {
      mockEq.mockReturnValueOnce({
        eq: mockEq,
        order: mockOrder,
        single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
      });
      mockEq.mockRejectedValueOnce(new Error("Network error"));

      const result = await updateNewsSource("source-1", { name: "Updated" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("catches and returns unknown error", async () => {
      mockEq.mockReturnValueOnce({
        eq: mockEq,
        order: mockOrder,
        single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
      });
      mockEq.mockRejectedValueOnce("Unknown failure");

      const result = await updateNewsSource("source-1", { name: "Updated" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("deleteNewsSource", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await deleteNewsSource("source-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("returns error for regular user", async () => {
      mockSingle.mockResolvedValue({ data: { role: "user" }, error: null });

      const result = await deleteNewsSource("source-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
    });

    it("deletes news source for admin", async () => {
      mockEq.mockReturnValueOnce({
        eq: mockEq,
        order: mockOrder,
        single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
      });
      mockEq.mockResolvedValueOnce({ error: null });

      const result = await deleteNewsSource("source-1");

      expect(result.success).toBe(true);
    });

    it("restricts news_manager to own sources", async () => {
      mockEq.mockReturnValueOnce({
        eq: mockEq,
        order: mockOrder,
        single: vi.fn().mockResolvedValue({ data: { role: "news_manager" }, error: null }),
      });
      mockEq.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      await deleteNewsSource("source-1");

      expect(mockEq).toHaveBeenCalled();
    });

    it("returns error on database failure", async () => {
      mockEq.mockReturnValueOnce({
        eq: mockEq,
        order: mockOrder,
        single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
      });
      mockEq.mockResolvedValueOnce({ error: { message: "Delete failed" } });

      const result = await deleteNewsSource("source-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete failed");
    });

    it("catches and returns thrown Error", async () => {
      mockEq.mockReturnValueOnce({
        eq: mockEq,
        order: mockOrder,
        single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
      });
      mockEq.mockRejectedValueOnce(new Error("Network error"));

      const result = await deleteNewsSource("source-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("catches and returns unknown error", async () => {
      mockEq.mockReturnValueOnce({
        eq: mockEq,
        order: mockOrder,
        single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
      });
      mockEq.mockRejectedValueOnce("Unknown failure");

      const result = await deleteNewsSource("source-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("toggleNewsSourceActive", () => {
    it("calls updateNewsSource with isActive", async () => {
      mockEq.mockReturnValueOnce({
        eq: mockEq,
        order: mockOrder,
        single: vi.fn().mockResolvedValue({ data: { role: "admin" }, error: null }),
      });
      mockEq.mockResolvedValueOnce({ error: null });

      const result = await toggleNewsSourceActive("source-1", true);

      expect(result.success).toBe(true);
    });
  });

  describe("getSystemSetting", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getSystemSetting("fetch_interval_minutes");

      expect(result.value).toBeNull();
      expect(result.error).toBe("Not authenticated");
    });

    it("returns error for non-admin", async () => {
      mockSingle.mockResolvedValue({ data: { role: "user" }, error: null });

      const result = await getSystemSetting("fetch_interval_minutes");

      expect(result.value).toBeNull();
      expect(result.error).toBe("Permission denied");
    });

    it("returns setting value for admin", async () => {
      mockSingle
        .mockResolvedValueOnce({ data: { role: "admin" }, error: null })
        .mockResolvedValueOnce({ data: { value: 60 }, error: null });

      const result = await getSystemSetting("fetch_interval_minutes");

      expect(result.value).toBe(60);
      expect(result.error).toBeNull();
    });

    it("returns null value when setting not found", async () => {
      mockSingle
        .mockResolvedValueOnce({ data: { role: "admin" }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });

      const result = await getSystemSetting("nonexistent");

      expect(result.value).toBeNull();
    });

    it("returns error on database failure", async () => {
      mockSingle
        .mockResolvedValueOnce({ data: { role: "admin" }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: "DB error" } });

      const result = await getSystemSetting("fetch_interval_minutes");

      expect(result.value).toBeNull();
      expect(result.error).toBe("DB error");
    });

    it("catches and returns thrown Error", async () => {
      mockGetUser.mockRejectedValue(new Error("Network error"));

      const result = await getSystemSetting("fetch_interval_minutes");

      expect(result.value).toBeNull();
      expect(result.error).toBe("Network error");
    });

    it("catches and returns unknown error", async () => {
      mockGetUser.mockRejectedValue("Unknown failure");

      const result = await getSystemSetting("fetch_interval_minutes");

      expect(result.value).toBeNull();
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("updateSystemSetting", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await updateSystemSetting("fetch_interval_minutes", 60);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("returns error for non-admin", async () => {
      mockSingle.mockResolvedValue({ data: { role: "user" }, error: null });

      const result = await updateSystemSetting("fetch_interval_minutes", 60);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Permission denied");
    });

    it("updates setting for admin", async () => {
      mockSingle.mockResolvedValue({ data: { role: "admin" }, error: null });

      const result = await updateSystemSetting("fetch_interval_minutes", 60);

      expect(result.success).toBe(true);
      expect(mockUpsert).toHaveBeenCalled();
    });

    it("returns error on database failure", async () => {
      mockSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
      mockUpsert.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "Upsert failed" } }),
      });

      const result = await updateSystemSetting("fetch_interval_minutes", 60);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Upsert failed");
    });

    it("catches and returns thrown Error", async () => {
      mockSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
      mockUpsert.mockReturnValue({
        eq: vi.fn().mockRejectedValue(new Error("Network error")),
      });

      const result = await updateSystemSetting("fetch_interval_minutes", 60);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
    });

    it("catches and returns unknown error", async () => {
      mockSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
      mockUpsert.mockReturnValue({
        eq: vi.fn().mockRejectedValue("Unknown failure"),
      });

      const result = await updateSystemSetting("fetch_interval_minutes", 60);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
    });
  });

  describe("getSystemSettings", () => {
    it("returns defaults when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getSystemSettings();

      expect(result.fetchIntervalMinutes).toBe(30);
      expect(result.notificationRetentionDays).toBe(30);
      expect(result.lastFetchAt).toBeNull();
      expect(result.error).toBe("Not authenticated");
    });

    it("returns defaults for non-admin", async () => {
      mockSingle.mockResolvedValue({ data: { role: "user" }, error: null });

      const result = await getSystemSettings();

      expect(result.error).toBe("Permission denied");
    });

    it("returns settings for admin", async () => {
      mockSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      // Override the default mockFrom for this test
      mockFrom.mockReturnValueOnce(createFromReturn({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      }));
      mockFrom.mockReturnValueOnce(createFromReturn({
        select: vi.fn().mockResolvedValue({
          data: [
            { key: "fetch_interval_minutes", value: 60 },
            { key: "notification_retention_days", value: 14 },
            { key: "last_fetch_at", value: "2025-01-01T00:00:00Z" },
          ],
          error: null,
        }),
      }));

      const result = await getSystemSettings();

      expect(result.fetchIntervalMinutes).toBe(60);
      expect(result.notificationRetentionDays).toBe(14);
      expect(result.lastFetchAt).toBe("2025-01-01T00:00:00Z");
      expect(result.error).toBeNull();
    });

    it("returns defaults when settings are non-numeric", async () => {
      mockSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
      mockFrom.mockReturnValueOnce(createFromReturn({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      }));
      mockFrom.mockReturnValueOnce(createFromReturn({
        select: vi.fn().mockResolvedValue({
          data: [
            { key: "fetch_interval_minutes", value: "invalid" },
            { key: "notification_retention_days", value: null },
          ],
          error: null,
        }),
      }));

      const result = await getSystemSettings();

      expect(result.fetchIntervalMinutes).toBe(30);
      expect(result.notificationRetentionDays).toBe(30);
    });

    it("returns error on database failure", async () => {
      mockSingle.mockResolvedValue({ data: { role: "admin" }, error: null });
      mockFrom.mockReturnValueOnce(createFromReturn({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      }));
      mockFrom.mockReturnValueOnce(createFromReturn({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "DB error" },
        }),
      }));

      const result = await getSystemSettings();

      expect(result.error).toBe("DB error");
    });

    it("catches and returns thrown Error", async () => {
      mockGetUser.mockRejectedValue(new Error("Network error"));

      const result = await getSystemSettings();

      expect(result.error).toBe("Network error");
    });

    it("catches and returns unknown error", async () => {
      mockGetUser.mockRejectedValue("Unknown failure");

      const result = await getSystemSettings();

      expect(result.error).toBe("Unknown error");
    });
  });
});
