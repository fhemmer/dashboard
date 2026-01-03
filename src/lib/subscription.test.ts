/**
 * Subscription Module Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getMonthlyAllowance, TIER_CREDITS, TIER_NAMES, TIER_PRICING } from "./subscription";

// Mock Supabase clients
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
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
});
