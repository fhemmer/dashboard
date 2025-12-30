/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the AI SDK
vi.mock("ai", () => ({
  generateText: vi.fn(),
  stepCountIs: vi.fn((n) => ({ type: "stepCount", count: n })),
}));

// Mock the client module
const mockChatModel = vi.fn((model) => ({ model }));
vi.mock("./client", () => ({
  getOpenRouter: vi.fn(() => ({ chat: mockChatModel })),
  DEFAULT_MODEL: "anthropic/claude-sonnet-4",
}));

// Mock the tools module
vi.mock("./tools", () => ({
  allTools: { webSearch: { name: "webSearch" } },
}));

import { generateText } from "ai";

describe("agent runner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("runAgent", () => {
    it("should run agent with default options", async () => {
      const mockResult = {
        text: "Hello, I'm the AI assistant!",
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        },
        finishReason: "stop",
        steps: [{ stepType: "initial" }],
      };

      vi.mocked(generateText).mockResolvedValueOnce(mockResult as never);

      const { runAgent } = await import("./agent");
      const result = await runAgent({ prompt: "Hello" });

      expect(result).toEqual({
        text: "Hello, I'm the AI assistant!",
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
        finishReason: "stop",
        steps: 1,
      });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: "Hello",
        })
      );
    });

    it("should use custom model when provided", async () => {
      const mockResult = {
        text: "Response",
        usage: { inputTokens: 50, outputTokens: 25, totalTokens: 75 },
        finishReason: "stop",
        steps: [],
      };

      vi.mocked(generateText).mockResolvedValueOnce(mockResult as never);

      const { runAgent } = await import("./agent");
      await runAgent({ prompt: "Test", model: "openai/gpt-4o" });

      expect(mockChatModel).toHaveBeenCalledWith("openai/gpt-4o");
    });

    it("should use custom system prompt when provided", async () => {
      const mockResult = {
        text: "Response",
        usage: { inputTokens: 50, outputTokens: 25, totalTokens: 75 },
        finishReason: "stop",
        steps: [],
      };

      vi.mocked(generateText).mockResolvedValueOnce(mockResult as never);

      const { runAgent } = await import("./agent");
      await runAgent({
        prompt: "Test",
        systemPrompt: "You are a pirate.",
      });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          system: "You are a pirate.",
        })
      );
    });

    it("should use custom maxSteps when provided", async () => {
      const mockResult = {
        text: "Response",
        usage: { inputTokens: 50, outputTokens: 25, totalTokens: 75 },
        finishReason: "stop",
        steps: [],
      };

      vi.mocked(generateText).mockResolvedValueOnce(mockResult as never);

      const { runAgent } = await import("./agent");
      await runAgent({ prompt: "Test", maxSteps: 5 });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          stopWhen: { type: "stepCount", count: 5 },
        })
      );
    });

    it("should handle response without usage data", async () => {
      const mockResult = {
        text: "Response",
        finishReason: "stop",
        steps: [{ stepType: "tool" }, { stepType: "initial" }],
      };

      vi.mocked(generateText).mockResolvedValueOnce(mockResult as never);

      const { runAgent } = await import("./agent");
      const result = await runAgent({ prompt: "Test" });

      expect(result.usage).toBeUndefined();
      expect(result.steps).toBe(2);
    });

    it("should handle response with no steps", async () => {
      const mockResult = {
        text: "Response",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
        finishReason: "length",
      };

      vi.mocked(generateText).mockResolvedValueOnce(mockResult as never);

      const { runAgent } = await import("./agent");
      const result = await runAgent({ prompt: "Test" });

      expect(result.steps).toBe(1);
    });

    it("should handle undefined token values in usage", async () => {
      const mockResult = {
        text: "Response",
        usage: {},
        finishReason: "stop",
        steps: [],
      };

      vi.mocked(generateText).mockResolvedValueOnce(mockResult as never);

      const { runAgent } = await import("./agent");
      const result = await runAgent({ prompt: "Test" });

      expect(result.usage).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      });
    });

    it("should use default model when none provided", async () => {
      const mockResult = {
        text: "Response",
        usage: { inputTokens: 50, outputTokens: 25, totalTokens: 75 },
        finishReason: "stop",
        steps: [],
      };

      vi.mocked(generateText).mockResolvedValueOnce(mockResult as never);

      const { runAgent } = await import("./agent");
      await runAgent({ prompt: "Test" });

      expect(mockChatModel).toHaveBeenCalledWith("anthropic/claude-sonnet-4");
    });

    it("should use default maxSteps of 10 when none provided", async () => {
      const mockResult = {
        text: "Response",
        usage: { inputTokens: 50, outputTokens: 25, totalTokens: 75 },
        finishReason: "stop",
        steps: [],
      };

      vi.mocked(generateText).mockResolvedValueOnce(mockResult as never);

      const { runAgent } = await import("./agent");
      await runAgent({ prompt: "Test" });

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          stopWhen: { type: "stepCount", count: 10 },
        })
      );
    });

    it("should extract tool results when model returns empty text", async () => {
      const mockResult = {
        text: "",
        usage: { inputTokens: 50, outputTokens: 25, totalTokens: 75 },
        finishReason: "stop",
        steps: [
          {
            toolResults: [
              {
                result: {
                  query: "weather in London",
                  answer: "It is currently 15°C and cloudy in London.",
                  results: [],
                },
              },
            ],
          },
        ],
      };

      vi.mocked(generateText).mockResolvedValueOnce(mockResult as never);

      const { runAgent } = await import("./agent");
      const result = await runAgent({ prompt: "What's the weather in London?" });

      expect(result.text).toBe("It is currently 15°C and cloudy in London.");
    });

    it("should build summary from search results when no answer available", async () => {
      const mockResult = {
        text: "",
        usage: { inputTokens: 50, outputTokens: 25, totalTokens: 75 },
        finishReason: "stop",
        steps: [
          {
            toolResults: [
              {
                result: {
                  query: "weather in London",
                  results: [
                    {
                      title: "London Weather",
                      url: "https://weather.com",
                      content: "The current temperature in London is 15 degrees Celsius with cloudy skies expected throughout the day.",
                      score: 0.9,
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      vi.mocked(generateText).mockResolvedValueOnce(mockResult as never);

      const { runAgent } = await import("./agent");
      const result = await runAgent({ prompt: "What's the weather in London?" });

      expect(result.text).toContain("Here's what I found:");
      expect(result.text).toContain("London Weather");
    });

    it("should return fallback message when no text and no tool results", async () => {
      const mockResult = {
        text: "",
        usage: { inputTokens: 50, outputTokens: 25, totalTokens: 75 },
        finishReason: "stop",
        steps: [],
      };

      vi.mocked(generateText).mockResolvedValueOnce(mockResult as never);

      const { runAgent } = await import("./agent");
      const result = await runAgent({ prompt: "Test" });

      expect(result.text).toBe("I processed your request but couldn't generate a response. Please try again.");
    });

    it("should return fallback when tool results have empty results array", async () => {
      const mockResult = {
        text: "",
        usage: { inputTokens: 50, outputTokens: 25, totalTokens: 75 },
        finishReason: "stop",
        steps: [
          {
            toolResults: [
              {
                result: {
                  query: "test",
                  results: [],
                },
              },
            ],
          },
        ],
      };

      vi.mocked(generateText).mockResolvedValueOnce(mockResult as never);

      const { runAgent } = await import("./agent");
      const result = await runAgent({ prompt: "Test" });

      expect(result.text).toBe("I processed your request but couldn't generate a response. Please try again.");
    });

    it("should return fallback when tool results have no extractable content", async () => {
      const mockResult = {
        text: "",
        usage: { inputTokens: 50, outputTokens: 25, totalTokens: 75 },
        finishReason: "stop",
        steps: [
          {
            toolResults: [
              {
                result: undefined,
              },
            ],
          },
        ],
      };

      vi.mocked(generateText).mockResolvedValueOnce(mockResult as never);

      const { runAgent } = await import("./agent");
      const result = await runAgent({ prompt: "Test" });

      expect(result.text).toBe("I processed your request but couldn't generate a response. Please try again.");
    });

    it("should handle steps with empty toolResults array", async () => {
      const mockResult = {
        text: "",
        usage: { inputTokens: 50, outputTokens: 25, totalTokens: 75 },
        finishReason: "stop",
        steps: [
          {
            toolResults: [],
          },
        ],
      };

      vi.mocked(generateText).mockResolvedValueOnce(mockResult as never);

      const { runAgent } = await import("./agent");
      const result = await runAgent({ prompt: "Test" });

      expect(result.text).toBe("I processed your request but couldn't generate a response. Please try again.");
    });
  });
});
