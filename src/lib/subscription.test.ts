/**
 * Subscription Module Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getMonthlyAllowance,
  getSubscription,
  getSubscriptionByUserId,
  getTier,
  TIER_CREDITS,
  TIER_NAMES,
  TIER_PRICING,
  updateSubscriptionTier,
} from "./subscription";

// Mock Supabase clients
const mockGetUser = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockSingle(),
        }),
      }),
    }),
  }),
}));

const mockAdminSingle = vi.fn();
const mockAdminUpdate = vi.fn();
const mockAdminUpdateEq = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "subscriptions") {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockAdminSingle(),
            }),
          }),
          update: (data: unknown) => {
            mockAdminUpdate(data);
            return {
              eq: () => mockAdminUpdateEq(),
            };
          },
        };
      }
      return {};
    }),
  },
}));

describe("subscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("TIER_CREDITS", () => {
    it("should have correct credit amounts for each tier", () => {
      expect(TIER_CREDITS.free).toBe(100);
      expect(TIER_CREDITS.pro).toBe(1500);
      expect(TIER_CREDITS.pro_plus).toBe(3500);
    });
  });

  describe("TIER_PRICING", () => {
    it("should have correct pricing for each tier", () => {
      expect(TIER_PRICING.free).toBe(0);
      expect(TIER_PRICING.pro).toBe(10);
      expect(TIER_PRICING.pro_plus).toBe(20);
    });
  });

  describe("TIER_NAMES", () => {
    it("should have correct display names for each tier", () => {
      expect(TIER_NAMES.free).toBe("Free");
      expect(TIER_NAMES.pro).toBe("Pro");
      expect(TIER_NAMES.pro_plus).toBe("Pro+");
    });
  });

  describe("getMonthlyAllowance", () => {
    it("should return correct allowance for free tier", () => {
      expect(getMonthlyAllowance("free")).toBe(100);
    });

    it("should return correct allowance for pro tier", () => {
      expect(getMonthlyAllowance("pro")).toBe(1500);
    });

    it("should return correct allowance for pro_plus tier", () => {
      expect(getMonthlyAllowance("pro_plus")).toBe(3500);
    });
  });

  describe("getSubscription", () => {
    it("should return null when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getSubscription();

      expect(result).toBeNull();
    });

    it("should return null when subscription not found", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockSingle.mockResolvedValue({ data: null });

      const result = await getSubscription();

      expect(result).toBeNull();
    });

    it("should return subscription with all fields mapped correctly", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockSingle.mockResolvedValue({
        data: {
          id: "sub-1",
          user_id: "user-1",
          stripe_customer_id: "cus_123",
          stripe_subscription_id: "sub_123",
          tier: "pro",
          billing_cycle: "monthly",
          status: "active",
          current_period_start: "2024-01-01T00:00:00Z",
          current_period_end: "2024-02-01T00:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-15T00:00:00Z",
        },
      });

      const result = await getSubscription();

      expect(result).toEqual({
        id: "sub-1",
        userId: "user-1",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        tier: "pro",
        billingCycle: "monthly",
        status: "active",
        currentPeriodStart: new Date("2024-01-01T00:00:00Z"),
        currentPeriodEnd: new Date("2024-02-01T00:00:00Z"),
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-15T00:00:00Z"),
      });
    });

    it("should handle null period dates", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockSingle.mockResolvedValue({
        data: {
          id: "sub-1",
          user_id: "user-1",
          stripe_customer_id: null,
          stripe_subscription_id: null,
          tier: "free",
          billing_cycle: null,
          status: "active",
          current_period_start: null,
          current_period_end: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      });

      const result = await getSubscription();

      expect(result?.currentPeriodStart).toBeNull();
      expect(result?.currentPeriodEnd).toBeNull();
      expect(result?.billingCycle).toBeNull();
    });
  });

  describe("getTier", () => {
    it("should return subscription tier when subscription exists", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockSingle.mockResolvedValue({
        data: {
          id: "sub-1",
          user_id: "user-1",
          tier: "pro_plus",
          status: "active",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      });

      const result = await getTier();

      expect(result).toBe("pro_plus");
    });

    it("should return free when subscription is null", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getTier();

      expect(result).toBe("free");
    });
  });

  describe("getSubscriptionByUserId", () => {
    it("should return null when subscription not found", async () => {
      mockAdminSingle.mockResolvedValue({ data: null });

      const result = await getSubscriptionByUserId("user-1");

      expect(result).toBeNull();
    });

    it("should return subscription mapped correctly", async () => {
      mockAdminSingle.mockResolvedValue({
        data: {
          id: "sub-1",
          user_id: "user-1",
          stripe_customer_id: "cus_123",
          stripe_subscription_id: "sub_123",
          tier: "pro",
          billing_cycle: "annual",
          status: "trialing",
          current_period_start: "2024-01-01T00:00:00Z",
          current_period_end: "2025-01-01T00:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-15T00:00:00Z",
        },
      });

      const result = await getSubscriptionByUserId("user-1");

      expect(result).toEqual({
        id: "sub-1",
        userId: "user-1",
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        tier: "pro",
        billingCycle: "annual",
        status: "trialing",
        currentPeriodStart: new Date("2024-01-01T00:00:00Z"),
        currentPeriodEnd: new Date("2025-01-01T00:00:00Z"),
        createdAt: new Date("2024-01-01T00:00:00Z"),
        updatedAt: new Date("2024-01-15T00:00:00Z"),
      });
    });
  });

  describe("updateSubscriptionTier", () => {
    it("should update tier with default active status", async () => {
      mockAdminUpdateEq.mockResolvedValue({ error: null });

      await updateSubscriptionTier("user-1", "pro");

      expect(mockAdminUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: "pro",
          status: "active",
        })
      );
    });

    it("should update tier with custom status", async () => {
      mockAdminUpdateEq.mockResolvedValue({ error: null });

      await updateSubscriptionTier("user-1", "pro_plus", "canceled");

      expect(mockAdminUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: "pro_plus",
          status: "canceled",
        })
      );
    });
  });
});
