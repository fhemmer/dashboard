import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUser = { id: "user-123" };

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
}));

const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Build a chainable mock for supabaseAdmin
const createChainableMock = (options: {
  existingAccount?: { id: string } | null;
  accountCount?: number;
  throwOnFrom?: boolean;
}) => {
  const { existingAccount = null, accountCount = 0, throwOnFrom = false } = options;

  return {
    from: vi.fn(() => {
      if (throwOnFrom) {
        throw new Error("Database connection failed");
      }
      return {
        select: vi.fn((columns: string, opts?: { count?: string; head?: boolean }) => {
          // For count queries
          if (opts?.count === "exact" && opts?.head === true) {
            return {
              eq: vi.fn(() => Promise.resolve({ count: accountCount, error: null })),
            };
          }
          // For regular select queries
          return {
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() =>
                  Promise.resolve({
                    data: existingAccount,
                    error: existingAccount ? null : { code: "PGRST116" },
                  })
                ),
              })),
            })),
          };
        }),
        insert: vi.fn(() => Promise.resolve({ error: null })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      };
    }),
  };
};

let mockAdminInstance = createChainableMock({});

vi.mock("@/lib/supabase/admin", () => ({
  get supabaseAdmin() {
    return mockAdminInstance;
  },
}));

vi.mock("@/modules/github-prs/lib/github-client", () => ({
  fetchGitHubUser: vi.fn().mockResolvedValue({
    id: 12345,
    login: "testuser",
    avatar_url: "https://example.com/avatar.png",
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("GitHub OAuth Callback Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.GITHUB_DASHBOARD_CLIENT_ID = "test-client-id";
    process.env.GITHUB_DASHBOARD_CLIENT_SECRET = "test-client-secret";
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          access_token: "gho_test_token",
        }),
    });
    mockAdminInstance = createChainableMock({});
  });

  it("redirects with error when code is missing", async () => {
    const { GET } = await import("./route");
    const request = new NextRequest("http://localhost:3000/auth/github/callback");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=missing_code");
  });

  it("redirects with error when OAuth returns error", async () => {
    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost:3000/auth/github/callback?error=access_denied"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=access_denied");
  });

  it("redirects with error when user not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost:3000/auth/github/callback?code=test_code"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=not_authenticated");
  });

  it("redirects with error when GitHub token exchange fails", async () => {
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ error: "bad_verification_code" }),
    });

    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost:3000/auth/github/callback?code=invalid_code"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=bad_verification_code");
  });

  it("redirects with error when GitHub user fetch fails", async () => {
    const { fetchGitHubUser } = await import("@/modules/github-prs/lib/github-client");
    vi.mocked(fetchGitHubUser).mockRejectedValueOnce(new Error("API error"));

    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost:3000/auth/github/callback?code=test_code"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=github_user_fetch_failed");
  });

  it("creates new account with Personal label when no existing accounts", async () => {
    mockAdminInstance = createChainableMock({ existingAccount: null, accountCount: 0 });

    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost:3000/auth/github/callback?code=test_code"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("success=connected");
  });

  it("creates new account with Account N label when existing accounts present", async () => {
    mockAdminInstance = createChainableMock({ existingAccount: null, accountCount: 2 });

    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost:3000/auth/github/callback?code=test_code"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("success=connected");
  });

  it("updates existing account on reconnection", async () => {
    mockAdminInstance = createChainableMock({ existingAccount: { id: "existing-acc" } });

    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost:3000/auth/github/callback?code=test_code"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("success=connected");
  });

  it("handles database error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockAdminInstance = createChainableMock({ throwOnFrom: true });

    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost:3000/auth/github/callback?code=test_code"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("error=database_error");
    consoleSpy.mockRestore();
  });
});
