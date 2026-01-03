/**
 * Stripe Module Tests
 */

import { describe, expect, it, vi } from "vitest";

import { getPriceId, getTierFromPriceId } from "./stripe";

// Mock Supabase admin client
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe("stripe", () => {
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
});
