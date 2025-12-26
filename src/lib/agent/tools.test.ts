/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("agent tools", () => {
  const originalEnv = process.env.TAVILY_API_KEY;

  beforeEach(() => {
    vi.resetModules();
    process.env.TAVILY_API_KEY = "test-tavily-key";
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env.TAVILY_API_KEY = originalEnv;
  });

  describe("webSearch tool", () => {
    it("should have correct description", async () => {
      const { webSearch } = await import("./tools");
      expect(webSearch.description).toBe(
        "Search the web for current information. Use this when you need up-to-date information or facts."
      );
    });

    it("should execute search and return results", async () => {
      const mockResponse = {
        query: "test query",
        results: [
          {
            title: "Test Result",
            url: "https://example.com",
            content: "Test content",
            score: 0.9,
          },
        ],
        answer: "Test answer",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { webSearch } = await import("./tools");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing execute method that may be undefined
      const result = await (webSearch.execute as any)({ query: "test query" }, { toolCallId: "test-id" });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: "test-tavily-key",
          query: "test query",
          max_results: 5,
          include_answer: true,
        }),
      });
    });

    it("should throw error when API key is not set", async () => {
      delete process.env.TAVILY_API_KEY;
      vi.resetModules();
      const { webSearch } = await import("./tools");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing execute method that may be undefined
      await expect((webSearch.execute as any)({ query: "test" }, { toolCallId: "test-id" })).rejects.toThrow(
        "TAVILY_API_KEY environment variable is not set"
      );
    });

    it("should throw error when API returns error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const { webSearch } = await import("./tools");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing execute method that may be undefined
      await expect((webSearch.execute as any)({ query: "test" }, { toolCallId: "test-id" })).rejects.toThrow(
        "Tavily API error: 500 Internal Server Error"
      );
    });

    it("should throw error for 401 unauthorized", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const { webSearch } = await import("./tools");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing execute method that may be undefined
      await expect((webSearch.execute as any)({ query: "test" }, { toolCallId: "test-id" })).rejects.toThrow(
        "Tavily API error: 401 Unauthorized"
      );
    });
  });

  describe("allTools", () => {
    it("should export webSearch tool", async () => {
      const { allTools } = await import("./tools");
      expect(allTools).toHaveProperty("webSearch");
    });
  });
});
