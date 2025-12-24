import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createExpenditureSource,
    deleteExpenditureSource,
    getExpenditures,
    isCurrentUserAdmin,
    updateConsumptionCost,
    updateExpenditureSource,
} from "./actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockRpc = vi.fn();
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      rpc: mockRpc,
      from: mockFrom,
    })
  ),
}));

// Helper to create chainable mock
function createChainMock(finalResult: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(finalResult),
    single: vi.fn().mockResolvedValue(finalResult),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  return chain;
}

describe("expenditures actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });
  });

  describe("isCurrentUserAdmin", () => {
    it("returns true when user is admin", async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });

      const result = await isCurrentUserAdmin();

      expect(result).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("is_admin");
    });

    it("returns false when user is not admin", async () => {
      mockRpc.mockResolvedValue({ data: false, error: null });

      const result = await isCurrentUserAdmin();

      expect(result).toBe(false);
    });

    it("returns false when rpc returns null", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await isCurrentUserAdmin();

      expect(result).toBe(false);
    });
  });

  describe("getExpenditures", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await getExpenditures();

      expect(result).toEqual({ sources: [], error: "Not authenticated" });
    });

    it("returns expenditures for authenticated user", async () => {
      const mockData = [
        {
          id: "exp-1",
          user_id: "user-123",
          name: "AWS",
          base_cost: "100.00",
          billing_cycle: "monthly",
          billing_day_of_month: 15,
          billing_month: null,
          consumption_cost: "50.00",
          details_url: "https://aws.amazon.com",
          notes: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
      ];
      const chain = createChainMock({ data: mockData, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await getExpenditures();

      expect(result.error).toBeUndefined();
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].name).toBe("AWS");
      expect(result.sources[0].baseCost).toBe(100);
      expect(result.sources[0].consumptionCost).toBe(50);
      expect(result.sources[0].billingMonth).toBeNull();
    });

    it("returns error when database query fails", async () => {
      const chain = createChainMock({ data: null, error: { message: "DB error" } });
      mockFrom.mockReturnValue(chain);

      const result = await getExpenditures();

      expect(result).toEqual({ sources: [], error: "DB error" });
    });
  });

  describe("createExpenditureSource", () => {
    const validInput = {
      name: "New Service",
      baseCost: 99.99,
      billingCycle: "monthly" as const,
      billingDayOfMonth: 1,
    };

    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await createExpenditureSource(validInput);

      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });

    it("creates expenditure source successfully", async () => {
      const chain = createChainMock({ data: { id: "new-id" }, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await createExpenditureSource(validInput);

      expect(result.success).toBe(true);
      expect(result.id).toBe("new-id");
      expect(mockFrom).toHaveBeenCalledWith("expenditure_sources");
      expect(chain.insert).toHaveBeenCalledWith({
        user_id: "user-123",
        name: "New Service",
        base_cost: 99.99,
        billing_cycle: "monthly",
        billing_day_of_month: 1,
        billing_month: null,
        consumption_cost: 0,
        details_url: null,
        notes: null,
      });
    });

    it("uses provided consumptionCost and detailsUrl", async () => {
      const chain = createChainMock({ data: { id: "new-id" }, error: null });
      mockFrom.mockReturnValue(chain);

      const inputWithOptionals = {
        ...validInput,
        consumptionCost: 25.5,
        detailsUrl: "https://example.com",
      };

      await createExpenditureSource(inputWithOptionals);

      expect(chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          consumption_cost: 25.5,
          details_url: "https://example.com",
        })
      );
    });

    it("returns error when insert fails", async () => {
      const chain = createChainMock({ data: null, error: { message: "Insert failed" } });
      mockFrom.mockReturnValue(chain);

      const result = await createExpenditureSource(validInput);

      expect(result).toEqual({ success: false, error: "Insert failed" });
    });
  });

  describe("updateExpenditureSource", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await updateExpenditureSource("exp-1", { name: "Updated" });

      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });

    it("updates only provided fields", async () => {
      const chain = createChainMock({ data: null, error: null });
      // Make eq return the chain with the resolved value on the last eq call
      chain.eq.mockImplementation(() => {
        chain.eq.mockResolvedValue({ error: null });
        return chain;
      });
      mockFrom.mockReturnValue(chain);

      const result = await updateExpenditureSource("exp-1", {
        name: "Updated Name",
        baseCost: 200,
      });

      expect(chain.update).toHaveBeenCalledWith({
        name: "Updated Name",
        base_cost: 200,
      });
      expect(result).toEqual({ success: true });
    });

    it("updates all fields when provided", async () => {
      const chain = createChainMock({ data: null, error: null });
      chain.eq.mockImplementation(() => {
        chain.eq.mockResolvedValue({ error: null });
        return chain;
      });
      mockFrom.mockReturnValue(chain);

      await updateExpenditureSource("exp-1", {
        name: "Full Update",
        baseCost: 150,
        billingCycle: "yearly",
        billingDayOfMonth: 15,
        consumptionCost: 75,
        detailsUrl: "https://new-url.com",
        notes: "Updated notes",
      });

      expect(chain.update).toHaveBeenCalledWith({
        name: "Full Update",
        base_cost: 150,
        billing_cycle: "yearly",
        billing_day_of_month: 15,
        consumption_cost: 75,
        details_url: "https://new-url.com",
        notes: "Updated notes",
      });
    });

    it("returns error when update fails", async () => {
      const chain = createChainMock({ data: null, error: null });
      chain.eq.mockImplementation(() => {
        chain.eq.mockResolvedValue({ error: { message: "Update failed" } });
        return chain;
      });
      mockFrom.mockReturnValue(chain);

      const result = await updateExpenditureSource("exp-1", { name: "Updated" });

      expect(result).toEqual({ success: false, error: "Update failed" });
    });
  });

  describe("updateConsumptionCost", () => {
    it("delegates to updateExpenditureSource", async () => {
      const chain = createChainMock({ data: null, error: null });
      chain.eq.mockImplementation(() => {
        chain.eq.mockResolvedValue({ error: null });
        return chain;
      });
      mockFrom.mockReturnValue(chain);

      const result = await updateConsumptionCost("exp-1", 123.45);

      expect(result).toEqual({ success: true });
      expect(chain.update).toHaveBeenCalledWith({ consumption_cost: 123.45 });
    });
  });

  describe("deleteExpenditureSource", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await deleteExpenditureSource("exp-1");

      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });

    it("deletes expenditure source successfully", async () => {
      const chain = createChainMock({ data: null, error: null });
      chain.eq.mockImplementation(() => {
        chain.eq.mockResolvedValue({ error: null });
        return chain;
      });
      mockFrom.mockReturnValue(chain);

      const result = await deleteExpenditureSource("exp-1");

      expect(result).toEqual({ success: true });
      expect(mockFrom).toHaveBeenCalledWith("expenditure_sources");
      expect(chain.delete).toHaveBeenCalled();
    });

    it("returns error when delete fails", async () => {
      const chain = createChainMock({ data: null, error: null });
      chain.eq.mockImplementation(() => {
        chain.eq.mockResolvedValue({ error: { message: "Delete failed" } });
        return chain;
      });
      mockFrom.mockReturnValue(chain);

      const result = await deleteExpenditureSource("exp-1");

      expect(result).toEqual({ success: false, error: "Delete failed" });
    });
  });
});
