import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules before importing
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/modules/mail/lib/cache", () => ({
  invalidateMessagesCache: vi.fn(),
  invalidateSummaryCache: vi.fn(),
}));

vi.mock("@/modules/mail/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("@/modules/mail/lib/gmail-client", () => ({
  performGmailBulkAction: vi.fn(),
}));

vi.mock("@/modules/mail/lib/outlook-client", () => ({
  performOutlookBulkAction: vi.fn(),
}));

vi.mock("@/modules/mail/lib/imap-client", () => ({
  performImapBulkAction: vi.fn(),
}));

import * as supabaseModule from "@/lib/supabase/server";
import * as cacheModule from "@/modules/mail/lib/cache";
import * as gmailModule from "@/modules/mail/lib/gmail-client";
import * as imapModule from "@/modules/mail/lib/imap-client";
import * as outlookModule from "@/modules/mail/lib/outlook-client";
import * as rateLimiterModule from "@/modules/mail/lib/rate-limiter";
import { POST } from "./route";

describe("mail bulk-action route", () => {
  const mockCreateClient = vi.mocked(supabaseModule.createClient);
  const mockCheckRateLimit = vi.mocked(rateLimiterModule.checkRateLimit);
  const mockInvalidateMessagesCache = vi.mocked(cacheModule.invalidateMessagesCache);
  const mockInvalidateSummaryCache = vi.mocked(cacheModule.invalidateSummaryCache);
  const mockPerformOutlookBulkAction = vi.mocked(outlookModule.performOutlookBulkAction);
  const mockPerformGmailBulkAction = vi.mocked(gmailModule.performGmailBulkAction);
  const mockPerformImapBulkAction = vi.mocked(imapModule.performImapBulkAction);

  const createRequest = (body: Record<string, unknown>) => {
    return new Request("http://localhost/api/mail/bulk-action", {
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

      const response = await POST(createRequest({
        accountId: "acc-1",
        messageIds: ["msg-1"],
        action: "markRead"
      }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });

    it("should return 400 when accountId is missing", async () => {
      mockSupabaseClient({ id: "user-1" });

      const response = await POST(createRequest({
        messageIds: ["msg-1"],
        action: "markRead"
      }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required parameters");
    });

    it("should return 400 when messageIds is empty", async () => {
      mockSupabaseClient({ id: "user-1" });

      const response = await POST(createRequest({
        accountId: "acc-1",
        messageIds: [],
        action: "markRead"
      }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required parameters");
    });

    it("should return 400 when action is missing", async () => {
      mockSupabaseClient({ id: "user-1" });

      const response = await POST(createRequest({
        accountId: "acc-1",
        messageIds: ["msg-1"]
      }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required parameters");
    });

    it("should return 429 when rate limited", async () => {
      mockSupabaseClient({ id: "user-1" });
      mockCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0 });

      const response = await POST(createRequest({
        accountId: "acc-1",
        messageIds: ["msg-1"],
        action: "markRead"
      }));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("Rate limit exceeded");
    });

    it("should return 404 when account not found", async () => {
      mockSupabaseClient({ id: "user-1" }, null);

      const response = await POST(createRequest({
        accountId: "acc-1",
        messageIds: ["msg-1"],
        action: "markRead"
      }));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Account not found or access denied");
    });

    it("should perform outlook bulk action for outlook provider", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "outlook" });
      mockPerformOutlookBulkAction.mockResolvedValue({ success: true, processedCount: 3 });

      const response = await POST(createRequest({
        accountId: "acc-1",
        messageIds: ["msg-1", "msg-2", "msg-3"],
        action: "markRead"
      }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.processedCount).toBe(3);
      expect(data.failedCount).toBe(0);
      expect(mockPerformOutlookBulkAction).toHaveBeenCalledWith(
        "acc-1",
        ["msg-1", "msg-2", "msg-3"],
        "markRead"
      );
    });

    it("should perform gmail bulk action for gmail provider", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "gmail" });
      mockPerformGmailBulkAction.mockResolvedValue({ success: true, processedCount: 2 });

      const response = await POST(createRequest({
        accountId: "acc-1",
        messageIds: ["msg-1", "msg-2"],
        action: "delete"
      }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPerformGmailBulkAction).toHaveBeenCalled();
    });

    it("should perform imap bulk action for imap provider", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "imap" });
      mockPerformImapBulkAction.mockResolvedValue({ success: true, processedCount: 1 });

      const response = await POST(createRequest({
        accountId: "acc-1",
        messageIds: ["msg-1"],
        action: "moveToJunk"
      }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPerformImapBulkAction).toHaveBeenCalled();
    });

    it("should calculate failed count correctly", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "outlook" });
      mockPerformOutlookBulkAction.mockResolvedValue({ success: true, processedCount: 2 });

      const response = await POST(createRequest({
        accountId: "acc-1",
        messageIds: ["msg-1", "msg-2", "msg-3", "msg-4", "msg-5"],
        action: "markRead"
      }));
      const data = await response.json();

      expect(data.processedCount).toBe(2);
      expect(data.failedCount).toBe(3);
    });

    it("should invalidate caches after action", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "gmail" });
      mockPerformGmailBulkAction.mockResolvedValue({ success: true, processedCount: 1 });

      await POST(createRequest({
        accountId: "acc-1",
        messageIds: ["msg-1"],
        action: "markRead"
      }));

      expect(mockInvalidateMessagesCache).toHaveBeenCalledWith("acc-1");
      expect(mockInvalidateSummaryCache).toHaveBeenCalledWith("user-1");
    });

    it("should return 500 on unexpected error", async () => {
      mockCreateClient.mockRejectedValue(new Error("Database error"));

      const response = await POST(createRequest({
        accountId: "acc-1",
        messageIds: ["msg-1"],
        action: "markRead"
      }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
