import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  addMessage,
  createConversation,
  deleteConversation,
  getChatSummary,
  getConversation,
  getConversations,
  updateConversation,
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

describe("chat actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
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
        },
      ];

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      const result = await getConversations();

      expect(result.error).toBeUndefined();
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].title).toBe("Test Conversation");
    });

    it("returns error on database failure", async () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
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
});
