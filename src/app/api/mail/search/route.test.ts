import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules before importing
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/modules/mail/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/modules/mail/lib/gmail-client", () => ({
  searchGmailMessages: vi.fn(),
}));

vi.mock("@/modules/mail/lib/outlook-client", () => ({
  searchOutlookMessages: vi.fn(),
}));

vi.mock("@/modules/mail/lib/imap-client", () => ({
  searchImapMessages: vi.fn(),
}));

import * as supabaseModule from "@/lib/supabase/server";
import * as gmailModule from "@/modules/mail/lib/gmail-client";
import * as imapModule from "@/modules/mail/lib/imap-client";
import * as outlookModule from "@/modules/mail/lib/outlook-client";
import * as rateLimiterModule from "@/modules/mail/lib/rate-limiter";
import { POST } from "./route";

describe("mail search route", () => {
  const mockCreateClient = vi.mocked(supabaseModule.createClient);
  const mockCheckRateLimit = vi.mocked(rateLimiterModule.checkRateLimit);
  const mockSearchOutlookMessages = vi.mocked(outlookModule.searchOutlookMessages);
  const mockSearchGmailMessages = vi.mocked(gmailModule.searchGmailMessages);
  const mockSearchImapMessages = vi.mocked(imapModule.searchImapMessages);

  const createRequest = (body: Record<string, unknown>) => {
    return new Request("http://localhost/api/mail/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  };

  const mockSupabaseClient = (user: { id: string } | null, account?: { provider: string } | null) => {
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: account,
            error: account ? null : new Error("Not found"),
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

  describe("POST", () => {
    it("should return 401 when not authenticated", async () => {
      mockSupabaseClient(null);

      const response = await POST(createRequest({ accountId: "acc-1", query: "test" }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });

    it("should return 400 when accountId is missing", async () => {
      mockSupabaseClient({ id: "user-1" });

      const response = await POST(createRequest({ query: "test" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required parameters");
    });

    it("should return 400 when query is missing", async () => {
      mockSupabaseClient({ id: "user-1" });

      const response = await POST(createRequest({ accountId: "acc-1" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required parameters");
    });

    it("should return 429 when rate limited", async () => {
      mockSupabaseClient({ id: "user-1" });
      mockCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0 });

      const response = await POST(createRequest({ accountId: "acc-1", query: "test" }));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("Rate limit exceeded");
    });

    it("should return 404 when account not found", async () => {
      mockSupabaseClient({ id: "user-1" }, null);

      const response = await POST(createRequest({ accountId: "acc-1", query: "test" }));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Account not found or access denied");
    });

    it("should search outlook messages for outlook provider", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "outlook" });
      const searchResult = { messages: [{ id: "msg-1", subject: "Found" }], totalCount: 1 };
      mockSearchOutlookMessages.mockResolvedValue(searchResult);

      const response = await POST(createRequest({
        accountId: "acc-1",
        query: "test",
        folder: "inbox",
        maxResults: 20
      }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(searchResult);
      expect(mockSearchOutlookMessages).toHaveBeenCalledWith({
        accountId: "acc-1",
        query: "test",
        folder: "inbox",
        maxResults: 20
      });
    });

    it("should search gmail messages for gmail provider", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "gmail" });
      const searchResult = { messages: [{ id: "msg-1", subject: "Gmail Found" }], totalCount: 1 };
      mockSearchGmailMessages.mockResolvedValue(searchResult);

      const response = await POST(createRequest({ accountId: "acc-1", query: "test" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(searchResult);
      expect(mockSearchGmailMessages).toHaveBeenCalled();
    });

    it("should search imap messages for imap provider", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "imap" });
      const searchResult = { messages: [{ id: "msg-1", subject: "IMAP Found" }], totalCount: 1 };
      mockSearchImapMessages.mockResolvedValue(searchResult);

      const response = await POST(createRequest({ accountId: "acc-1", query: "test" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(searchResult);
      expect(mockSearchImapMessages).toHaveBeenCalled();
    });

    it("should return 500 on unexpected error", async () => {
      mockCreateClient.mockRejectedValue(new Error("Database error"));

      const response = await POST(createRequest({ accountId: "acc-1", query: "test" }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
