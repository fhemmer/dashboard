import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    addMessage,
    archiveConversation,
    createConversation,
    deleteConversation,
    getAvailableModelsWithPricing,
    getChatSummary,
    getConversation,
    getConversations,
    getHiddenModels,
    getUserChatSpending,
    recordMessageCost,
    runAgentAction,
    unarchiveConversation,
    updateConversation,
    updateHiddenModels,
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

const mockExecuteAgent = vi.fn();

vi.mock("@/lib/agent", () => ({
  DEFAULT_MODEL: "test-model",
  runAgent: (...args: unknown[]) => mockExecuteAgent(...args),
}));

const mockGetModelsWithPricing = vi.fn();
const mockCalculateCostWithMargin = vi.fn();

vi.mock("@/lib/openrouter", () => ({
  getModelsWithPricing: () => mockGetModelsWithPricing(),
  calculateCostWithMargin: (...args: unknown[]) => mockCalculateCostWithMargin(...args),
}));

describe("chat actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });
  });

  describe("getHiddenModels", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await getHiddenModels();
      expect(result).toEqual({ hiddenModels: [], error: "Not authenticated" });
    });

    it("returns hidden models for authenticated user", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { hidden_chat_models: ["openai/gpt-4o", "anthropic/claude-3"] },
          error: null,
        }),
      });

      const result = await getHiddenModels();

      expect(result.error).toBeUndefined();
      expect(result.hiddenModels).toEqual(["openai/gpt-4o", "anthropic/claude-3"]);
    });

    it("returns empty array when hidden_chat_models is null", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { hidden_chat_models: null },
          error: null,
        }),
      });

      const result = await getHiddenModels();

      expect(result.hiddenModels).toEqual([]);
    });

    it("returns error on database failure", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      });

      const result = await getHiddenModels();

      expect(result.error).toBe("Database error");
      expect(result.hiddenModels).toEqual([]);
    });
  });

  describe("updateHiddenModels", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await updateHiddenModels(["openai/gpt-4o"]);
      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });

    it("updates hidden models successfully", async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await updateHiddenModels(["openai/gpt-4o", "anthropic/claude-3"]);

      expect(result.success).toBe(true);
    });

    it("returns error on database failure", async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: "Update failed" } }),
      };
      mockFrom.mockReturnValue(chain);

      const result = await updateHiddenModels(["openai/gpt-4o"]);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });
  });

  describe("getConversations", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await getConversations();
      expect(result).toEqual({ conversations: [], error: "Not authenticated" });
    });

    it("returns conversations for authenticated user", async () => {
      const mockData = [
        {
          id: "conv-1",
          user_id: "user-123",
          title: "Test Conversation",
          model: "gpt-4",
          system_prompt: "Be helpful",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          archived_at: null,
        },
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await getConversations();

      expect(result.error).toBeUndefined();
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].title).toBe("Test Conversation");
      expect(result.conversations[0].archivedAt).toBeNull();
    });

    it("includes archived conversations when requested", async () => {
      const mockData = [
        {
          id: "conv-1",
          user_id: "user-123",
          title: "Active Chat",
          model: "gpt-4",
          system_prompt: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          archived_at: null,
        },
        {
          id: "conv-2",
          user_id: "user-123",
          title: "Archived Chat",
          model: "gpt-4",
          system_prompt: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          archived_at: "2024-01-03T00:00:00Z",
        },
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await getConversations(true);

      expect(result.conversations).toHaveLength(2);
      expect(result.conversations[1].archivedAt).toEqual(new Date("2024-01-03T00:00:00Z"));
    });

    it("returns error on database failure", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Database error" },
        }),
      });

      const result = await getConversations();

      expect(result.error).toBe("Database error");
      expect(result.conversations).toEqual([]);
    });

    it("returns empty array when data is null", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await getConversations();

      expect(result.error).toBeUndefined();
      expect(result.conversations).toEqual([]);
    });
  });

  describe("getConversation", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await getConversation("conv-1");
      expect(result).toEqual({
        conversation: null,
        error: "Not authenticated",
      });
    });

    it("returns conversation with messages", async () => {
      const convData = {
        id: "conv-1",
        user_id: "user-123",
        title: "Test",
        model: "gpt-4",
        system_prompt: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
        archived_at: null,
      };

      const msgData = [
        {
          id: "msg-1",
          conversation_id: "conv-1",
          role: "user",
          content: "Hello",
          tool_calls: null,
          tool_results: null,
          input_tokens: 10,
          output_tokens: null,
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: convData, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: msgData, error: null }),
        });

      const result = await getConversation("conv-1");

      expect(result.error).toBeUndefined();
      expect(result.conversation).toBeDefined();
      expect(result.conversation?.title).toBe("Test");
      expect(result.conversation?.messages).toHaveLength(1);
      expect(result.conversation?.archivedAt).toBeNull();
    });

    it("returns not found error for PGRST116", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116", message: "Not found" },
        }),
      });

      const result = await getConversation("conv-1");

      expect(result.conversation).toBeNull();
      expect(result.error).toBe("Conversation not found");
    });

    it("returns error on conversation fetch failure", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: "OTHER", message: "DB error" },
        }),
      });

      const result = await getConversation("conv-1");

      expect(result.conversation).toBeNull();
      expect(result.error).toBe("DB error");
    });

    it("returns error on messages fetch failure", async () => {
      const convData = {
        id: "conv-1",
        user_id: "user-123",
        title: "Test",
        model: "gpt-4",
        system_prompt: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: convData, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Message fetch error" },
          }),
        });

      const result = await getConversation("conv-1");

      expect(result.conversation).toBeNull();
      expect(result.error).toBe("Message fetch error");
    });

    it("handles null messages data", async () => {
      const convData = {
        id: "conv-1",
        user_id: "user-123",
        title: "Test",
        model: "gpt-4",
        system_prompt: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: convData, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: null, error: null }),
        });

      const result = await getConversation("conv-1");

      expect(result.conversation?.messages).toEqual([]);
    });
  });

  describe("createConversation", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await createConversation();
      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });

    it("creates conversation with defaults", async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "new-conv" },
          error: null,
        }),
      });

      const result = await createConversation();

      expect(result.success).toBe(true);
      expect(result.id).toBe("new-conv");
    });

    it("creates conversation with custom input", async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: "new-conv" },
          error: null,
        }),
      });

      const result = await createConversation({
        title: "My Chat",
        model: "gpt-4o",
        systemPrompt: "Be concise",
      });

      expect(result.success).toBe(true);
    });

    it("returns error on database failure", async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "Insert failed" },
        }),
      });

      const result = await createConversation();

      expect(result.success).toBe(false);
      expect(result.error).toBe("Insert failed");
    });
  });

  describe("updateConversation", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await updateConversation("conv-1", { title: "New Title" });
      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });

    it("updates conversation title", async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null });
      mockFrom.mockReturnValue(chain);

      const result = await updateConversation("conv-1", { title: "New Title" });

      expect(result.success).toBe(true);
    });

    it("updates multiple fields", async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null });
      mockFrom.mockReturnValue(chain);

      const result = await updateConversation("conv-1", {
        title: "New Title",
        model: "gpt-4o",
        systemPrompt: "Be brief",
      });

      expect(result.success).toBe(true);
    });

    it("returns error on database failure", async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      chain.eq
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ error: { message: "Update failed" } });
      mockFrom.mockReturnValue(chain);

      const result = await updateConversation("conv-1", { title: "New" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });
  });

  describe("deleteConversation", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await deleteConversation("conv-1");
      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });

    it("deletes conversation", async () => {
      const chain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null });
      mockFrom.mockReturnValue(chain);

      const result = await deleteConversation("conv-1");

      expect(result.success).toBe(true);
    });

    it("returns error on database failure", async () => {
      const chain = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      chain.eq
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ error: { message: "Delete failed" } });
      mockFrom.mockReturnValue(chain);

      const result = await deleteConversation("conv-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete failed");
    });
  });

  describe("archiveConversation", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await archiveConversation("conv-1");
      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });

    it("archives conversation", async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null });
      mockFrom.mockReturnValue(chain);

      const result = await archiveConversation("conv-1");

      expect(result.success).toBe(true);
    });

    it("returns error on database failure", async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      chain.eq
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ error: { message: "Archive failed" } });
      mockFrom.mockReturnValue(chain);

      const result = await archiveConversation("conv-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Archive failed");
    });
  });

  describe("unarchiveConversation", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await unarchiveConversation("conv-1");
      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });

    it("unarchives conversation", async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null });
      mockFrom.mockReturnValue(chain);

      const result = await unarchiveConversation("conv-1");

      expect(result.success).toBe(true);
    });

    it("returns error on database failure", async () => {
      const chain = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      };
      chain.eq
        .mockReturnValueOnce(chain)
        .mockResolvedValueOnce({ error: { message: "Unarchive failed" } });
      mockFrom.mockReturnValue(chain);

      const result = await unarchiveConversation("conv-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unarchive failed");
    });
  });

  describe("addMessage", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await addMessage("conv-1", { role: "user", content: "Hi" });
      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });

    it("adds message to conversation", async () => {
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "conv-1", user_id: "user-123" },
            error: null,
          }),
        })
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "msg-new" },
            error: null,
          }),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ error: null }),
        });

      const result = await addMessage("conv-1", {
        role: "user",
        content: "Hello",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe("msg-new");
    });

    it("returns error when conversation not found", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await addMessage("conv-1", {
        role: "user",
        content: "Hi",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Conversation not found");
    });

    it("returns error on insert failure", async () => {
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { id: "conv-1", user_id: "user-123" },
            error: null,
          }),
        })
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Insert failed" },
          }),
        });

      const result = await addMessage("conv-1", {
        role: "user",
        content: "Hi",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Insert failed");
    });
  });

  describe("getChatSummary", () => {
    it("returns empty summary when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const result = await getChatSummary();
      expect(result.recentConversations).toEqual([]);
      expect(result.totalConversations).toBe(0);
    });

    it("returns chat summary", async () => {
      const recentData = [
        {
          id: "conv-1",
          user_id: "user-123",
          title: "Recent Chat",
          model: "gpt-4",
          system_prompt: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
          archived_at: null,
        },
      ];

      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: recentData, error: null }),
        });

      const result = await getChatSummary();

      expect(result.recentConversations).toHaveLength(1);
      expect(result.totalConversations).toBe(5);
    });

    it("handles null count", async () => {
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: null, error: null }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        });

      const result = await getChatSummary();

      expect(result.totalConversations).toBe(0);
    });
  });

  describe("runAgentAction", () => {
    it("throws error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      await expect(runAgentAction({ prompt: "Hello" })).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("executes agent for authenticated user", async () => {
      const mockResult = {
        text: "Hello, how can I help?",
        usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
        finishReason: "stop",
        steps: 1,
      };
      mockExecuteAgent.mockResolvedValue(mockResult);

      const result = await runAgentAction({
        prompt: "Hello",
        model: "gpt-4",
      });

      expect(result).toEqual(mockResult);
      expect(mockExecuteAgent).toHaveBeenCalledWith({
        prompt: "Hello",
        model: "gpt-4",
      });
    });
  });

  describe("getAvailableModelsWithPricing", () => {
    it("returns models from openrouter", async () => {
      const mockModels = [
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
        },
      ];
      mockGetModelsWithPricing.mockResolvedValue(mockModels);

      const result = await getAvailableModelsWithPricing();

      expect(result).toEqual(mockModels);
    });

    it("returns fallback model on error", async () => {
      mockGetModelsWithPricing.mockRejectedValue(new Error("API error"));

      const result = await getAvailableModelsWithPricing();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("anthropic/claude-sonnet-4-20250514");
    });
  });

  describe("recordMessageCost", () => {
    it("returns error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await recordMessageCost({
        conversationId: "conv-1",
        messageId: "msg-1",
        model: "gpt-4",
        inputTokens: 100,
        outputTokens: 50,
      });

      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });

    it("records cost successfully", async () => {
      mockCalculateCostWithMargin.mockResolvedValue(0.005);
      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

      const result = await recordMessageCost({
        conversationId: "conv-1",
        messageId: "msg-1",
        model: "gpt-4",
        inputTokens: 100,
        outputTokens: 50,
        reasoningTokens: 0,
      });

      expect(result.success).toBe(true);
      expect(mockCalculateCostWithMargin).toHaveBeenCalledWith("gpt-4", 100, 50, 0);
    });

    it("returns error on database failure", async () => {
      mockCalculateCostWithMargin.mockResolvedValue(0.005);
      mockFrom.mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: { message: "Insert failed" } }),
      });

      const result = await recordMessageCost({
        conversationId: "conv-1",
        messageId: "msg-1",
        model: "gpt-4",
        inputTokens: 100,
        outputTokens: 50,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Insert failed");
    });
  });

  describe("getUserChatSpending", () => {
    it("returns 0 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await getUserChatSpending();

      expect(result.totalSpent).toBe(0);
      expect(result.error).toBe("Not authenticated");
    });

    it("returns user spending", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { total_chat_spent: 1.25 },
          error: null,
        }),
      });

      const result = await getUserChatSpending();

      expect(result.totalSpent).toBe(1.25);
      expect(result.error).toBeUndefined();
    });

    it("returns 0 on null data", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const result = await getUserChatSpending();

      expect(result.totalSpent).toBe(0);
    });

    it("returns error on database failure", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "DB error" },
        }),
      });

      const result = await getUserChatSpending();

      expect(result.totalSpent).toBe(0);
      expect(result.error).toBe("DB error");
    });
  });
});
