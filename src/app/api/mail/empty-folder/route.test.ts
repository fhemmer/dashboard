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

import * as supabaseModule from "@/lib/supabase/server";
import * as cacheModule from "@/modules/mail/lib/cache";
import * as rateLimiterModule from "@/modules/mail/lib/rate-limiter";
import { DELETE } from "./route";

describe("mail empty-folder route", () => {
  const mockCreateClient = vi.mocked(supabaseModule.createClient);
  const mockCheckRateLimit = vi.mocked(rateLimiterModule.checkRateLimit);
  const mockInvalidateMessagesCache = vi.mocked(cacheModule.invalidateMessagesCache);
  const mockInvalidateSummaryCache = vi.mocked(cacheModule.invalidateSummaryCache);

  const createRequest = (params?: Record<string, string>) => {
    const url = new URL("http://localhost/api/mail/empty-folder");
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return new Request(url.toString(), { method: "DELETE" });
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

  describe("DELETE", () => {
    it("should return 401 when not authenticated", async () => {
      mockSupabaseClient(null);

      const response = await DELETE(createRequest({ accountId: "acc-1", folder: "junk" }));
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Not authenticated");
    });

    it("should return 400 when accountId is missing", async () => {
      mockSupabaseClient({ id: "user-1" });

      const response = await DELETE(createRequest({ folder: "junk" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required parameters");
    });

    it("should return 400 when folder is missing", async () => {
      mockSupabaseClient({ id: "user-1" });

      const response = await DELETE(createRequest({ accountId: "acc-1" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required parameters");
    });

    it("should return 400 when folder is not junk or trash", async () => {
      mockSupabaseClient({ id: "user-1" });

      const response = await DELETE(createRequest({ accountId: "acc-1", folder: "inbox" }));
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Only junk and trash folders can be emptied");
    });

    it("should return 429 when rate limited", async () => {
      mockSupabaseClient({ id: "user-1" });
      mockCheckRateLimit.mockReturnValue({ allowed: false, remaining: 0 });

      const response = await DELETE(createRequest({ accountId: "acc-1", folder: "junk" }));
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("Rate limit exceeded");
    });

    it("should return 404 when account not found", async () => {
      mockSupabaseClient({ id: "user-1" }, null);

      const response = await DELETE(createRequest({ accountId: "acc-1", folder: "junk" }));
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Account not found or access denied");
    });

    it("should empty junk folder successfully", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "outlook" });

      const response = await DELETE(createRequest({ accountId: "acc-1", folder: "junk" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.deletedCount).toBe(0);
    });

    it("should empty trash folder successfully", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "gmail" });

      const response = await DELETE(createRequest({ accountId: "acc-1", folder: "trash" }));
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should invalidate caches after emptying folder", async () => {
      mockSupabaseClient({ id: "user-1" }, { provider: "imap" });

      await DELETE(createRequest({ accountId: "acc-1", folder: "junk" }));

      expect(mockInvalidateMessagesCache).toHaveBeenCalledWith("acc-1");
      expect(mockInvalidateSummaryCache).toHaveBeenCalledWith("user-1");
    });

    it("should return 500 on unexpected error", async () => {
      mockCreateClient.mockRejectedValue(new Error("Database error"));

      const response = await DELETE(createRequest({ accountId: "acc-1", folder: "junk" }));
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });
});
