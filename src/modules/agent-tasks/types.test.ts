/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
    calculateRunCost,
    formatCost,
    formatDuration,
    getStatusColor,
    getStatusLabel,
} from "./types";

describe("agent-tasks types", () => {
  describe("getStatusColor", () => {
    it("should return yellow for queued status", () => {
      expect(getStatusColor("queued")).toBe("bg-yellow-500");
    });

    it("should return blue for running status", () => {
      expect(getStatusColor("running")).toBe("bg-blue-500");
    });

    it("should return green for completed status", () => {
      expect(getStatusColor("completed")).toBe("bg-green-500");
    });

    it("should return red for failed status", () => {
      expect(getStatusColor("failed")).toBe("bg-red-500");
    });
  });

  describe("getStatusLabel", () => {
    it("should return Queued for queued status", () => {
      expect(getStatusLabel("queued")).toBe("Queued");
    });

    it("should return Running for running status", () => {
      expect(getStatusLabel("running")).toBe("Running");
    });

    it("should return Completed for completed status", () => {
      expect(getStatusLabel("completed")).toBe("Completed");
    });

    it("should return Failed for failed status", () => {
      expect(getStatusLabel("failed")).toBe("Failed");
    });
  });

  describe("formatCost", () => {
    it("should format small costs with 4 decimal places", () => {
      expect(formatCost(0.0001)).toBe("$0.0001");
    });

    it("should format costs at 0.01 threshold with 2 decimal places", () => {
      expect(formatCost(0.01)).toBe("$0.01");
    });

    it("should format larger costs with 2 decimal places", () => {
      expect(formatCost(1.5)).toBe("$1.50");
    });

    it("should handle zero cost", () => {
      expect(formatCost(0)).toBe("$0.0000");
    });

    it("should format costs just below 0.01", () => {
      expect(formatCost(0.009)).toBe("$0.0090");
    });
  });

  describe("calculateRunCost", () => {
    it("should calculate cost for a run with known model", () => {
      const run = {
        id: "run-1",
        userId: "user-1",
        prompt: "Hello",
        systemPrompt: null,
        model: "anthropic/claude-sonnet-4",
        status: "completed" as const,
        result: "Hi there!",
        error: null,
        inputTokens: 1000,
        outputTokens: 500,
        createdAt: new Date(),
        completedAt: new Date(),
      };

      // input: 1000 * 0.003 / 1000 = 0.003
      // output: 500 * 0.015 / 1000 = 0.0075
      // total: 0.0105
      const cost = calculateRunCost(run);
      expect(cost).toBeCloseTo(0.0105);
    });

    it("should calculate cost for a run with unknown model using defaults", () => {
      const run = {
        id: "run-1",
        userId: "user-1",
        prompt: "Hello",
        systemPrompt: null,
        model: "unknown/model",
        status: "completed" as const,
        result: "Hi there!",
        error: null,
        inputTokens: 1000,
        outputTokens: 500,
        createdAt: new Date(),
        completedAt: new Date(),
      };

      // default: input: 0.001, output: 0.002
      // input: 1000 * 0.001 / 1000 = 0.001
      // output: 500 * 0.002 / 1000 = 0.001
      // total: 0.002
      const cost = calculateRunCost(run);
      expect(cost).toBeCloseTo(0.002);
    });
  });

  describe("formatDuration", () => {
    it("should return dash when endDate is null", () => {
      expect(formatDuration(new Date(), null)).toBe("—");
    });

    it("should format duration in seconds for short durations", () => {
      const start = new Date();
      const end = new Date(start.getTime() + 30 * 1000);
      expect(formatDuration(start, end)).toBe("30s");
    });

    it("should format duration in minutes and seconds", () => {
      const start = new Date();
      const end = new Date(start.getTime() + 90 * 1000);
      expect(formatDuration(start, end)).toBe("1m 30s");
    });

    it("should format duration at exactly 60 seconds", () => {
      const start = new Date();
      const end = new Date(start.getTime() + 60 * 1000);
      expect(formatDuration(start, end)).toBe("1m 0s");
    });

    it("should handle zero duration", () => {
      const start = new Date();
      expect(formatDuration(start, start)).toBe("0s");
    });

    it("should handle longer durations", () => {
      const start = new Date();
      const end = new Date(start.getTime() + 5 * 60 * 1000 + 45 * 1000);
      expect(formatDuration(start, end)).toBe("5m 45s");
    });
  });
});
