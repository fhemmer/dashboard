/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock Redis before importing
vi.mock("@/lib/redis", () => ({
  getCache: vi.fn(),
  setCache: vi.fn().mockResolvedValue(true),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("openrouter/models", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env.OPENROUTER_API_KEY = "test-api-key";
    process.env.OPENROUTER_PROFIT_MARGIN = "0.1";
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetAllMocks();
  });

  describe("getProfitMargin", () => {
    it("should return default 10% when not set", async () => {
      delete process.env.OPENROUTER_PROFIT_MARGIN;
      vi.resetModules();
      const { getProfitMargin } = await import("./models");
      expect(getProfitMargin()).toBe(0.1);
    });

    it("should parse custom margin from env", async () => {
      process.env.OPENROUTER_PROFIT_MARGIN = "0.15";
      vi.resetModules();
      const { getProfitMargin } = await import("./models");
      expect(getProfitMargin()).toBe(0.15);
    });

    it("should return default for invalid margin", async () => {
      process.env.OPENROUTER_PROFIT_MARGIN = "invalid";
      vi.resetModules();
      const { getProfitMargin } = await import("./models");
      expect(getProfitMargin()).toBe(0.1);
    });

    it("should return default for negative margin", async () => {
      process.env.OPENROUTER_PROFIT_MARGIN = "-0.1";
      vi.resetModules();
      const { getProfitMargin } = await import("./models");
      expect(getProfitMargin()).toBe(0.1);
    });

    it("should return default for margin > 1", async () => {
      process.env.OPENROUTER_PROFIT_MARGIN = "1.5";
      vi.resetModules();
      const { getProfitMargin } = await import("./models");
      expect(getProfitMargin()).toBe(0.1);
    });
  });

  describe("formatPrice", () => {
    it("should format zero as Free", async () => {
      const { formatPrice } = await import("./models");
      expect(formatPrice(0)).toBe("Free");
    });

    it("should format small prices with 4 decimals", async () => {
      const { formatPrice } = await import("./models");
      expect(formatPrice(0.005)).toBe("$0.0050");
    });

    it("should format medium prices with 2 decimals", async () => {
      const { formatPrice } = await import("./models");
      expect(formatPrice(0.5)).toBe("$0.50");
    });

    it("should format large prices with 2 decimals", async () => {
      const { formatPrice } = await import("./models");
      expect(formatPrice(3.0)).toBe("$3.00");
    });
  });

  describe("getModelsWithPricing", () => {
    it("should return cached models if available", async () => {
      const { getCache } = await import("@/lib/redis");
      const cachedModels = [
        {
          id: "test/model",
          name: "Test Model",
          description: "A test model",
          contextLength: 100000,
          inputPricePerMillion: 1.1,
          outputPricePerMillion: 2.2,
          reasoningPricePerMillion: 0,
          inputModalities: ["text"],
          outputModalities: ["text"],
          providerId: "test",
          isFree: false,
          supportsTools: true,
        },
      ];
      vi.mocked(getCache).mockResolvedValueOnce(cachedModels);

      const { getModelsWithPricing } = await import("./models");
      const result = await getModelsWithPricing();

      expect(result).toEqual(cachedModels);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should fetch from API when cache is empty", async () => {
      const { getCache, setCache } = await import("@/lib/redis");
      vi.mocked(getCache).mockResolvedValueOnce(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "anthropic/claude-sonnet-4",
                name: "Claude Sonnet 4",
                description: "Test description",
                context_length: 200000,
                pricing: {
                  prompt: "0.000003",
                  completion: "0.000015",
                  request: "0",
                  image: "0",
                  web_search: "0",
                  internal_reasoning: "0",
                  input_cache_read: "0",
                  input_cache_write: "0",
                },
                architecture: {
                  input_modalities: ["text"],
                  output_modalities: ["text"],
                  tokenizer: "claude",
                  instruct_type: null,
                },
                top_provider: {
                  context_length: 200000,
                  max_completion_tokens: 4096,
                  is_moderated: false,
                },
                supported_parameters: ["tools", "tool_choice", "temperature"],
              },
            ],
          }),
      });

      const { getModelsWithPricing } = await import("./models");
      const result = await getModelsWithPricing();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBe("anthropic/claude-sonnet-4");
      // Price per token * 1M * 1.1 margin = 0.000003 * 1000000 * 1.1 = 3.3
      expect(result[0].inputPricePerMillion).toBeCloseTo(3.3, 1);
      expect(setCache).toHaveBeenCalled();
    });

    it("should throw error when API key is not set", async () => {
      delete process.env.OPENROUTER_API_KEY;
      vi.resetModules();

      const { getCache } = await import("@/lib/redis");
      vi.mocked(getCache).mockResolvedValueOnce(null);

      const { getModelsWithPricing } = await import("./models");

      await expect(getModelsWithPricing()).rejects.toThrow(
        "OPENROUTER_API_KEY environment variable is not set"
      );
    });

    it("should throw error on API failure", async () => {
      const { getCache } = await import("@/lib/redis");
      vi.mocked(getCache).mockResolvedValueOnce(null);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const { getModelsWithPricing } = await import("./models");

      await expect(getModelsWithPricing()).rejects.toThrow(
        "OpenRouter API error: 500 Internal Server Error"
      );
    });
  });

  describe("getModelWithPricing", () => {
    it("should return model by ID", async () => {
      const { getCache } = await import("@/lib/redis");
      const cachedModels = [
        {
          id: "anthropic/claude-sonnet-4-20250514",
          name: "Claude Sonnet 4",
          description: "Test",
          contextLength: 200000,
          inputPricePerMillion: 3.3,
          outputPricePerMillion: 16.5,
          reasoningPricePerMillion: 0,
          inputModalities: ["text"],
          outputModalities: ["text"],
          providerId: "anthropic",
          isFree: false,
          supportsTools: true,
        },
      ];
      vi.mocked(getCache).mockResolvedValueOnce(cachedModels);

      const { getModelWithPricing } = await import("./models");
      const result = await getModelWithPricing("anthropic/claude-sonnet-4-20250514");

      expect(result).toEqual(cachedModels[0]);
    });

    it("should return null for unknown model", async () => {
      const { getCache } = await import("@/lib/redis");
      vi.mocked(getCache).mockResolvedValueOnce([]);

      const { getModelWithPricing } = await import("./models");
      const result = await getModelWithPricing("unknown/model");

      expect(result).toBeNull();
    });
  });

  describe("calculateCostWithMargin", () => {
    it("should calculate cost for known model", async () => {
      const { getCache } = await import("@/lib/redis");
      const cachedModels = [
        {
          id: "anthropic/claude-sonnet-4-20250514",
          name: "Claude Sonnet 4",
          description: "Test",
          contextLength: 200000,
          inputPricePerMillion: 3.3, // Already includes margin
          outputPricePerMillion: 16.5,
          reasoningPricePerMillion: 0,
          inputModalities: ["text"],
          outputModalities: ["text"],
          providerId: "anthropic",
          isFree: false,
          supportsTools: true,
        },
      ];
      vi.mocked(getCache).mockResolvedValueOnce(cachedModels);

      const { calculateCostWithMargin } = await import("./models");
      // 1000 input tokens = 1000/1M * 3.3 = 0.0033
      // 1000 output tokens = 1000/1M * 16.5 = 0.0165
      // Total = 0.0198
      const cost = await calculateCostWithMargin(
        "anthropic/claude-sonnet-4-20250514",
        1000,
        1000
      );

      expect(cost).toBeCloseTo(0.0198, 4);
    });

    it("should use fallback pricing for unknown model", async () => {
      const { getCache } = await import("@/lib/redis");
      vi.mocked(getCache).mockResolvedValueOnce([]);

      const { calculateCostWithMargin } = await import("./models");
      const cost = await calculateCostWithMargin("unknown/model", 1000, 1000);

      // Fallback: (1000 * 0.001 + 1000 * 0.002) / 1000 * 1.1 = 0.0033
      expect(cost).toBeCloseTo(0.0033, 4);
    });

    it("should include reasoning tokens in cost", async () => {
      const { getCache } = await import("@/lib/redis");
      const cachedModels = [
        {
          id: "openai/o1",
          name: "O1",
          description: "Test",
          contextLength: 200000,
          inputPricePerMillion: 10,
          outputPricePerMillion: 30,
          reasoningPricePerMillion: 20,
          inputModalities: ["text"],
          outputModalities: ["text"],
          providerId: "openai",
          isFree: false,
          supportsTools: true,
        },
      ];
      vi.mocked(getCache).mockResolvedValueOnce(cachedModels);

      const { calculateCostWithMargin } = await import("./models");
      // 1000 input = 0.01, 1000 output = 0.03, 1000 reasoning = 0.02
      // Total = 0.06
      const cost = await calculateCostWithMargin("openai/o1", 1000, 1000, 1000);

      expect(cost).toBeCloseTo(0.06, 4);
    });
  });

  describe("CURATED_MODEL_IDS", () => {
    it("should include expected models", async () => {
      const { CURATED_MODEL_IDS } = await import("./models");

      expect(CURATED_MODEL_IDS).toContain("anthropic/claude-sonnet-4");
      expect(CURATED_MODEL_IDS).toContain("anthropic/claude-opus-4");
      expect(CURATED_MODEL_IDS).toContain("openai/gpt-4o");
      expect(CURATED_MODEL_IDS).toContain("google/gemini-2.0-flash-001");
    });

    it("should include free models", async () => {
      const { CURATED_MODEL_IDS } = await import("./models");

      // Check for at least some free models (ending with :free)
      const freeModels = CURATED_MODEL_IDS.filter((id: string) => id.endsWith(":free"));
      expect(freeModels.length).toBeGreaterThan(0);
    });

    it("should include comprehensive providers", async () => {
      const { CURATED_MODEL_IDS } = await import("./models");

      // Check for models from various providers
      expect(CURATED_MODEL_IDS.some((id: string) => id.startsWith("anthropic/"))).toBe(true);
      expect(CURATED_MODEL_IDS.some((id: string) => id.startsWith("openai/"))).toBe(true);
      expect(CURATED_MODEL_IDS.some((id: string) => id.startsWith("google/"))).toBe(true);
      expect(CURATED_MODEL_IDS.some((id: string) => id.startsWith("meta-llama/"))).toBe(true);
      expect(CURATED_MODEL_IDS.some((id: string) => id.startsWith("mistralai/"))).toBe(true);
      expect(CURATED_MODEL_IDS.some((id: string) => id.startsWith("deepseek/"))).toBe(true);
      expect(CURATED_MODEL_IDS.some((id: string) => id.startsWith("cohere/"))).toBe(true);
      expect(CURATED_MODEL_IDS.some((id: string) => id.startsWith("x-ai/"))).toBe(true);
      expect(CURATED_MODEL_IDS.some((id: string) => id.startsWith("perplexity/"))).toBe(true);
    });
  });

  describe("MODEL_PROVIDERS", () => {
    it("should include all well-known providers", async () => {
      const { MODEL_PROVIDERS } = await import("./models");

      expect(MODEL_PROVIDERS.anthropic).toEqual({ id: "anthropic", name: "Anthropic" });
      expect(MODEL_PROVIDERS.openai).toEqual({ id: "openai", name: "OpenAI" });
      expect(MODEL_PROVIDERS.google).toEqual({ id: "google", name: "Google" });
      expect(MODEL_PROVIDERS.meta).toEqual({ id: "meta-llama", name: "Meta" });
      expect(MODEL_PROVIDERS.mistral).toEqual({ id: "mistralai", name: "Mistral" });
      expect(MODEL_PROVIDERS.deepseek).toEqual({ id: "deepseek", name: "DeepSeek" });
      expect(MODEL_PROVIDERS.cohere).toEqual({ id: "cohere", name: "Cohere" });
      expect(MODEL_PROVIDERS.xai).toEqual({ id: "x-ai", name: "xAI" });
      expect(MODEL_PROVIDERS.perplexity).toEqual({ id: "perplexity", name: "Perplexity" });
    });
  });

  describe("refreshModelsCache", () => {
    it("should fetch fresh models and update cache", async () => {
      const { getCache, setCache } = await import("@/lib/redis");
      vi.mocked(getCache).mockResolvedValue(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "anthropic/claude-sonnet-4",
                name: "Claude Sonnet 4",
                description: "Refreshed model",
                context_length: 200000,
                pricing: {
                  prompt: "0.000003",
                  completion: "0.000015",
                  request: "0",
                  image: "0",
                  web_search: "0",
                  internal_reasoning: "0",
                  input_cache_read: "0",
                  input_cache_write: "0",
                },
                architecture: {
                  input_modalities: ["text"],
                  output_modalities: ["text"],
                  tokenizer: "claude",
                  instruct_type: null,
                },
                top_provider: {
                  context_length: 200000,
                  max_completion_tokens: 4096,
                  is_moderated: false,
                },
                supported_parameters: ["tools", "tool_choice"],
              },
            ],
          }),
      });

      const { refreshModelsCache } = await import("./models");
      const result = await refreshModelsCache();

      expect(result.length).toBeGreaterThan(0);
      expect(setCache).toHaveBeenCalled();
    });
  });

  describe("free model detection", () => {
    it("should mark models ending with :free as free", async () => {
      const { getCache } = await import("@/lib/redis");
      vi.mocked(getCache).mockResolvedValueOnce(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "meta-llama/llama-3.3-70b-instruct:free",
                name: "Llama 3.3 70B Free",
                description: "Free Llama model",
                context_length: 128000,
                pricing: {
                  prompt: "0",
                  completion: "0",
                  request: "0",
                  image: "0",
                  web_search: "0",
                  internal_reasoning: "0",
                  input_cache_read: "0",
                  input_cache_write: "0",
                },
                architecture: {
                  input_modalities: ["text"],
                  output_modalities: ["text"],
                  tokenizer: "llama",
                  instruct_type: "llama",
                },
                top_provider: {
                  context_length: 128000,
                  max_completion_tokens: 4096,
                  is_moderated: false,
                },
                supported_parameters: ["tools"],
              },
            ],
          }),
      });

      const { getModelsWithPricing } = await import("./models");
      const result = await getModelsWithPricing();

      const freeModel = result.find((m) => m.id === "meta-llama/llama-3.3-70b-instruct:free");
      expect(freeModel).toBeDefined();
      expect(freeModel?.isFree).toBe(true);
      expect(freeModel?.inputPricePerMillion).toBe(0);
      expect(freeModel?.outputPricePerMillion).toBe(0);
    });

    it("should mark models with zero pricing as free", async () => {
      const { getCache } = await import("@/lib/redis");
      vi.mocked(getCache).mockResolvedValueOnce(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "anthropic/claude-sonnet-4",
                name: "Claude Sonnet 4 Free Trial",
                description: "Zero priced model",
                context_length: 200000,
                pricing: {
                  prompt: "0",
                  completion: "0",
                  request: "0",
                  image: "0",
                  web_search: "0",
                  internal_reasoning: "0",
                  input_cache_read: "0",
                  input_cache_write: "0",
                },
                architecture: {
                  input_modalities: ["text"],
                  output_modalities: ["text"],
                  tokenizer: "claude",
                  instruct_type: null,
                },
                top_provider: {
                  context_length: 200000,
                  max_completion_tokens: 4096,
                  is_moderated: false,
                },
                supported_parameters: ["tools"],
              },
            ],
          }),
      });

      const { getModelsWithPricing } = await import("./models");
      const result = await getModelsWithPricing();

      const freeModel = result.find((m) => m.id === "anthropic/claude-sonnet-4");
      expect(freeModel?.isFree).toBe(true);
    });

    it("should exclude free models from unreliable providers (google, deepseek) from tools support", async () => {
      const { getCache } = await import("@/lib/redis");
      vi.mocked(getCache).mockResolvedValueOnce(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "google/gemini-2.0-flash-exp:free",
                name: "Gemini Free",
                description: "Google free model",
                context_length: 1000000,
                pricing: {
                  prompt: "0",
                  completion: "0",
                  request: "0",
                  image: "0",
                  web_search: "0",
                  internal_reasoning: "0",
                  input_cache_read: "0",
                  input_cache_write: "0",
                },
                architecture: {
                  input_modalities: ["text"],
                  output_modalities: ["text"],
                  tokenizer: "gemini",
                  instruct_type: null,
                },
                top_provider: {
                  context_length: 1000000,
                  max_completion_tokens: 8192,
                  is_moderated: false,
                },
                supported_parameters: ["tools"],
              },
              {
                id: "deepseek/deepseek-r1:free",
                name: "DeepSeek R1 Free",
                description: "DeepSeek free model",
                context_length: 64000,
                pricing: {
                  prompt: "0",
                  completion: "0",
                  request: "0",
                  image: "0",
                  web_search: "0",
                  internal_reasoning: "0",
                  input_cache_read: "0",
                  input_cache_write: "0",
                },
                architecture: {
                  input_modalities: ["text"],
                  output_modalities: ["text"],
                  tokenizer: "deepseek",
                  instruct_type: null,
                },
                top_provider: {
                  context_length: 64000,
                  max_completion_tokens: 4096,
                  is_moderated: false,
                },
                supported_parameters: ["tools"],
              },
            ],
          }),
      });

      const { getModelsWithPricing } = await import("./models");
      const result = await getModelsWithPricing();

      // Both Google and DeepSeek free models should be excluded due to unreliable tools
      expect(result.find((m) => m.id === "google/gemini-2.0-flash-exp:free")).toBeUndefined();
      expect(result.find((m) => m.id === "deepseek/deepseek-r1:free")).toBeUndefined();
    });

    it("should include free models from reliable providers (meta)", async () => {
      const { getCache } = await import("@/lib/redis");
      vi.mocked(getCache).mockResolvedValueOnce(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "meta-llama/llama-3.3-70b-instruct:free",
                name: "Llama Free",
                description: "Meta free model",
                context_length: 128000,
                pricing: {
                  prompt: "0",
                  completion: "0",
                  request: "0",
                  image: "0",
                  web_search: "0",
                  internal_reasoning: "0",
                  input_cache_read: "0",
                  input_cache_write: "0",
                },
                architecture: {
                  input_modalities: ["text"],
                  output_modalities: ["text"],
                  tokenizer: "llama",
                  instruct_type: "llama",
                },
                top_provider: {
                  context_length: 128000,
                  max_completion_tokens: 4096,
                  is_moderated: false,
                },
                supported_parameters: ["tools"],
              },
            ],
          }),
      });

      const { getModelsWithPricing } = await import("./models");
      const result = await getModelsWithPricing();

      const metaFree = result.find((m) => m.id === "meta-llama/llama-3.3-70b-instruct:free");
      expect(metaFree).toBeDefined();
      expect(metaFree?.supportsTools).toBe(true);
    });
  });

  describe("model transformation edge cases", () => {
    it("should handle missing architecture modalities", async () => {
      const { getCache } = await import("@/lib/redis");
      vi.mocked(getCache).mockResolvedValueOnce(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "anthropic/claude-sonnet-4",
                name: "Claude Sonnet 4",
                description: "Model with missing modalities",
                context_length: 200000,
                pricing: {
                  prompt: "0.000003",
                  completion: "0.000015",
                  request: "0",
                  image: "0",
                  web_search: "0",
                  internal_reasoning: "0",
                  input_cache_read: "0",
                  input_cache_write: "0",
                },
                architecture: {
                  tokenizer: "claude",
                  instruct_type: null,
                  // Missing input_modalities and output_modalities
                },
                top_provider: {
                  context_length: 200000,
                  max_completion_tokens: 4096,
                  is_moderated: false,
                },
                supported_parameters: ["tools"],
              },
            ],
          }),
      });

      const { getModelsWithPricing } = await import("./models");
      const result = await getModelsWithPricing();

      const model = result.find((m) => m.id === "anthropic/claude-sonnet-4");
      expect(model?.inputModalities).toEqual(["text"]);
      expect(model?.outputModalities).toEqual(["text"]);
    });

    it("should filter out models without tools support", async () => {
      const { getCache } = await import("@/lib/redis");
      vi.mocked(getCache).mockResolvedValueOnce(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "anthropic/claude-sonnet-4",
                name: "Claude without tools",
                description: "Model without tools",
                context_length: 200000,
                pricing: {
                  prompt: "0.000003",
                  completion: "0.000015",
                  request: "0",
                  image: "0",
                  web_search: "0",
                  internal_reasoning: "0",
                  input_cache_read: "0",
                  input_cache_write: "0",
                },
                architecture: {
                  input_modalities: ["text"],
                  output_modalities: ["text"],
                  tokenizer: "claude",
                  instruct_type: null,
                },
                top_provider: {
                  context_length: 200000,
                  max_completion_tokens: 4096,
                  is_moderated: false,
                },
                supported_parameters: ["temperature"], // No tools support
              },
            ],
          }),
      });

      const { getModelsWithPricing } = await import("./models");
      const result = await getModelsWithPricing();

      expect(result.find((m) => m.id === "anthropic/claude-sonnet-4")).toBeUndefined();
    });

    it("should handle undefined supported_parameters", async () => {
      const { getCache } = await import("@/lib/redis");
      vi.mocked(getCache).mockResolvedValueOnce(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "anthropic/claude-sonnet-4",
                name: "Claude no params",
                description: "Model without supported_parameters",
                context_length: 200000,
                pricing: {
                  prompt: "0.000003",
                  completion: "0.000015",
                  request: "0",
                  image: "0",
                  web_search: "0",
                  internal_reasoning: "0",
                  input_cache_read: "0",
                  input_cache_write: "0",
                },
                architecture: {
                  input_modalities: ["text"],
                  output_modalities: ["text"],
                  tokenizer: "claude",
                  instruct_type: null,
                },
                top_provider: {
                  context_length: 200000,
                  max_completion_tokens: 4096,
                  is_moderated: false,
                },
                // No supported_parameters field
              },
            ],
          }),
      });

      const { getModelsWithPricing } = await import("./models");
      const result = await getModelsWithPricing();

      // Model should be filtered out because it doesn't support tools
      expect(result.find((m) => m.id === "anthropic/claude-sonnet-4")).toBeUndefined();
    });

    it("should sort models by curated order", async () => {
      const { getCache } = await import("@/lib/redis");
      vi.mocked(getCache).mockResolvedValueOnce(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              {
                id: "openai/gpt-4o",
                name: "GPT-4o",
                description: "OpenAI model",
                context_length: 128000,
                pricing: {
                  prompt: "0.000005",
                  completion: "0.000015",
                  request: "0",
                  image: "0",
                  web_search: "0",
                  internal_reasoning: "0",
                  input_cache_read: "0",
                  input_cache_write: "0",
                },
                architecture: {
                  input_modalities: ["text", "image"],
                  output_modalities: ["text"],
                  tokenizer: "openai",
                  instruct_type: null,
                },
                top_provider: {
                  context_length: 128000,
                  max_completion_tokens: 4096,
                  is_moderated: false,
                },
                supported_parameters: ["tools"],
              },
              {
                id: "anthropic/claude-opus-4",
                name: "Claude Opus 4",
                description: "Anthropic Opus",
                context_length: 200000,
                pricing: {
                  prompt: "0.000015",
                  completion: "0.000075",
                  request: "0",
                  image: "0",
                  web_search: "0",
                  internal_reasoning: "0",
                  input_cache_read: "0",
                  input_cache_write: "0",
                },
                architecture: {
                  input_modalities: ["text"],
                  output_modalities: ["text"],
                  tokenizer: "claude",
                  instruct_type: null,
                },
                top_provider: {
                  context_length: 200000,
                  max_completion_tokens: 4096,
                  is_moderated: false,
                },
                supported_parameters: ["tools"],
              },
            ],
          }),
      });

      const { getModelsWithPricing, CURATED_MODEL_IDS } = await import("./models");
      const result = await getModelsWithPricing();

      // Claude Opus 4 should come before GPT-4o in curated list
      const opusIndex = CURATED_MODEL_IDS.indexOf("anthropic/claude-opus-4");
      const gptIndex = CURATED_MODEL_IDS.indexOf("openai/gpt-4o");
      expect(opusIndex).toBeLessThan(gptIndex);

      // Result should be sorted accordingly
      const resultOpusIndex = result.findIndex((m) => m.id === "anthropic/claude-opus-4");
      const resultGptIndex = result.findIndex((m) => m.id === "openai/gpt-4o");
      expect(resultOpusIndex).toBeLessThan(resultGptIndex);
    });
  });

  describe("isFreeModel", () => {
    it("should return true for models with :free suffix", async () => {
      const { isFreeModel } = await import("./models");
      expect(isFreeModel("meta-llama/llama-3.3-70b-instruct:free")).toBe(true);
      expect(isFreeModel("deepseek/deepseek-r1:free")).toBe(true);
      expect(isFreeModel("google/gemini-2.0-flash-exp:free")).toBe(true);
    });

    it("should return false for paid models", async () => {
      const { isFreeModel } = await import("./models");
      expect(isFreeModel("anthropic/claude-sonnet-4")).toBe(false);
      expect(isFreeModel("openai/gpt-4o")).toBe(false);
      expect(isFreeModel("google/gemini-2.5-pro")).toBe(false);
    });

    it("should return true for known free models in curated list", async () => {
      const { isFreeModel, CURATED_MODEL_IDS } = await import("./models");
      const freeModels = CURATED_MODEL_IDS.filter((id: string) => id.endsWith(":free"));
      
      for (const modelId of freeModels) {
        expect(isFreeModel(modelId)).toBe(true);
      }
    });
  });
});
