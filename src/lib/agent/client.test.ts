/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock createOpenRouter before importing
vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn(() => ({
    chat: vi.fn((model) => ({ model })),
  })),
}));

describe("agent client", () => {
  const originalEnv = process.env.OPENROUTER_API_KEY;

  beforeEach(() => {
    vi.resetModules();
    process.env.OPENROUTER_API_KEY = "test-api-key";
  });

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalEnv;
    vi.resetAllMocks();
  });

  describe("getOpenRouter", () => {
    it("should create and cache OpenRouter client", async () => {
      const { getOpenRouter } = await import("./client");
      const client1 = getOpenRouter();
      const client2 = getOpenRouter();
      expect(client1).toBe(client2);
    });

    it("should throw error when API key is not set", async () => {
      delete process.env.OPENROUTER_API_KEY;
      vi.resetModules();
      const { getOpenRouter } = await import("./client");
      expect(() => getOpenRouter()).toThrow("OPENROUTER_API_KEY environment variable is not set");
    });
  });

  describe("calculateCost", () => {
    it("should calculate cost for known model", async () => {
      const { calculateCost } = await import("./client");
      // Claude Sonnet 4: input $0.003, output $0.015 per 1000 tokens
      const cost = calculateCost("anthropic/claude-sonnet-4", 1000, 1000);
      expect(cost).toBeCloseTo(0.018);
    });

    it("should calculate cost for Claude Opus model", async () => {
      const { calculateCost } = await import("./client");
      // Claude Opus 4: input $0.015, output $0.075 per 1000 tokens
      const cost = calculateCost("anthropic/claude-opus-4", 1000, 1000);
      expect(cost).toBeCloseTo(0.09);
    });

    it("should calculate cost for GPT-4o model", async () => {
      const { calculateCost } = await import("./client");
      // GPT-4o: input $0.005, output $0.015 per 1000 tokens
      const cost = calculateCost("openai/gpt-4o", 1000, 1000);
      expect(cost).toBeCloseTo(0.02);
    });

    it("should calculate cost for GPT-4o-mini model", async () => {
      const { calculateCost } = await import("./client");
      // GPT-4o-mini: input $0.00015, output $0.0006 per 1000 tokens
      const cost = calculateCost("openai/gpt-4o-mini", 1000, 1000);
      expect(cost).toBeCloseTo(0.00075);
    });

    it("should calculate cost for Gemini model", async () => {
      const { calculateCost } = await import("./client");
      // Gemini: input $0.0001, output $0.0004 per 1000 tokens
      const cost = calculateCost("google/gemini-2.0-flash-001", 1000, 1000);
      expect(cost).toBeCloseTo(0.0005);
    });

    it("should use default pricing for unknown model", async () => {
      const { calculateCost } = await import("./client");
      // Default: input $0.001, output $0.002 per 1000 tokens
      const cost = calculateCost("unknown/model", 1000, 1000);
      expect(cost).toBeCloseTo(0.003);
    });

    it("should handle zero tokens", async () => {
      const { calculateCost } = await import("./client");
      const cost = calculateCost("openai/gpt-4o", 0, 0);
      expect(cost).toBe(0);
    });

    it("should return zero cost for free models", async () => {
      const { calculateCost } = await import("./client");
      expect(calculateCost("meta-llama/llama-3.3-70b-instruct:free", 1000, 1000)).toBe(0);
      expect(calculateCost("meta-llama/llama-3.1-8b-instruct:free", 5000, 2000)).toBe(0);
      expect(calculateCost("google/gemini-2.0-flash-exp:free", 10000, 10000)).toBe(0);
      expect(calculateCost("deepseek/deepseek-r1:free", 1000, 1000)).toBe(0);
    });

    it("should return zero cost for any model ending with :free", async () => {
      const { calculateCost } = await import("./client");
      expect(calculateCost("some-provider/some-model:free", 1000, 1000)).toBe(0);
    });
  });

  describe("getAvailableModels", () => {
    it("should return list of available models", async () => {
      const { getAvailableModels } = await import("./client");
      const models = getAvailableModels();
      expect(models).toHaveLength(5);
      expect(models[0]).toEqual({ id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" });
    });

    it("should include all expected models", async () => {
      const { getAvailableModels } = await import("./client");
      const models = getAvailableModels();
      const ids = models.map((m) => m.id);
      expect(ids).toContain("anthropic/claude-sonnet-4");
      expect(ids).toContain("anthropic/claude-opus-4");
      expect(ids).toContain("openai/gpt-4o");
      expect(ids).toContain("openai/gpt-4o-mini");
      expect(ids).toContain("google/gemini-2.0-flash-001");
    });
  });

  describe("DEFAULT_MODEL", () => {
    it("should be Claude Sonnet 4", async () => {
      const { DEFAULT_MODEL } = await import("./client");
      expect(DEFAULT_MODEL).toBe("anthropic/claude-sonnet-4");
    });
  });

  describe("MODEL_PRICES", () => {
    it("should have correct prices for Claude Sonnet 4", async () => {
      const { MODEL_PRICES } = await import("./client");
      expect(MODEL_PRICES["anthropic/claude-sonnet-4"]).toEqual({ input: 0.003, output: 0.015, contextWindow: 1000000 });
    });

    it("should have correct prices for all models", async () => {
      const { MODEL_PRICES } = await import("./client");
      expect(Object.keys(MODEL_PRICES)).toHaveLength(10);
    });

    it("should include context window for all models", async () => {
      const { MODEL_PRICES } = await import("./client");
      for (const key of Object.keys(MODEL_PRICES)) {
        expect(MODEL_PRICES[key].contextWindow).toBeGreaterThan(0);
      }
    });
  });

  describe("getContextWindow", () => {
    it("should return context window for known model", async () => {
      const { getContextWindow } = await import("./client");
      expect(getContextWindow("anthropic/claude-sonnet-4")).toBe(1000000);
      expect(getContextWindow("anthropic/claude-opus-4")).toBe(200000);
      expect(getContextWindow("openai/gpt-4o")).toBe(128000);
      expect(getContextWindow("openai/gpt-4o-mini")).toBe(128000);
      expect(getContextWindow("google/gemini-2.0-flash-001")).toBe(1000000);
    });

    it("should return default context window for unknown model", async () => {
      const { getContextWindow } = await import("./client");
      expect(getContextWindow("unknown/model")).toBe(128000);
    });
  });
});
