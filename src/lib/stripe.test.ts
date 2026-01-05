/**
 * Stripe Module Tests
 */

import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    createCheckoutSession,
    createPortalSession,
    getOrCreateCustomer,
    getPriceId,
    getTierFromPriceId,
    handleCheckoutComplete,
    handleInvoicePaid,
    handleSubscriptionDeleted,
    handleSubscriptionUpdate,
    verifyWebhookSignature,
} from "./stripe";

// Mock hoisting
const mockSupabaseAdmin = vi.hoisted(() => ({
  from: vi.fn(),
}));

const mockStripeInstance = vi.hoisted(() => ({
  customers: {
    create: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
  webhooks: {
    constructEvent: vi.fn(),
  },
}));

// Mock Supabase admin client
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: mockSupabaseAdmin,
}));

// Mock Stripe as a class
vi.mock("stripe", () => ({
  default: class MockStripe {
    customers = mockStripeInstance.customers;
    checkout = mockStripeInstance.checkout;
    billingPortal = mockStripeInstance.billingPortal;
    webhooks = mockStripeInstance.webhooks;
  },
}));

// Helper to create chainable mock
function createChainMock(result: { data?: unknown; error?: unknown }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(result),
    }),
    insert: vi.fn().mockResolvedValue(result),
  };
}

