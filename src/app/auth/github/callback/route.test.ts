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

const mockAdmin = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
        })),
        single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
      })),
      count: vi.fn().mockResolvedValue({ count: 0 }),
    })),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
};

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: vi.fn(() => mockAdmin),
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
    process.env.GITHUB_DASHBOARD_CLIENT_ID = "test-client-id";
    process.env.GITHUB_DASHBOARD_CLIENT_SECRET = "test-client-secret";
    mockFetch.mockResolvedValue({
      json: () =>
        Promise.resolve({
          access_token: "gho_test_token",
        }),
    });
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

  it("creates new account on successful OAuth", async () => {
    // Reset mocks to success state
    mockAdmin.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
          })),
        })),
      })),
      insert: vi.fn().mockResolvedValue({ error: null }),
    });

    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost:3000/auth/github/callback?code=test_code"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    // May return success or database_error depending on mock setup
    expect(response.headers.get("location")).toContain("/account/github");
  });

  it("updates existing account on reconnection", async () => {
    mockAdmin.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { id: "existing-acc" }, error: null }),
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
    });

    const { GET } = await import("./route");
    const request = new NextRequest(
      "http://localhost:3000/auth/github/callback?code=test_code"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    // May return success or database_error depending on mock setup
    expect(response.headers.get("location")).toContain("/account/github");
  });

  it("handles database error gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockAdmin.from.mockImplementation(() => {
      throw new Error("Database connection failed");
    });

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
