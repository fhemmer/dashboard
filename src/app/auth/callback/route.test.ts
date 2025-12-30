import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock supabase client
const mockExchangeCodeForSession = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn(() => Promise.resolve({ error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
      from: vi.fn(() => ({
        update: mockUpdate.mockReturnValue({ eq: mockEq }),
      })),
    })
  ),
}));

import { GET } from "./route";

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exchanges code for session and redirects to home", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: null,
      data: { user: { id: "user-123" } }
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=test-code"
    );
    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(mockUpdate).toHaveBeenCalledWith({ last_login: expect.any(String) });
    expect(mockEq).toHaveBeenCalledWith("id", "user-123");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("redirects to custom next URL if provided", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: null,
      data: { user: { id: "user-456" } }
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=test-code&next=/dashboard"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/dashboard"
    );
  });

  it("redirects to login with error when code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: { message: "Invalid code" },
      data: { user: null }
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=invalid-code"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=Could%20not%20authenticate%20user"
    );
  });

  it("redirects to login with error when no code is provided", async () => {
    const request = new Request("http://localhost:3000/auth/callback");
    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?error=Could%20not%20authenticate%20user"
    );
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it("skips profile update when data.user is null", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      error: null,
      data: { user: null }
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=test-code"
    );
    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("test-code");
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
