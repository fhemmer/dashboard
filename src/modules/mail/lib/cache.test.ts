import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MailAccountSummary, MailMessage, MailSummary } from "../types";
import {
    cacheAccountSummary,
    cacheMessages,
    cacheSummary,
    getCachedAccountSummary,
    getCachedMessages,
    getCachedSummary,
    invalidateAllUserCaches,
    invalidateMessagesCache,
    invalidateSummaryCache,
} from "./cache";

// Mock redis module
const mockGetCache = vi.fn();
const mockSetCache = vi.fn();
const mockDeleteCache = vi.fn();
const mockDeleteCachePattern = vi.fn();

vi.mock("@/lib/redis", () => ({
  getCache: (key: string) => mockGetCache(key),
  setCache: (key: string, value: unknown, ttl: number) => mockSetCache(key, value, ttl),
  deleteCache: (key: string) => mockDeleteCache(key),
  deleteCachePattern: (pattern: string) => mockDeleteCachePattern(pattern),
}));

describe("mail cache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCachedSummary", () => {
    it("should get cached summary for user", async () => {
      const mockSummary: MailSummary = {
        accounts: [],
        totalUnread: 5,
      };
      mockGetCache.mockResolvedValue(mockSummary);

      const result = await getCachedSummary("user-123");

      expect(mockGetCache).toHaveBeenCalledWith("mail:summary:user-123");
      expect(result).toEqual(mockSummary);
    });

    it("should return null when no cached summary exists", async () => {
      mockGetCache.mockResolvedValue(null);

      const result = await getCachedSummary("user-123");

      expect(result).toBeNull();
    });
  });

  describe("cacheSummary", () => {
    it("should cache summary with correct TTL", async () => {
      const mockSummary: MailSummary = {
        accounts: [],
        totalUnread: 10,
      };
      mockSetCache.mockResolvedValue(true);

      const result = await cacheSummary("user-123", mockSummary);

      expect(mockSetCache).toHaveBeenCalledWith(
        "mail:summary:user-123",
        mockSummary,
        300 // SUMMARY_TTL
      );
      expect(result).toBe(true);
    });

    it("should return false when caching fails", async () => {
      mockSetCache.mockResolvedValue(false);

      const result = await cacheSummary("user-123", { accounts: [], totalUnread: 0 });

      expect(result).toBe(false);
    });
  });

  describe("invalidateSummaryCache", () => {
    it("should delete summary cache for user", async () => {
      mockDeleteCache.mockResolvedValue(true);

      const result = await invalidateSummaryCache("user-123");

      expect(mockDeleteCache).toHaveBeenCalledWith("mail:summary:user-123");
      expect(result).toBe(true);
    });
  });

  describe("getCachedMessages", () => {
    it("should get cached messages for account and folder", async () => {
      const mockMessages: MailMessage[] = [
        {
          id: "msg-1",
          accountId: "acc-1",
          provider: "gmail",
          subject: "Test",
          from: { email: "test@example.com" },
          to: [{ email: "me@example.com" }],
          receivedAt: new Date(),
          isRead: false,
          hasAttachments: false,
          preview: "Test message",
        },
      ];
      mockGetCache.mockResolvedValue(mockMessages);

      const result = await getCachedMessages("acc-1", "inbox");

      expect(mockGetCache).toHaveBeenCalledWith("mail:messages:acc-1:inbox");
      expect(result).toEqual(mockMessages);
    });

    it("should use default folder when not specified", async () => {
      mockGetCache.mockResolvedValue([]);

      await getCachedMessages("acc-1");

      expect(mockGetCache).toHaveBeenCalledWith("mail:messages:acc-1:inbox");
    });
  });

  describe("cacheMessages", () => {
    it("should cache messages with correct TTL", async () => {
      const mockMessages: MailMessage[] = [];
      mockSetCache.mockResolvedValue(true);

      const result = await cacheMessages("acc-1", "sent", mockMessages);

      expect(mockSetCache).toHaveBeenCalledWith(
        "mail:messages:acc-1:sent",
        mockMessages,
        300 // MESSAGES_TTL
      );
      expect(result).toBe(true);
    });
  });

  describe("invalidateMessagesCache", () => {
    it("should delete all message caches for account", async () => {
      mockDeleteCachePattern.mockResolvedValue(5);

      const result = await invalidateMessagesCache("acc-1");

      expect(mockDeleteCachePattern).toHaveBeenCalledWith("mail:messages:acc-1:*");
      expect(result).toBe(5);
    });
  });

  describe("getCachedAccountSummary", () => {
    it("should get cached account summary", async () => {
      const mockAccountSummary: MailAccountSummary = {
        accountId: "acc-1",
        accountName: "Test Account",
        provider: "outlook",
        emailAddress: "test@outlook.com",
        unreadCount: 3,
        totalCount: 100,
      };
      mockGetCache.mockResolvedValue(mockAccountSummary);

      const result = await getCachedAccountSummary("acc-1");

      expect(mockGetCache).toHaveBeenCalledWith("mail:account:acc-1");
      expect(result).toEqual(mockAccountSummary);
    });
  });

  describe("cacheAccountSummary", () => {
    it("should cache account summary with correct TTL", async () => {
      const mockAccountSummary: MailAccountSummary = {
        accountId: "acc-1",
        accountName: "Test",
        provider: "gmail",
        emailAddress: "test@gmail.com",
        unreadCount: 0,
        totalCount: 0,
      };
      mockSetCache.mockResolvedValue(true);

      const result = await cacheAccountSummary("acc-1", mockAccountSummary);

      expect(mockSetCache).toHaveBeenCalledWith(
        "mail:account:acc-1",
        mockAccountSummary,
        600 // ACCOUNT_TTL
      );
      expect(result).toBe(true);
    });
  });

  describe("invalidateAllUserCaches", () => {
    it("should invalidate summary and all specified account caches", async () => {
      mockDeleteCache.mockResolvedValue(true);
      mockDeleteCachePattern.mockResolvedValue(1);

      await invalidateAllUserCaches("user-123", ["acc-1", "acc-2"]);

      // Should delete summary cache
      expect(mockDeleteCache).toHaveBeenCalledWith("mail:summary:user-123");

      // Should delete account caches
      expect(mockDeleteCache).toHaveBeenCalledWith("mail:account:acc-1");
      expect(mockDeleteCache).toHaveBeenCalledWith("mail:account:acc-2");

      // Should delete message pattern caches
      expect(mockDeleteCachePattern).toHaveBeenCalledWith("mail:messages:acc-1:*");
      expect(mockDeleteCachePattern).toHaveBeenCalledWith("mail:messages:acc-2:*");
    });

    it("should handle empty account list", async () => {
      mockDeleteCache.mockResolvedValue(true);

      await invalidateAllUserCaches("user-123", []);

      // Should only delete summary cache
      expect(mockDeleteCache).toHaveBeenCalledTimes(1);
      expect(mockDeleteCache).toHaveBeenCalledWith("mail:summary:user-123");
      expect(mockDeleteCachePattern).not.toHaveBeenCalled();
    });
  });
});
