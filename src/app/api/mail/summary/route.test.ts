import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules before importing
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/modules/mail/lib/cache", () => ({
  getCachedSummary: vi.fn(),
  cacheSummary: vi.fn(),
}));

vi.mock("@/modules/mail/actions", () => ({
  getMailSummary: vi.fn(),
}));

import * as supabaseModule from "@/lib/supabase/server";
import * as actionsModule from "@/modules/mail/actions";
import * as cacheModule from "@/modules/mail/lib/cache";
import { GET } from "./route";

describe("mail summary route", () => {
  const mockCreateClient = vi.mocked(supabaseModule.createClient);
  const mockGetCachedSummary = vi.mocked(cacheModule.getCachedSummary);
  const mockCacheSummary = vi.mocked(cacheModule.cacheSummary);
  const mockGetMailSummary = vi.mocked(actionsModule.getMailSummary);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should return 401 when not authenticated", async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      } as never);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });

    it("should return cached summary when available", async () => {
      const mockUser = { id: "user-1" };
      const cachedData = {
        accounts: [{
          accountId: "acc-1",
          accountName: "Test",
          provider: "outlook" as const,
          emailAddress: "test@outlook.com",
          unreadCount: 5,
          totalCount: 10
        }],
        totalUnread: 5,
      };

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      } as never);

      mockGetCachedSummary.mockResolvedValue(cachedData);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(cachedData);
      expect(mockGetMailSummary).not.toHaveBeenCalled();
    });

    it("should fetch fresh data when cache is empty", async () => {
      const mockUser = { id: "user-1" };
      const freshData = {
        accounts: [{
          accountId: "acc-1",
          accountName: "Test",
          provider: "outlook" as const,
          emailAddress: "test@outlook.com",
          unreadCount: 10,
          totalCount: 20
        }],
        totalUnread: 10,
      };

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      } as never);

      mockGetCachedSummary.mockResolvedValue(null);
      mockGetMailSummary.mockResolvedValue(freshData);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(freshData);
      expect(mockCacheSummary).toHaveBeenCalledWith("user-1", freshData);
    });

    it("should not cache when summary has error", async () => {
      const mockUser = { id: "user-1" };
      const errorData = {
        accounts: [],
        totalUnread: 0,
        error: "Failed to fetch",
      };

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      } as never);

      mockGetCachedSummary.mockResolvedValue(null);
      mockGetMailSummary.mockResolvedValue(errorData);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(errorData);
      expect(mockCacheSummary).not.toHaveBeenCalled();
    });

    it("should return 500 on unexpected error", async () => {
      mockCreateClient.mockRejectedValue(new Error("Database error"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
