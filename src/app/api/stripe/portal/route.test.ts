import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock dependencies - use vi.hoisted to ensure mocks are available before vi.mock
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    })
  ),
}));

const { mockCreatePortalSession } = vi.hoisted(() => ({
  mockCreatePortalSession: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  createPortalSession: mockCreatePortalSession,
}));

import { POST } from "./route";

describe("stripe portal route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = new NextRequest("http://localhost:5001/api/stripe/portal", {
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("creates portal session successfully", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockCreatePortalSession.mockResolvedValue("https://billing.stripe.com/portal");

    const request = new NextRequest("http://localhost:5001/api/stripe/portal", {
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe("https://billing.stripe.com/portal");
    expect(mockCreatePortalSession).toHaveBeenCalledWith({
      userId: "user-123",
      returnUrl: "https://app.example.com/account/billing",
    });
  });

  it("uses request origin when NEXT_PUBLIC_APP_URL not set", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockCreatePortalSession.mockResolvedValue("https://billing.stripe.com/portal");

    const request = new NextRequest("http://localhost:5001/api/stripe/portal", {
      method: "POST",
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockCreatePortalSession).toHaveBeenCalledWith({
      userId: "user-123",
      returnUrl: "http://localhost:5001/account/billing",
    });
  });

  it("returns 500 when portal session creation fails with Error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockCreatePortalSession.mockRejectedValue(new Error("Stripe API error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest("http://localhost:5001/api/stripe/portal", {
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Stripe API error");

    consoleSpy.mockRestore();
  });

  it("returns 500 with generic message when portal fails with non-Error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockCreatePortalSession.mockRejectedValue("Unknown error");

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest("http://localhost:5001/api/stripe/portal", {
      method: "POST",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create portal session");

    consoleSpy.mockRestore();
  });
});
