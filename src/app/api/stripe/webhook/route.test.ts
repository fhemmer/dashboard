import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies - use vi.hoisted to ensure mocks are available before vi.mock
const { mockVerifyWebhookSignature, mockHandleCheckoutComplete, mockHandleSubscriptionUpdate, mockHandleSubscriptionDeleted, mockHandleInvoicePaid } = vi.hoisted(() => ({
  mockVerifyWebhookSignature: vi.fn(),
  mockHandleCheckoutComplete: vi.fn(),
  mockHandleSubscriptionUpdate: vi.fn(),
  mockHandleSubscriptionDeleted: vi.fn(),
  mockHandleInvoicePaid: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  verifyWebhookSignature: mockVerifyWebhookSignature,
  handleCheckoutComplete: mockHandleCheckoutComplete,
  handleSubscriptionUpdate: mockHandleSubscriptionUpdate,
  handleSubscriptionDeleted: mockHandleSubscriptionDeleted,
  handleInvoicePaid: mockHandleInvoicePaid,
}));

import { POST } from "./route";

describe("stripe webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when signature is missing", async () => {
    const request = new NextRequest("http://localhost:5001/api/stripe/webhook", {
      method: "POST",
      body: "{}",
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing signature");
  });

  it("returns 400 when signature verification fails", async () => {
    mockVerifyWebhookSignature.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest("http://localhost:5001/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: {
        "stripe-signature": "invalid_sig",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Invalid signature");

    consoleSpy.mockRestore();
  });

  it("handles checkout.session.completed event", async () => {
    const session = { id: "cs_123", customer: "cus_123" };
    mockVerifyWebhookSignature.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: session },
    });
    mockHandleCheckoutComplete.mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:5001/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: {
        "stripe-signature": "valid_sig",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockHandleCheckoutComplete).toHaveBeenCalledWith(session);
  });

  it("handles customer.subscription.updated event", async () => {
    const subscription = { id: "sub_123", status: "active" };
    mockVerifyWebhookSignature.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: subscription },
    });
    mockHandleSubscriptionUpdate.mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:5001/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: {
        "stripe-signature": "valid_sig",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockHandleSubscriptionUpdate).toHaveBeenCalledWith(subscription);
  });

  it("handles customer.subscription.deleted event", async () => {
    const subscription = { id: "sub_123", status: "canceled" };
    mockVerifyWebhookSignature.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: subscription },
    });
    mockHandleSubscriptionDeleted.mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:5001/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: {
        "stripe-signature": "valid_sig",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockHandleSubscriptionDeleted).toHaveBeenCalledWith(subscription);
  });

  it("handles invoice.paid event", async () => {
    const invoice = { id: "in_123", subscription: "sub_123" };
    mockVerifyWebhookSignature.mockReturnValue({
      type: "invoice.paid",
      data: { object: invoice },
    });
    mockHandleInvoicePaid.mockResolvedValue(undefined);

    const request = new NextRequest("http://localhost:5001/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: {
        "stripe-signature": "valid_sig",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockHandleInvoicePaid).toHaveBeenCalledWith(invoice);
  });

  it("handles unrecognized event types", async () => {
    mockVerifyWebhookSignature.mockReturnValue({
      type: "some.unknown.event",
      data: { object: {} },
    });

    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const request = new NextRequest("http://localhost:5001/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: {
        "stripe-signature": "valid_sig",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith("Unhandled Stripe event: some.unknown.event");

    consoleSpy.mockRestore();
  });

  it("returns 500 when handler throws Error", async () => {
    mockVerifyWebhookSignature.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: {} },
    });
    mockHandleCheckoutComplete.mockRejectedValue(new Error("Handler error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest("http://localhost:5001/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: {
        "stripe-signature": "valid_sig",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Handler error");

    consoleSpy.mockRestore();
  });

  it("returns 500 with generic message when handler throws non-Error", async () => {
    mockVerifyWebhookSignature.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: {} },
    });
    mockHandleCheckoutComplete.mockRejectedValue("Unknown error");

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest("http://localhost:5001/api/stripe/webhook", {
      method: "POST",
      body: "{}",
      headers: {
        "stripe-signature": "valid_sig",
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Webhook handler failed");

    consoleSpy.mockRestore();
  });
});
