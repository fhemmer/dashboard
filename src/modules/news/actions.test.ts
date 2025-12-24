import { describe, expect, it, vi } from "vitest";

vi.mock("./lib/fetcher", () => ({
  fetchAllNews: vi.fn().mockResolvedValue({
    items: [
      {
        id: "1",
        title: "Test News",
        summary: "Test summary",
        source: "Test Source",
        url: "https://example.com",
        publishedAt: new Date("2025-12-20T10:00:00Z"),
        category: "dev",
      },
    ],
    errors: [],
  }),
}));

const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

import { fetchNews, getNewsLastSeenAt, markNewsAsRead, revalidateNews } from "./actions";

describe("News Actions", () => {
  describe("fetchNews", () => {
    it("returns news items and errors", async () => {
      const result = await fetchNews();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Test News");
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("revalidateNews", () => {
    it("calls revalidatePath with /news", async () => {
      mockRevalidatePath.mockClear();
      await revalidateNews();
      expect(mockRevalidatePath).toHaveBeenCalledWith("/news");
    });
  });

  describe("getNewsLastSeenAt", () => {
    it("returns null when user is not authenticated", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const result = await getNewsLastSeenAt();
      expect(result).toBeNull();
    });

    it("returns null when news_last_seen_at is not set", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { news_last_seen_at: null } }),
          }),
        }),
      });

      const result = await getNewsLastSeenAt();
      expect(result).toBeNull();
    });

    it("returns date when news_last_seen_at is set", async () => {
      const timestamp = "2025-12-20T10:00:00Z";
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { news_last_seen_at: timestamp } }),
          }),
        }),
      });

      const result = await getNewsLastSeenAt();
      expect(result).toEqual(new Date(timestamp));
    });
  });

  describe("markNewsAsRead", () => {
    it("returns false when user is not authenticated", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const result = await markNewsAsRead();
      expect(result).toEqual({ success: false });
    });

    it("updates news_last_seen_at for authenticated user", async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom.mockReturnValueOnce({
        update: mockUpdate,
      });
      mockRevalidatePath.mockClear();

      const result = await markNewsAsRead();

      expect(result).toEqual({ success: true });
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith("/news");
    });

    it("returns false when update fails", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error("Update failed") }),
        }),
      });

      const result = await markNewsAsRead();
      expect(result).toEqual({ success: false });
    });
  });
});
