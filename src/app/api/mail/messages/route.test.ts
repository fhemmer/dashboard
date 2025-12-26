import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules before importing
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/modules/mail/lib/cache", () => ({
  getCachedMessages: vi.fn(),
  cacheMessages: vi.fn(),
}));

vi.mock("@/modules/mail/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/modules/mail/lib/gmail-client", () => ({
  getGmailMessages: vi.fn(),
}));

vi.mock("@/modules/mail/lib/outlook-client", () => ({
  getOutlookMessages: vi.fn(),
}));

vi.mock("@/modules/mail/lib/imap-client", () => ({
  getImapMessages: vi.fn(),
}));

import * as supabaseModule from "@/lib/supabase/server";
import * as cacheModule from "@/modules/mail/lib/cache";
import * as gmailModule from "@/modules/mail/lib/gmail-client";
import * as imapModule from "@/modules/mail/lib/imap-client";
import * as outlookModule from "@/modules/mail/lib/outlook-client";
import * as rateLimiterModule from "@/modules/mail/lib/rate-limiter";
import { GET } from "./route";

describe("mail messages route", () => {
  const mockCreateClient = vi.mocked(supabaseModule.createClient);
  const mockCheckRateLimit = vi.mocked(rateLimiterModule.checkRateLimit);
  const mockGetCachedMessages = vi.mocked(cacheModule.getCachedMessages);
  const mockCacheMessages = vi.mocked(cacheModule.cacheMessages);
  const mockGetOutlookMessages = vi.mocked(outlookModule.getOutlookMessages);
  const mockGetGmailMessages = vi.mocked(gmailModule.getGmailMessages);
  const mockGetImapMessages = vi.mocked(imapModule.getImapMessages);

  const createRequest = (params?: Record<string, string>) => {
    const url = new URL("http://localhost/api/mail/messages");
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return new Request(url.toString(), { method: "GET" });
  };

  const mockSupabaseClient = (user: { id: string } | null, account?: { provider: string } | null, accountError?: Error | null) => {
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: account,
            error: accountError || null,
          }),
        }),
      }),
    });

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user } }),
      },
      from: vi.fn().mockReturnValue({
        select: selectMock,
      }),
    } as never);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue({ allowed: true, remaining: 10 });
  });

  describe("GET", () => {
    it("should return 401 when not authenticated", async () => {
      mockSupabaseClient(null);

      const response = await GET(createRequest({ accountId: "acc-1" }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });

    it("should return 400 when accountId is missing", async () => {
      mockSupabaseClient({ id: "user-1" });

      const response = await GET(createRequest());
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing accountId parameter");
    });

    it("should return 429 when rate limited", async () => {
      mockSupabaseClient({ id: "user-1" });
      mockCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0 });

      const response = await GET(createRequest({ accountId: "acc-1" }));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("Rate limit exceeded");
    });

    it("should return 404 when account not found", async () => {
      mockSupabaseClient({ id: "user-1" }, null);

      const response = await GET(createRequest({ accountId: "acc-1" }));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Account not found or access denied");
    });

    it("should return cached messages when available", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "outlook" });
      const cachedMessages = [{
        id: "msg-1",
        subject: "Test",
        accountId: "acc-1",
        provider: "outlook" as const,
        from: { email: "sender@test.com" },
        to: [{ email: "recipient@test.com" }],
        receivedAt: new Date(),
        isRead: false,
        hasAttachments: false,
        preview: "Preview text"
      }];
      mockGetCachedMessages.mockResolvedValue(cachedMessages);

      const response = await GET(createRequest({ accountId: "acc-1" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].id).toBe("msg-1");
      expect(data.messages[0].subject).toBe("Test");
      expect(data.hasMore).toBe(false);
      expect(mockGetOutlookMessages).not.toHaveBeenCalled();
    });

    it("should fetch outlook messages when cache is empty", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "outlook" });
      mockGetCachedMessages.mockResolvedValue(null);
      const messages = [{
        id: "msg-1",
        subject: "Outlook",
        accountId: "acc-1",
        provider: "outlook" as const,
        from: { email: "sender@test.com" },
        to: [{ email: "recipient@test.com" }],
        receivedAt: new Date(),
        isRead: false,
        hasAttachments: false,
        preview: "Preview"
      }];
      mockGetOutlookMessages.mockResolvedValue(messages);

      const response = await GET(createRequest({ accountId: "acc-1" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].id).toBe("msg-1");
      expect(data.messages[0].subject).toBe("Outlook");
      expect(mockGetOutlookMessages).toHaveBeenCalledWith("acc-1", "inbox", 50);
      expect(mockCacheMessages).toHaveBeenCalled();
    });

    it("should fetch gmail messages for gmail provider", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "gmail" });
      mockGetCachedMessages.mockResolvedValue(null);
      const messages = [{
        id: "msg-1",
        subject: "Gmail",
        accountId: "acc-1",
        provider: "gmail" as const,
        from: { email: "sender@test.com" },
        to: [{ email: "recipient@test.com" }],
        receivedAt: new Date(),
        isRead: false,
        hasAttachments: false,
        preview: "Preview"
      }];
      mockGetGmailMessages.mockResolvedValue(messages);

      const response = await GET(createRequest({ accountId: "acc-1" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].id).toBe("msg-1");
      expect(data.messages[0].subject).toBe("Gmail");
      expect(mockGetGmailMessages).toHaveBeenCalledWith("acc-1", "inbox", 50);
    });

    it("should fetch imap messages for imap provider", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "imap" });
      mockGetCachedMessages.mockResolvedValue(null);
      const messages = [{
        id: "msg-1",
        subject: "IMAP",
        accountId: "acc-1",
        provider: "imap" as const,
        from: { email: "sender@test.com" },
        to: [{ email: "recipient@test.com" }],
        receivedAt: new Date(),
        isRead: false,
        hasAttachments: false,
        preview: "Preview"
      }];
      mockGetImapMessages.mockResolvedValue(messages);

      const response = await GET(createRequest({ accountId: "acc-1" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].id).toBe("msg-1");
      expect(data.messages[0].subject).toBe("IMAP");
      expect(mockGetImapMessages).toHaveBeenCalledWith("acc-1", "inbox", 50);
    });

    it("should use custom folder and maxResults parameters", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "gmail" });
      mockGetCachedMessages.mockResolvedValue(null);
      mockGetGmailMessages.mockResolvedValue([]);

      const response = await GET(createRequest({
        accountId: "acc-1",
        folder: "sent",
        maxResults: "25"
      }));

      expect(response.status).toBe(200);
      expect(mockGetGmailMessages).toHaveBeenCalledWith("acc-1", "sent", 25);
    });

    it("should return hasMore true when messages equals maxResults", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "outlook" });
      mockGetCachedMessages.mockResolvedValue(null);
      const messages = new Array(50).fill({ id: "msg", subject: "Test" });
      mockGetOutlookMessages.mockResolvedValue(messages);

      const response = await GET(createRequest({ accountId: "acc-1" }));
      const data = await response.json();

      expect(data.hasMore).toBe(true);
    });

    it("should return 500 on unexpected error", async () => {
      mockCreateClient.mockRejectedValue(new Error("Database error"));

      const response = await GET(createRequest({ accountId: "acc-1" }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
