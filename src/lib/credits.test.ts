/**
 * Credits Module Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addCredits,
  canUsePaidModels,
  canUsePaidModelsByUserId,
  deductCredits,
  formatCredits,
  getCreditsBalance,
  getCreditsBalanceByUserId,
  getCreditsInfo,
  getCreditTransactions,
  handleTrialExpiry,
  isTrialActive,
  resetMonthlyCredits,
  usdToCents,
} from "./credits";

// Mock Supabase clients
const mockGetUser = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
    },
    from: (table: string) => {
      if (table === "user_credits") {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockSingle(),
            }),
          }),
        };
      }
      if (table === "credit_transactions") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => mockSingle(),
              }),
            }),
          }),
        };
      }
      return {};
    },
  }),
}));

const mockAdminSingle = vi.fn();
const mockAdminUpdate = vi.fn();
const mockAdminInsert = vi.fn();
const mockAdminRpc = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === "user_credits") {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockAdminSingle(),
            }),
          }),
          update: (data: unknown) => {
            mockAdminUpdate(data);
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        };
      }
      if (table === "credit_transactions") {
        return {
          insert: (data: unknown) => {
            mockAdminInsert(data);
            return Promise.resolve({ error: null });
          },
        };
      }
      return {};
    }),
    rpc: (fn: string, params: unknown) => mockAdminRpc(fn, params),
  },
}));

describe("credits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("formatCredits", () => {
    it("should format positive cents as dollars", () => {
      expect(formatCredits(100)).toBe("$1.00");
      expect(formatCredits(1500)).toBe("$15.00");
      expect(formatCredits(3500)).toBe("$35.00");
    });

    it("should format zero cents", () => {
      expect(formatCredits(0)).toBe("$0.00");
    });

    it("should format small amounts with cents", () => {
      expect(formatCredits(50)).toBe("$0.50");
      expect(formatCredits(1)).toBe("$0.01");
    });

    it("should format negative amounts (for transactions)", () => {
      expect(formatCredits(-100)).toBe("$-1.00");
      expect(formatCredits(-50)).toBe("$-0.50");
    });
  });

  describe("usdToCents", () => {
    it("should convert whole dollars to cents", () => {
      expect(usdToCents(1)).toBe(100);
      expect(usdToCents(10)).toBe(1000);
      expect(usdToCents(35)).toBe(3500);
    });

    it("should convert fractional dollars to cents", () => {
      expect(usdToCents(0.5)).toBe(50);
      expect(usdToCents(0.01)).toBe(1);
      expect(usdToCents(1.99)).toBe(199);
    });

    it("should round to nearest cent", () => {
      expect(usdToCents(0.001)).toBe(0);
      expect(usdToCents(0.005)).toBe(1); // rounds up
      expect(usdToCents(0.004)).toBe(0); // rounds down
    });

    it("should handle zero", () => {
      expect(usdToCents(0)).toBe(0);
    });
  });

  describe("getCreditsBalance", () => {
    it("should return 0 when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getCreditsBalance();

      expect(result).toBe(0);
    });

    it("should return 0 when no credits record exists", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockSingle.mockResolvedValue({ data: null });

      const result = await getCreditsBalance();

      expect(result).toBe(0);
    });

    it("should return credits balance", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockSingle.mockResolvedValue({ data: { credits_cents: 1500 } });

      const result = await getCreditsBalance();

      expect(result).toBe(1500);
    });
  });

  describe("isTrialActive", () => {
    it("should return false when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await isTrialActive();

      expect(result).toBe(false);
    });

    it("should return false when no trial_ends_at", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockSingle.mockResolvedValue({ data: { trial_ends_at: null } });

      const result = await isTrialActive();

      expect(result).toBe(false);
    });

    it("should return false when trial has expired", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockSingle.mockResolvedValue({ data: { trial_ends_at: "2020-01-01T00:00:00Z" } });

      const result = await isTrialActive();

      expect(result).toBe(false);
    });

    it("should return true when trial is active", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      mockSingle.mockResolvedValue({ data: { trial_ends_at: futureDate.toISOString() } });

      const result = await isTrialActive();

      expect(result).toBe(true);
    });
  });

  describe("canUsePaidModels", () => {
    it("should return false when no credits", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockSingle.mockResolvedValue({ data: { credits_cents: 0 } });

      const result = await canUsePaidModels();

      expect(result).toBe(false);
    });

    it("should return true when has credits", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockSingle.mockResolvedValue({ data: { credits_cents: 100 } });

      const result = await canUsePaidModels();

      expect(result).toBe(true);
    });
  });

  describe("getCreditsInfo", () => {
    it("should return null when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getCreditsInfo();

      expect(result).toBeNull();
    });

    it("should return null when no credits record exists", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockSingle.mockResolvedValue({ data: null });

      const result = await getCreditsInfo();

      expect(result).toBeNull();
    });

    it("should return full credits info with active trial", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      mockSingle.mockResolvedValue({
        data: {
          credits_cents: 1000,
          trial_ends_at: futureDate.toISOString(),
        },
      });

      const result = await getCreditsInfo();

      expect(result).toEqual({
        balanceCents: 1000,
        balanceDollars: 10,
        isTrialActive: true,
        trialEndsAt: expect.any(Date),
        daysUntilTrialEnds: expect.any(Number),
      });
      expect(result?.daysUntilTrialEnds).toBeGreaterThanOrEqual(4);
      expect(result?.daysUntilTrialEnds).toBeLessThanOrEqual(6);
    });

    it("should return credits info with no trial", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockSingle.mockResolvedValue({
        data: {
          credits_cents: 500,
          trial_ends_at: null,
        },
      });

      const result = await getCreditsInfo();

      expect(result).toEqual({
        balanceCents: 500,
        balanceDollars: 5,
        isTrialActive: false,
        trialEndsAt: null,
        daysUntilTrialEnds: null,
      });
    });

    it("should return credits info with expired trial", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockSingle.mockResolvedValue({
        data: {
          credits_cents: 100,
          trial_ends_at: "2020-01-01T00:00:00Z",
        },
      });

      const result = await getCreditsInfo();

      expect(result).toEqual({
        balanceCents: 100,
        balanceDollars: 1,
        isTrialActive: false,
        trialEndsAt: expect.any(Date),
        daysUntilTrialEnds: null,
      });
    });
  });

  describe("getCreditTransactions", () => {
    it("should return empty array when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getCreditTransactions();

      expect(result).toEqual([]);
    });

    it("should return transactions mapped correctly", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockSingle.mockResolvedValue({
        data: [
          {
            id: "tx-1",
            user_id: "user-1",
            amount_cents: -50,
            reason: "ai_usage",
            reference_id: "msg-123",
            created_at: "2024-01-15T00:00:00Z",
          },
          {
            id: "tx-2",
            user_id: "user-1",
            amount_cents: 1500,
            reason: "monthly_reset",
            reference_id: null,
            created_at: "2024-01-01T00:00:00Z",
          },
        ],
      });

      const result = await getCreditTransactions();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: "tx-1",
        userId: "user-1",
        amountCents: -50,
        reason: "ai_usage",
        referenceId: "msg-123",
        createdAt: new Date("2024-01-15T00:00:00Z"),
      });
    });

    it("should return empty array when no transactions", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
      mockSingle.mockResolvedValue({ data: null });

      const result = await getCreditTransactions();

      expect(result).toEqual([]);
    });
  });

  describe("getCreditsBalanceByUserId", () => {
    it("should return 0 when no record exists", async () => {
      mockAdminSingle.mockResolvedValue({ data: null });

      const result = await getCreditsBalanceByUserId("user-1");

      expect(result).toBe(0);
    });

    it("should return credits balance", async () => {
      mockAdminSingle.mockResolvedValue({ data: { credits_cents: 2500 } });

      const result = await getCreditsBalanceByUserId("user-1");

      expect(result).toBe(2500);
    });
  });

  describe("canUsePaidModelsByUserId", () => {
    it("should return false when no credits", async () => {
      mockAdminSingle.mockResolvedValue({ data: { credits_cents: 0 } });

      const result = await canUsePaidModelsByUserId("user-1");

      expect(result).toBe(false);
    });

    it("should return true when has credits", async () => {
      mockAdminSingle.mockResolvedValue({ data: { credits_cents: 100 } });

      const result = await canUsePaidModelsByUserId("user-1");

      expect(result).toBe(true);
    });
  });

  describe("deductCredits", () => {
    it("should return true for zero or negative amount (no-op)", async () => {
      const result = await deductCredits("user-1", 0, "test");
      expect(result).toBe(true);

      const result2 = await deductCredits("user-1", -10, "test");
      expect(result2).toBe(true);
    });

    it("should call rpc to deduct credits", async () => {
      mockAdminRpc.mockReturnValue(Promise.resolve({ error: null }));

      const result = await deductCredits("user-1", 50, "ai_usage", "msg-123");

      expect(result).toBe(true);
      expect(mockAdminRpc).toHaveBeenCalledWith("deduct_credits", {
        target_user_id: "user-1",
        amount: 50,
        usage_reason: "ai_usage",
        ref_id: "msg-123",
      });
    });

    it("should round amount to nearest cent", async () => {
      mockAdminRpc.mockReturnValue(Promise.resolve({ error: null }));

      await deductCredits("user-1", 50.6, "ai_usage");

      expect(mockAdminRpc).toHaveBeenCalledWith("deduct_credits", {
        target_user_id: "user-1",
        amount: 51,
        usage_reason: "ai_usage",
        ref_id: undefined,
      });
    });

    it("should return false on error", async () => {
      mockAdminRpc.mockReturnValue(Promise.resolve({ error: { message: "Insufficient credits" } }));

      const result = await deductCredits("user-1", 100, "ai_usage");

      expect(result).toBe(false);
    });
  });

  describe("addCredits", () => {
    it("should return false for zero or negative amount", async () => {
      const result = await addCredits("user-1", 0, "test");
      expect(result).toBe(false);

      const result2 = await addCredits("user-1", -10, "test");
      expect(result2).toBe(false);
    });

    it("should return false when user credits not found", async () => {
      mockAdminSingle.mockResolvedValue({ data: null });

      const result = await addCredits("user-1", 100, "refund");

      expect(result).toBe(false);
    });

    it("should add credits and record transaction", async () => {
      mockAdminSingle.mockResolvedValue({ data: { credits_cents: 500 } });

      const result = await addCredits("user-1", 100, "bonus");

      expect(result).toBe(true);
      expect(mockAdminUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          credits_cents: 600,
        })
      );
      expect(mockAdminInsert).toHaveBeenCalledWith({
        user_id: "user-1",
        amount_cents: 100,
        reason: "bonus",
      });
    });
  });

  describe("resetMonthlyCredits", () => {
    it("should call rpc to reset credits", async () => {
      mockAdminRpc.mockReturnValue(Promise.resolve({ error: null }));

      await resetMonthlyCredits("user-1");

      expect(mockAdminRpc).toHaveBeenCalledWith("reset_monthly_credits", {
        target_user_id: "user-1",
      });
    });
  });

  describe("handleTrialExpiry", () => {
    it("should call rpc to handle trial expiry", async () => {
      mockAdminRpc.mockReturnValue(Promise.resolve({ error: null }));

      await handleTrialExpiry("user-1");

      expect(mockAdminRpc).toHaveBeenCalledWith("handle_trial_expiry", {
        target_user_id: "user-1",
      });
    });
  });
});
