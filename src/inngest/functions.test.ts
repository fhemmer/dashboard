/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the agent module
const mockRunAgent = vi.fn();
vi.mock("@/lib/agent", () => ({
  runAgent: mockRunAgent,
}));

// Mock supabaseAdmin
const mockUpdate = vi.fn().mockReturnThis();
const mockEq = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn(() => ({
  update: mockUpdate,
}));
mockUpdate.mockReturnValue({ eq: mockEq });

vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: mockFrom,
  },
}));

// Mock Inngest as a class
let capturedHandler: ((params: { event: unknown; step: unknown }) => Promise<unknown>) | undefined;

vi.mock("inngest", () => ({
  Inngest: class MockInngest {
    id: string;
    name: string;

    constructor(config: { id: string; name: string }) {
      this.id = config.id;
      this.name = config.name;
    }

    createFunction = vi.fn(
      (
        _config: unknown,
        _trigger: unknown,
        handler: (params: { event: unknown; step: unknown }) => Promise<unknown>
      ) => {
        capturedHandler = handler;
        return { handler };
      }
    );

    send = vi.fn();
  },
}));

describe("inngest functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunAgent.mockReset();
    mockFrom.mockClear();
    mockUpdate.mockClear();
    mockEq.mockClear();
    capturedHandler = undefined;
  });

  describe("agentRun function", () => {
    it("should be created with correct configuration", async () => {
      const { inngest } = await import("./client");
      await import("./functions");

      expect(inngest.createFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "agent-run",
          retries: 3,
        }),
        { event: "agent/run" },
        expect.any(Function)
      );
    });

    it("should execute the agent run workflow", async () => {
      vi.resetModules();

      // Re-import to get fresh modules
      await import("./functions");

      // Create mock step functions that execute their callbacks
      const mockStepRun = vi.fn().mockImplementation(async (_name: string, fn: () => Promise<unknown>) => {
        return fn();
      });

      mockRunAgent.mockResolvedValue({
        text: "Agent response",
        usage: { promptTokens: 100, completionTokens: 50 },
        finishReason: "stop",
        steps: 1,
      });

      const event = {
        data: {
          taskId: "task-123",
          prompt: "Hello world",
          model: "openai/gpt-4o",
          userId: "user-123",
          systemPrompt: "Be helpful",
        },
      };

      const step = { run: mockStepRun };

      expect(capturedHandler).toBeDefined();
      const result = await capturedHandler!({ event, step });

      expect(result).toEqual({ success: true, text: "Agent response" });
      expect(mockStepRun).toHaveBeenCalledTimes(3);
      expect(mockStepRun).toHaveBeenCalledWith("update-status-running", expect.any(Function));
      expect(mockStepRun).toHaveBeenCalledWith("execute-agent", expect.any(Function));
      expect(mockStepRun).toHaveBeenCalledWith("save-results", expect.any(Function));
    });

    it("should handle agent run without usage data", async () => {
      vi.resetModules();
      await import("./functions");

      const mockStepRun = vi.fn().mockImplementation(async (_name: string, fn: () => Promise<unknown>) => {
        return fn();
      });

      mockRunAgent.mockResolvedValue({
        text: "Agent response",
        finishReason: "stop",
        steps: 1,
      });

      const event = {
        data: {
          taskId: "task-123",
          prompt: "Test",
          userId: "user-123",
        },
      };

      expect(capturedHandler).toBeDefined();
      const result = await capturedHandler!({ event, step: { run: mockStepRun } });

      expect(result).toEqual({ success: true, text: "Agent response" });
    });
  });

  describe("allFunctions", () => {
    it("should export all functions array", async () => {
      const { allFunctions } = await import("./functions");
      expect(Array.isArray(allFunctions)).toBe(true);
      expect(allFunctions).toHaveLength(1);
    });
  });
});
