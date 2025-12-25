import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules before importing
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/modules/mail/actions", () => ({
  storeAccountCredentials: vi.fn(),
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import * as supabaseModule from "@/lib/supabase/server";
import * as actionsModule from "@/modules/mail/actions";
import { GET } from "./route";

describe("mail oauth callback route", () => {
  const mockCreateClient = vi.mocked(supabaseModule.createClient);
  const mockStoreAccountCredentials = vi.mocked(actionsModule.storeAccountCredentials);

  const createRequest = (params?: Record<string, string>) => {
    const url = new URL("http://localhost/api/mail/oauth/callback");
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }
    return new Request(url.toString(), { method: "GET" });
  };

  const createState = (data: Record<string, unknown>) => {
    return Buffer.from(JSON.stringify(data)).toString("base64");
  };

  const mockSupabaseClient = (user: { id: string } | null, account?: { id: string } | null) => {
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
    mockFetch.mockReset();
  });

  describe("GET", () => {
    it("should redirect to login when not authenticated", async () => {
      mockSupabaseClient(null);

      const response = await GET(createRequest({ code: "abc", state: "def", provider: "gmail" }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/login?error=not_authenticated");
    });

    it("should redirect with error when code is missing", async () => {
      mockSupabaseClient({ id: "user-1" });

      const response = await GET(createRequest({ state: "def", provider: "gmail" }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/mail/settings?error=missing_parameters");
    });

    it("should redirect with error when state is missing", async () => {
      mockSupabaseClient({ id: "user-1" });

      const response = await GET(createRequest({ code: "abc", provider: "gmail" }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/mail/settings?error=missing_parameters");
    });

    it("should redirect with error when provider is missing", async () => {
      mockSupabaseClient({ id: "user-1" });

      const response = await GET(createRequest({ code: "abc", state: "def" }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/mail/settings?error=missing_parameters");
    });

    it("should redirect with error when provider is invalid", async () => {
      mockSupabaseClient({ id: "user-1" });

      const response = await GET(createRequest({
        code: "abc",
        state: createState({ accountId: "acc-1" }),
        provider: "invalid"
      }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/mail/settings?error=invalid_provider");
    });

    it("should redirect with error when state is invalid JSON", async () => {
      mockSupabaseClient({ id: "user-1" });

      const response = await GET(createRequest({
        code: "abc",
        state: "invalid-base64!!!",
        provider: "gmail"
      }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/mail/settings?error=invalid_state");
    });

    it("should redirect with error when account not found", async () => {
      mockSupabaseClient({ id: "user-1" }, null);

      const response = await GET(createRequest({
        code: "abc",
        state: createState({ accountId: "acc-1" }),
        provider: "gmail"
      }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/mail/settings?error=account_not_found");
    });

    it("should redirect with error when token exchange fails", async () => {
      mockSupabaseClient({ id: "user-1" }, { id: "acc-1" });
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
      });

      const response = await GET(createRequest({
        code: "abc",
        state: createState({ accountId: "acc-1" }),
        provider: "gmail"
      }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=token_exchange_failed");
    });

    it("should redirect with error when token response is missing access_token", async () => {
      mockSupabaseClient({ id: "user-1" }, { id: "acc-1" });
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ refresh_token: "refresh" }),
      });

      const response = await GET(createRequest({
        code: "abc",
        state: createState({ accountId: "acc-1" }),
        provider: "gmail"
      }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=invalid_token_response");
    });

    it("should redirect with error when token response is missing refresh_token", async () => {
      mockSupabaseClient({ id: "user-1" }, { id: "acc-1" });
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: "access" }),
      });

      const response = await GET(createRequest({
        code: "abc",
        state: createState({ accountId: "acc-1" }),
        provider: "gmail"
      }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=invalid_token_response");
    });

    it("should redirect with error when storing credentials fails", async () => {
      mockSupabaseClient({ id: "user-1" }, { id: "acc-1" });
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: "access",
          refresh_token: "refresh",
          expires_in: 3600
        }),
      });
      mockStoreAccountCredentials.mockResolvedValue({
        success: false,
        error: "Storage error"
      });

      const response = await GET(createRequest({
        code: "abc",
        state: createState({ accountId: "acc-1" }),
        provider: "gmail"
      }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=Storage%20error");
    });

    it("should redirect with token_storage_failed when error is not provided", async () => {
      mockSupabaseClient({ id: "user-1" }, { id: "acc-1" });
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: "access",
          refresh_token: "refresh",
          expires_in: 3600
        }),
      });
      mockStoreAccountCredentials.mockResolvedValue({
        success: false
      });

      const response = await GET(createRequest({
        code: "abc",
        state: createState({ accountId: "acc-1" }),
        provider: "gmail"
      }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=token_storage_failed");
    });

    it("should successfully process gmail oauth callback", async () => {
      mockSupabaseClient({ id: "user-1" }, { id: "acc-1" });
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600
        }),
      });
      mockStoreAccountCredentials.mockResolvedValue({ success: true });

      const response = await GET(createRequest({
        code: "auth-code",
        state: createState({ accountId: "acc-1" }),
        provider: "gmail"
      }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/mail/settings?success=account_connected");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://oauth2.googleapis.com/token",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        })
      );
    });

    it("should successfully process outlook oauth callback", async () => {
      mockSupabaseClient({ id: "user-1" }, { id: "acc-1" });
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 7200
        }),
      });
      mockStoreAccountCredentials.mockResolvedValue({ success: true });

      const response = await GET(createRequest({
        code: "auth-code",
        state: createState({ accountId: "acc-1" }),
        provider: "outlook"
      }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/mail/settings?success=account_connected");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("should use default expires_in when not provided or invalid", async () => {
      mockSupabaseClient({ id: "user-1" }, { id: "acc-1" });
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: -1  // Invalid value
        }),
      });
      mockStoreAccountCredentials.mockResolvedValue({ success: true });

      await GET(createRequest({
        code: "auth-code",
        state: createState({ accountId: "acc-1" }),
        provider: "gmail"
      }));

      // Should have called with default 3600 seconds (1 hour) expiration
      expect(mockStoreAccountCredentials).toHaveBeenCalledWith(
        "acc-1",
        "access-token",
        "refresh-token",
        expect.any(Date)
      );
    });

    it("should redirect to internal_error on unexpected error", async () => {
      mockCreateClient.mockRejectedValue(new Error("Database error"));

      const response = await GET(createRequest({
        code: "abc",
        state: createState({ accountId: "acc-1" }),
        provider: "gmail"
      }));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/mail/settings?error=internal_error");
    });
  });
});
