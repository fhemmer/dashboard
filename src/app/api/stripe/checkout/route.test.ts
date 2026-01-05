import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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

const { mockCreateCheckoutSession } = vi.hoisted(() => ({
  mockCreateCheckoutSession: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  createCheckoutSession: mockCreateCheckoutSession,
}));

import { POST } from "./route";

describe("stripe checkout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const request = new NextRequest("http://localhost:5001/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ tier: "pro" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when tier is not provided", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123", email: "test@example.com" } } });

    const request = new NextRequest("http://localhost:5001/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid tier");
  });

  it("returns 400 when tier is invalid", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123", email: "test@example.com" } } });

    const request = new NextRequest("http://localhost:5001/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ tier: "invalid" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid tier");
  });

  it("creates checkout session for pro tier", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123", email: "test@example.com" } } });
    mockCreateCheckoutSession.mockResolvedValue("https://checkout.stripe.com/session");

    const request = new NextRequest("http://localhost:5001/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ tier: "pro" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.url).toBe("https://checkout.stripe.com/session");
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
      userId: "user-123",
      userEmail: "test@example.com",
      tier: "pro",
      successUrl: "https://app.example.com/account/billing?success=true",
      cancelUrl: "https://app.example.com/pricing?canceled=true",
    });
  });

  it("creates checkout session for pro_plus tier", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123", email: "test@example.com" } } });
    mockCreateCheckoutSession.mockResolvedValue("https://checkout.stripe.com/session");

    const request = new NextRequest("http://localhost:5001/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ tier: "pro_plus" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ tier: "pro_plus" })
    );
  });

  it("handles empty email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123", email: null } } });
    mockCreateCheckoutSession.mockResolvedValue("https://checkout.stripe.com/session");

    const request = new NextRequest("http://localhost:5001/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ tier: "pro" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ userEmail: "" })
    );
  });

  it("uses request origin when NEXT_PUBLIC_APP_URL not set", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123", email: "test@example.com" } } });
    mockCreateCheckoutSession.mockResolvedValue("https://checkout.stripe.com/session");

    const request = new NextRequest("http://localhost:5001/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ tier: "pro" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        successUrl: "http://localhost:5001/account/billing?success=true",
        cancelUrl: "http://localhost:5001/pricing?canceled=true",
      })
    );
  });

  it("returns 500 when checkout session creation fails with Error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123", email: "test@example.com" } } });
    mockCreateCheckoutSession.mockRejectedValue(new Error("Stripe API error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest("http://localhost:5001/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ tier: "pro" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Stripe API error");

    consoleSpy.mockRestore();
  });

  it("returns 500 with generic message when checkout fails with non-Error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123", email: "test@example.com" } } });
    mockCreateCheckoutSession.mockRejectedValue("Unknown error");

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest("http://localhost:5001/api/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ tier: "pro" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to create checkout session");

    consoleSpy.mockRestore();
  });
});
