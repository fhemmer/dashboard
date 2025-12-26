import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAgentRun,
  getAgentRuns,
  getAgentTasksSummary,
  queueAgentRun,
} from "./actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}));

// Define as hoisted mock factory
const mockInngestSend = vi.hoisted(() => vi.fn());
vi.mock("@/inngest", () => ({
  inngest: {
    send: mockInngestSend,
  },
}));

describe("agent-tasks actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });
    mockInngestSend.mockResolvedValue({ ids: ["event-1"] });
  });

  describe("getAgentRuns", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await getAgentRuns();
      expect(result).toEqual({ runs: [], error: "Not authenticated" });
    });

    it("returns runs for authenticated user", async () => {
      const mockData = [
        {
          id: "run-1",
          user_id: "user-123",
          prompt: "Hello AI",
          system_prompt: "Be helpful",
          model: "gpt-4",
          status: "completed",
          result: "Hi there!",
          error: null,
          input_tokens: 10,
          output_tokens: 20,
          created_at: "2024-01-01T00:00:00Z",
          completed_at: "2024-01-01T00:01:00Z",
        },
      ];

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getAgentRuns();

      expect(result.error).toBeUndefined();
      expect(result.runs).toHaveLength(1);
      expect(result.runs[0].prompt).toBe("Hello AI");
      expect(result.runs[0].status).toBe("completed");
      expect(result.runs[0].inputTokens).toBe(10);
    });

    it("returns error on database failure", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getAgentRuns();

      expect(result.error).toBe("Database error");
      expect(result.runs).toEqual([]);
    });

    it("handles null data", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getAgentRuns();

      expect(result.runs).toEqual([]);
    });

    it("handles null token values", async () => {
      const mockData = [
        {
          id: "run-1",
          user_id: "user-123",
          prompt: "Test",
          system_prompt: null,
          model: "gpt-4",
          status: "running",
          result: null,
          error: null,
          input_tokens: null,
          output_tokens: null,
          created_at: "2024-01-01T00:00:00Z",
          completed_at: null,
        },
      ];

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getAgentRuns();

      expect(result.runs[0].inputTokens).toBe(0);
      expect(result.runs[0].outputTokens).toBe(0);
      expect(result.runs[0].completedAt).toBeNull();
    });
  });

  describe("getAgentRun", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await getAgentRun("run-1");
      expect(result).toEqual({ run: null, error: "Not authenticated" });
    });

    it("returns single run", async () => {
      const mockData = {
        id: "run-1",
        user_id: "user-123",
        prompt: "Hello",
        system_prompt: null,
        model: "gpt-4",
        status: "completed",
        result: "Hi!",
        error: null,
        input_tokens: 5,
        output_tokens: 10,
        created_at: "2024-01-01T00:00:00Z",
        completed_at: "2024-01-01T00:01:00Z",
      };

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getAgentRun("run-1");

      expect(result.error).toBeUndefined();
      expect(result.run).toBeDefined();
      expect(result.run?.prompt).toBe("Hello");
    });

    it("returns not found error for PGRST116", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "Not found" },
        }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getAgentRun("run-1");

      expect(result.run).toBeNull();
      expect(result.error).toBe("Agent run not found");
    });

    it("returns error on database failure", async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "OTHER", message: "DB error" },
        }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await getAgentRun("run-1");

      expect(result.run).toBeNull();
      expect(result.error).toBe("DB error");
    });
  });

  describe("queueAgentRun", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await queueAgentRun({ prompt: "Test" });
      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });

    it("creates and queues agent run", async () => {
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "new-run" },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(insertChain);

      const result = await queueAgentRun({ prompt: "Hello AI" });

      expect(result.success).toBe(true);
      expect(result.id).toBe("new-run");
      expect(mockInngestSend).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "agent/run",
          data: expect.objectContaining({
            taskId: "new-run",
            prompt: "Hello AI",
            userId: "user-123",
          }),
        })
      );
    });

    it("queues with custom model and system prompt", async () => {
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "new-run" },
          error: null,
        }),
      };
      mockFrom.mockReturnValue(insertChain);

      await queueAgentRun({
        prompt: "Hello",
        model: "gpt-4o",
        systemPrompt: "Be concise",
      });

      expect(insertChain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o",
          system_prompt: "Be concise",
        })
      );
      expect(mockInngestSend).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            model: "gpt-4o",
            systemPrompt: "Be concise",
          }),
        })
      );
    });

    it("returns error on database insert failure", async () => {
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Insert failed" },
        }),
      };
      mockFrom.mockReturnValue(insertChain);

      const result = await queueAgentRun({ prompt: "Test" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Insert failed");
    });

    it("handles Inngest failure and marks task as failed", async () => {
      const insertChain = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "new-run" },
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockFrom.mockReturnValue(insertChain);
      mockInngestSend.mockRejectedValueOnce(new Error("Inngest error"));

      const result = await queueAgentRun({ prompt: "Test" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to queue task");
    });
  });

  describe("getAgentTasksSummary", () => {
    it("returns empty summary when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await getAgentTasksSummary();
      expect(result).toEqual({
        recentRuns: [],
        totalRuns: 0,
        runningCount: 0,
        totalCost: 0,
      });
    });

    it("returns full summary", async () => {
      // Total count chain
      const totalCountChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 10, error: null }),
      };

      // Running count chain
      const runningCountChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ count: 2, error: null }),
      };

      // Recent runs chain
      const recentData = [
        {
          id: "run-1",
          user_id: "user-123",
          prompt: "Test",
          system_prompt: null,
          model: "anthropic/claude-sonnet-4-20250514",
          status: "completed",
          result: "Done",
          error: null,
          input_tokens: 100,
          output_tokens: 50,
          created_at: "2024-01-01T00:00:00Z",
          completed_at: "2024-01-01T00:01:00Z",
        },
      ];
      const recentChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: recentData, error: null }),
      };

      // Cost data chain
      const costData = [
        {
          model: "anthropic/claude-sonnet-4-20250514",
          input_tokens: 100,
          output_tokens: 50,
        },
        {
          model: "openai/gpt-4o",
          input_tokens: 200,
          output_tokens: 100,
        },
      ];
      const costChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      costChain.eq.mockReturnValueOnce(costChain).mockResolvedValueOnce({
        data: costData,
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(totalCountChain)
        .mockReturnValueOnce(runningCountChain)
        .mockReturnValueOnce(recentChain)
        .mockReturnValueOnce(costChain);

      const result = await getAgentTasksSummary();

      expect(result.totalRuns).toBe(10);
      expect(result.runningCount).toBe(2);
      expect(result.recentRuns).toHaveLength(1);
      expect(result.totalCost).toBeGreaterThan(0);
    });

    it("handles null counts", async () => {
      const totalCountChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: null, error: null }),
      };

      const runningCountChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ count: null, error: null }),
      };

      const recentChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error: null }),
      };

      const costChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      costChain.eq.mockReturnValueOnce(costChain).mockResolvedValueOnce({
        data: null,
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(totalCountChain)
        .mockReturnValueOnce(runningCountChain)
        .mockReturnValueOnce(recentChain)
        .mockReturnValueOnce(costChain);

      const result = await getAgentTasksSummary();

      expect(result.totalRuns).toBe(0);
      expect(result.runningCount).toBe(0);
      expect(result.recentRuns).toEqual([]);
      expect(result.totalCost).toBe(0);
    });

    it("calculates cost with null token values", async () => {
      const totalCountChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
      };

      const runningCountChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ count: 0, error: null }),
      };

      const recentChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      const costData = [
        {
          model: "gpt-4",
          input_tokens: null,
          output_tokens: null,
        },
      ];
      const costChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      costChain.eq.mockReturnValueOnce(costChain).mockResolvedValueOnce({
        data: costData,
        error: null,
      });

      mockFrom
        .mockReturnValueOnce(totalCountChain)
        .mockReturnValueOnce(runningCountChain)
        .mockReturnValueOnce(recentChain)
        .mockReturnValueOnce(costChain);

      const result = await getAgentTasksSummary();

      expect(result.totalCost).toBe(0);
    });
  });
});
