import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the env module
vi.mock("./lib/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_PROJECT_URL: "https://test.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
  },
}));

// Track cookie operations and capture cookie handlers
let capturedCookieHandlers: { getAll: () => unknown[]; setAll: (cookies: unknown[]) => void } | null = null;
const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url, _key, options) => {
    // Capture the cookie handlers for testing
    capturedCookieHandlers = options.cookies;
    return {
      auth: {
        getUser: mockGetUser,
      },
    };
  }),
}));

// Import after mocks are set up
import { proxy } from "./proxy";

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCookieHandlers = null;
  });

  it("redirects unauthenticated users to login from protected routes", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("allows unauthenticated users to access login page", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = new NextRequest("http://localhost:3000/login");
    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("allows unauthenticated users to access signup page", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = new NextRequest("http://localhost:3000/signup");
    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("allows unauthenticated users to access auth callback", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = new NextRequest("http://localhost:3000/auth/callback?code=123");
    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("redirects authenticated users from login to home", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "123", email: "test@example.com" } },
    });

    const request = new NextRequest("http://localhost:3000/login");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("redirects authenticated users from signup to home", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "123", email: "test@example.com" } },
    });

    const request = new NextRequest("http://localhost:3000/signup");
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("allows authenticated users to access auth callback", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "123", email: "test@example.com" } },
    });

    const request = new NextRequest("http://localhost:3000/auth/callback?code=123");
    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("allows authenticated users to access protected routes", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "123", email: "test@example.com" } },
    });

    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("allows authenticated users to access home page", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "123", email: "test@example.com" } },
    });

    const request = new NextRequest("http://localhost:3000/");
    const response = await proxy(request);

    expect(response.status).toBe(200);
  });

  it("cookie handlers getAll returns request cookies", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = new NextRequest("http://localhost:3000/login");
    request.cookies.set("test-cookie", "test-value");

    await proxy(request);

    expect(capturedCookieHandlers).not.toBeNull();
    const cookies = capturedCookieHandlers!.getAll();
    expect(cookies).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "test-cookie", value: "test-value" })
    ]));
  });

  it("cookie handlers setAll sets cookies on request and response", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = new NextRequest("http://localhost:3000/login");

    await proxy(request);

    expect(capturedCookieHandlers).not.toBeNull();

    // Call setAll to trigger the cookie setting logic
    capturedCookieHandlers!.setAll([
      { name: "session", value: "abc123", options: { httpOnly: true } },
      { name: "refresh", value: "xyz789", options: { secure: true } },
    ]);

    // Verify cookies were set on request
    expect(request.cookies.get("session")?.value).toBe("abc123");
    expect(request.cookies.get("refresh")?.value).toBe("xyz789");
  });

  // Note: /api/cron routes are excluded from the middleware matcher in config
  // They handle their own authentication via CRON_SECRET
});
