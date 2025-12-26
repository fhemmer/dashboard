import { describe, expect, it, vi } from "vitest";

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

import {
    excludeSource,
    getNewsItems,
    getNewsLastSeenAt,
    getSourcesWithExclusion,
    getUserExcludedSources,
    includeSource,
    markNewsAsRead,
    revalidateNews,
    toggleSourceExclusion,
} from "./actions";

describe("News Actions", () => {
  describe("getNewsItems", () => {
    it("returns news items from database", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "1",
                  title: "Test News",
                  summary: "Test summary",
                  link: "https://example.com",
                  image_url: null,
                  published_at: "2025-12-20T10:00:00Z",
                  source_id: "source-1",
                  news_sources: {
                    id: "source-1",
                    name: "Test Source",
                    icon_name: "rocket",
                    brand_color: "orange",
                    category: "dev",
                  },
                },
              ],
              error: null,
            }),
          }),
        }),
      });

      const result = await getNewsItems();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Test News");
      expect(result.items[0].source.name).toBe("Test Source");
      expect(result.error).toBeNull();
    });

    it("filters out excluded sources at database level for authenticated users", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      // First call: get user exclusions
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ source_id: "source-1" }],
            }),
          }),
        })
        // Second call: get news items (already filtered by DB)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                not: vi.fn().mockResolvedValue({
                  data: [], // Already filtered at DB level
                  error: null,
                }),
              }),
            }),
          }),
        });

      const result = await getNewsItems();
      expect(result.items).toHaveLength(0); // Filtered out at DB level
    });

    it("returns empty array and error on database error", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }),
        }),
      });

      const result = await getNewsItems();
      expect(result.items).toHaveLength(0);
      expect(result.error).toBe("Database error");
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

  describe("getSourcesWithExclusion", () => {
    it("returns sources with exclusion status", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "source-1",
                    name: "Source 1",
                    icon_name: "rocket",
                    brand_color: "orange",
                    category: "dev",
                  },
                ],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
            }),
          }),
        });

      const result = await getSourcesWithExclusion();
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].name).toBe("Source 1");
      expect(result.sources[0].isExcluded).toBe(false);
    });

    it("returns error when fetching sources fails", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "Database error" },
            }),
          }),
        }),
      });

      const result = await getSourcesWithExclusion();
      expect(result.sources).toEqual([]);
      expect(result.error).toBe("Database error");
    });

    it("marks sources as excluded when in user exclusions", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: "source-1",
                    name: "Source 1",
                    icon_name: "rocket",
                    brand_color: "orange",
                    category: "dev",
                  },
                  {
                    id: "source-2",
                    name: "Source 2",
                    icon_name: "star",
                    brand_color: "blue",
                    category: "news",
                  },
                ],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ source_id: "source-1" }],
            }),
          }),
        });

      const result = await getSourcesWithExclusion();
      expect(result.sources).toHaveLength(2);
      expect(result.sources[0].isExcluded).toBe(true);
      expect(result.sources[1].isExcluded).toBe(false);
    });
  });

  describe("getUserExcludedSources", () => {
    it("returns empty array when not authenticated", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const result = await getUserExcludedSources();
      expect(result).toEqual([]);
    });

    it("returns excluded source IDs", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ source_id: "source-1" }, { source_id: "source-2" }],
          }),
        }),
      });

      const result = await getUserExcludedSources();
      expect(result).toEqual(["source-1", "source-2"]);
    });
  });

  describe("toggleSourceExclusion", () => {
    it("returns failure when not authenticated", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const result = await toggleSourceExclusion("source-1");
      expect(result).toEqual({ success: false, isExcluded: false });
    });

    it("removes exclusion when source is already excluded", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { source_id: "source-1" } }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        });
      mockRevalidatePath.mockClear();

      const result = await toggleSourceExclusion("source-1");
      expect(result).toEqual({ success: true, isExcluded: false });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/news");
    });

    it("returns failure when delete fails during toggle", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { source_id: "source-1" } }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
            }),
          }),
        });

      const result = await toggleSourceExclusion("source-1");
      expect(result).toEqual({ success: false, isExcluded: true });
    });

    it("adds exclusion when source is not excluded", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: vi.fn().mockResolvedValue({ error: null }),
        });
      mockRevalidatePath.mockClear();

      const result = await toggleSourceExclusion("source-1");
      expect(result).toEqual({ success: true, isExcluded: true });
    });

    it("returns failure when insert fails during toggle", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: vi.fn().mockResolvedValue({ error: { message: "Insert failed" } }),
        });

      const result = await toggleSourceExclusion("source-1");
      expect(result).toEqual({ success: false, isExcluded: false });
    });
  });

  describe("excludeSource", () => {
    it("returns failure when not authenticated", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const result = await excludeSource("source-1");
      expect(result).toEqual({ success: false });
    });

    it("upserts exclusion record", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });
      mockRevalidatePath.mockClear();

      const result = await excludeSource("source-1");
      expect(result).toEqual({ success: true });
    });

    it("returns failure when upsert fails", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom.mockReturnValueOnce({
        upsert: vi.fn().mockResolvedValue({ error: { message: "Upsert failed" } }),
      });

      const result = await excludeSource("source-1");
      expect(result).toEqual({ success: false });
    });
  });

  describe("includeSource", () => {
    it("returns failure when not authenticated", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
      });

      const result = await includeSource("source-1");
      expect(result).toEqual({ success: false });
    });

    it("deletes exclusion record", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom.mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });
      mockRevalidatePath.mockClear();

      const result = await includeSource("source-1");
      expect(result).toEqual({ success: true });
    });

    it("returns failure when delete fails", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "user-123" } },
      });
      mockFrom.mockReturnValueOnce({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
          }),
        }),
      });

      const result = await includeSource("source-1");
      expect(result).toEqual({ success: false });
    });
  });
});