describe("stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure env vars are set
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_monthly";
    process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY = "price_pro_plus_monthly";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test123";
  });

  describe("getPriceId", () => {
    it("should return price ID for pro tier when env var is set", () => {
      const originalEnv = process.env.STRIPE_PRICE_PRO_MONTHLY;
      process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_test";
      
      expect(getPriceId("pro")).toBe("price_pro_test");
      
      process.env.STRIPE_PRICE_PRO_MONTHLY = originalEnv;
    });

    it("should return price ID for pro_plus tier when env var is set", () => {
      const originalEnv = process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY;
      process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY = "price_pro_plus_test";
      
      expect(getPriceId("pro_plus")).toBe("price_pro_plus_test");
      
      process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY = originalEnv;
    });

    it("should throw error when env var is not set for pro", () => {
      const originalEnv = process.env.STRIPE_PRICE_PRO_MONTHLY;
      delete process.env.STRIPE_PRICE_PRO_MONTHLY;
      
      expect(() => getPriceId("pro")).toThrow("STRIPE_PRICE_PRO_MONTHLY environment variable is not set");
      
      process.env.STRIPE_PRICE_PRO_MONTHLY = originalEnv;
    });

    it("should throw error when env var is not set for pro_plus", () => {
      const originalEnv = process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY;
      delete process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY;
      
      expect(() => getPriceId("pro_plus")).toThrow("STRIPE_PRICE_PRO_PLUS_MONTHLY environment variable is not set");
      
      process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY = originalEnv;
    });
  });

  describe("getTierFromPriceId", () => {
    it("should return pro tier when price matches pro env var", () => {
      const originalEnv = process.env.STRIPE_PRICE_PRO_MONTHLY;
      process.env.STRIPE_PRICE_PRO_MONTHLY = "price_pro_test";
      
      expect(getTierFromPriceId("price_pro_test")).toBe("pro");
      
      process.env.STRIPE_PRICE_PRO_MONTHLY = originalEnv;
    });

    it("should return pro_plus tier when price matches pro_plus env var", () => {
      const originalEnv = process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY;
      process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY = "price_pro_plus_test";
      
      expect(getTierFromPriceId("price_pro_plus_test")).toBe("pro_plus");
      
      process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY = originalEnv;
    });

    it("should return free tier when price does not match any env var", () => {
      expect(getTierFromPriceId("unknown_price_id")).toBe("free");
    });
  });

  describe("getOrCreateCustomer", () => {
    it("should return existing customer ID if found", async () => {
      mockSupabaseAdmin.from.mockReturnValue(
        createChainMock({ data: { stripe_customer_id: "cus_existing123" }, error: null })
      );

      const result = await getOrCreateCustomer("user123", "test@example.com");
      expect(result).toBe("cus_existing123");
      expect(mockStripeInstance.customers.create).not.toHaveBeenCalled();
    });

    it("should create new customer if none exists", async () => {
      mockSupabaseAdmin.from
        .mockReturnValueOnce(createChainMock({ data: null, error: null }))
        .mockReturnValueOnce(createChainMock({ error: null }));

      mockStripeInstance.customers.create.mockResolvedValue({
        id: "cus_new123",
      });

      const result = await getOrCreateCustomer("user123", "test@example.com");
      expect(result).toBe("cus_new123");
      expect(mockStripeInstance.customers.create).toHaveBeenCalledWith({
        email: "test@example.com",
        metadata: { user_id: "user123" },
      });
    });
  });

  describe("createCheckoutSession", () => {
    it("should create checkout session and return URL", async () => {
      mockSupabaseAdmin.from.mockReturnValue(
        createChainMock({ data: { stripe_customer_id: "cus_123" }, error: null })
      );

      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        url: "https://checkout.stripe.com/session123",
      });

      const result = await createCheckoutSession({
        userId: "user123",
        userEmail: "test@example.com",
        tier: "pro",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result).toBe("https://checkout.stripe.com/session123");
    });

    it("should throw error if session URL is not returned", async () => {
      mockSupabaseAdmin.from.mockReturnValue(
        createChainMock({ data: { stripe_customer_id: "cus_123" }, error: null })
      );

      mockStripeInstance.checkout.sessions.create.mockResolvedValue({
        url: null,
      });

      await expect(
        createCheckoutSession({
          userId: "user123",
          userEmail: "test@example.com",
          tier: "pro",
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        })
      ).rejects.toThrow("Failed to create checkout session URL");
    });
  });

  describe("createPortalSession", () => {
    it("should create portal session and return URL", async () => {
      mockSupabaseAdmin.from.mockReturnValue(
        createChainMock({ data: { stripe_customer_id: "cus_123" }, error: null })
      );

      mockStripeInstance.billingPortal.sessions.create.mockResolvedValue({
        url: "https://billing.stripe.com/portal123",
      });

      const result = await createPortalSession({
        userId: "user123",
        returnUrl: "https://example.com/billing",
      });

      expect(result).toBe("https://billing.stripe.com/portal123");
    });

    it("should throw error if no stripe customer found", async () => {
      mockSupabaseAdmin.from.mockReturnValue(
        createChainMock({ data: null, error: null })
      );

      await expect(
        createPortalSession({
          userId: "user123",
          returnUrl: "https://example.com/billing",
        })
      ).rejects.toThrow("No Stripe customer found for this user");
    });
  });

  describe("handleCheckoutComplete", () => {
    it("should update subscription and credits for pro tier", async () => {
      mockSupabaseAdmin.from.mockReturnValue(createChainMock({ error: null }));

      const session = {
        metadata: { user_id: "user123", tier: "pro" },
        subscription: "sub_123",
      } as unknown as Stripe.Checkout.Session;

      await handleCheckoutComplete(session);

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("subscriptions");
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("user_credits");
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("credit_transactions");
    });

    it("should update with pro_plus credits", async () => {
      mockSupabaseAdmin.from.mockReturnValue(createChainMock({ error: null }));

      const session = {
        metadata: { user_id: "user123", tier: "pro_plus" },
        subscription: "sub_123",
      } as unknown as Stripe.Checkout.Session;

      await handleCheckoutComplete(session);

      expect(mockSupabaseAdmin.from).toHaveBeenCalledTimes(3);
    });

    it("should return early if metadata is missing", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      const session = {
        metadata: {},
        subscription: "sub_123",
      } as unknown as Stripe.Checkout.Session;

      await handleCheckoutComplete(session);

      expect(consoleSpy).toHaveBeenCalledWith("Missing user_id or tier in checkout session metadata");
      expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe("handleSubscriptionUpdate", () => {
    it("should update subscription status to active", async () => {
      mockSupabaseAdmin.from.mockReturnValue(createChainMock({ error: null }));

      const subscription = {
        id: "sub_123",
        metadata: { user_id: "user123" },
        status: "active",
        items: { data: [{ price: { id: "price_pro_monthly" } }] },
        current_period_start: 1700000000,
        current_period_end: 1702678400,
      } as unknown as Stripe.Subscription;

      await handleSubscriptionUpdate(subscription);

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("subscriptions");
    });

    it("should update subscription status to past_due", async () => {
      mockSupabaseAdmin.from.mockReturnValue(createChainMock({ error: null }));

      const subscription = {
        id: "sub_123",
        metadata: { user_id: "user123" },
        status: "past_due",
        items: { data: [{ price: { id: "price_pro_monthly" } }] },
      } as unknown as Stripe.Subscription;

      await handleSubscriptionUpdate(subscription);

      expect(mockSupabaseAdmin.from).toHaveBeenCalled();
    });

    it("should set canceled status for other statuses", async () => {
      mockSupabaseAdmin.from.mockReturnValue(createChainMock({ error: null }));

      const subscription = {
        id: "sub_123",
        metadata: { user_id: "user123" },
        status: "canceled",
        items: { data: [{ price: { id: "price_pro_monthly" } }] },
      } as unknown as Stripe.Subscription;

      await handleSubscriptionUpdate(subscription);

      expect(mockSupabaseAdmin.from).toHaveBeenCalled();
    });

    it("should return early if user_id missing", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      const subscription = {
        id: "sub_123",
        metadata: {},
        status: "active",
        items: { data: [] },
      } as unknown as Stripe.Subscription;

      await handleSubscriptionUpdate(subscription);

      expect(consoleSpy).toHaveBeenCalledWith("Missing user_id in subscription metadata");
      expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it("should default to free tier if no price items", async () => {
      mockSupabaseAdmin.from.mockReturnValue(createChainMock({ error: null }));

      const subscription = {
        id: "sub_123",
        metadata: { user_id: "user123" },
        status: "active",
        items: { data: [] },
      } as unknown as Stripe.Subscription;

      await handleSubscriptionUpdate(subscription);

      expect(mockSupabaseAdmin.from).toHaveBeenCalled();
    });
  });

  describe("handleSubscriptionDeleted", () => {
    it("should downgrade user to free tier", async () => {
      mockSupabaseAdmin.from.mockReturnValue(
        createChainMock({ data: { user_id: "user123" }, error: null })
      );

      const subscription = {
        id: "sub_123",
      } as unknown as Stripe.Subscription;

      await handleSubscriptionDeleted(subscription);

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("subscriptions");
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("user_credits");
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("credit_transactions");
    });

    it("should return early if subscription not found", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      mockSupabaseAdmin.from.mockReturnValue(
        createChainMock({ data: null, error: null })
      );

      const subscription = {
        id: "sub_notfound",
      } as unknown as Stripe.Subscription;

      await handleSubscriptionDeleted(subscription);

      expect(consoleSpy).toHaveBeenCalledWith("Subscription not found:", "sub_notfound");
      
      consoleSpy.mockRestore();
    });
  });

  describe("handleInvoicePaid", () => {
    it("should reset credits on monthly renewal for pro tier", async () => {
      mockSupabaseAdmin.from.mockReturnValue(
        createChainMock({ data: { user_id: "user123", tier: "pro" }, error: null })
      );

      const invoice = {
        subscription: "sub_123",
        billing_reason: "subscription_cycle",
      } as unknown as Stripe.Invoice;

      await handleInvoicePaid(invoice);

      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("subscriptions");
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("user_credits");
      expect(mockSupabaseAdmin.from).toHaveBeenCalledWith("credit_transactions");
    });

    it("should reset credits for pro_plus tier", async () => {
      mockSupabaseAdmin.from.mockReturnValue(
        createChainMock({ data: { user_id: "user123", tier: "pro_plus" }, error: null })
      );

      const invoice = {
        subscription: "sub_123",
        billing_reason: "subscription_cycle",
      } as unknown as Stripe.Invoice;

      await handleInvoicePaid(invoice);

      expect(mockSupabaseAdmin.from).toHaveBeenCalledTimes(3);
    });

    it("should reset credits for free tier", async () => {
      mockSupabaseAdmin.from.mockReturnValue(
        createChainMock({ data: { user_id: "user123", tier: "free" }, error: null })
      );

      const invoice = {
        subscription: "sub_123",
        billing_reason: "subscription_cycle",
      } as unknown as Stripe.Invoice;

      await handleInvoicePaid(invoice);

      expect(mockSupabaseAdmin.from).toHaveBeenCalledTimes(3);
    });

    it("should return early for non-subscription-cycle invoices", async () => {
      const invoice = {
        subscription: "sub_123",
        billing_reason: "subscription_create",
      } as unknown as Stripe.Invoice;

      await handleInvoicePaid(invoice);

      expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
    });

    it("should return early if no subscription ID", async () => {
      const invoice = {
        billing_reason: "subscription_cycle",
      } as unknown as Stripe.Invoice;

      await handleInvoicePaid(invoice);

      expect(mockSupabaseAdmin.from).not.toHaveBeenCalled();
    });

    it("should return early if subscription not found", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      
      mockSupabaseAdmin.from.mockReturnValue(
        createChainMock({ data: null, error: null })
      );

      const invoice = {
        subscription: "sub_notfound",
        billing_reason: "subscription_cycle",
      } as unknown as Stripe.Invoice;

      await handleInvoicePaid(invoice);

      expect(consoleSpy).toHaveBeenCalledWith("Subscription not found for invoice:", "sub_notfound");
      
      consoleSpy.mockRestore();
    });
  });

  describe("verifyWebhookSignature", () => {
    it("should verify webhook and return event", () => {
      const mockEvent = { type: "checkout.session.completed" };
      mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);

      const result = verifyWebhookSignature("payload", "signature");

      expect(result).toBe(mockEvent);
      expect(mockStripeInstance.webhooks.constructEvent).toHaveBeenCalledWith(
        "payload",
        "signature",
        "whsec_test123"
      );
    });

    it("should throw if webhook secret not set", () => {
      const original = process.env.STRIPE_WEBHOOK_SECRET;
      delete process.env.STRIPE_WEBHOOK_SECRET;

      expect(() => verifyWebhookSignature("payload", "signature")).toThrow(
        "STRIPE_WEBHOOK_SECRET environment variable is not set"
      );

      process.env.STRIPE_WEBHOOK_SECRET = original;
    });
  });

  describe("getStripeClient (via exported functions)", () => {
    it("should throw if STRIPE_SECRET_KEY not set", async () => {
      const original = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;

      // getOrCreateCustomer calls getStripeClient internally
      mockSupabaseAdmin.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      });

      await expect(getOrCreateCustomer("user123", "test@example.com")).rejects.toThrow(
        "STRIPE_SECRET_KEY environment variable is not set"
      );

      process.env.STRIPE_SECRET_KEY = original;
    });
  });
});
