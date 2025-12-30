/**
 * @vitest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChatConversationWithMessages, ChatMessage } from "@/modules/chat/types";

// Mock next/navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

// Mock the actions module
const mockAddMessage = vi.fn();
const mockArchiveConversation = vi.fn();
const mockDeleteConversation = vi.fn();
const mockRecordMessageCost = vi.fn();
const mockRunAgentAction = vi.fn();
const mockUpdateConversation = vi.fn();

vi.mock("@/modules/chat/actions", () => ({
  addMessage: (...args: unknown[]) => mockAddMessage(...args),
  archiveConversation: (...args: unknown[]) => mockArchiveConversation(...args),
  deleteConversation: (...args: unknown[]) => mockDeleteConversation(...args),
  recordMessageCost: (...args: unknown[]) => mockRecordMessageCost(...args),
  runAgentAction: (...args: unknown[]) => mockRunAgentAction(...args),
  updateConversation: (...args: unknown[]) => mockUpdateConversation(...args),
}));

// Mock the agent library
vi.mock("@/lib/agent", () => ({
  calculateCost: (model: string, input: number, output: number) => {
    // Simple mock calculation
    return ((input + output) * 0.001) / 1000;
  },
  getContextWindow: (model: string) => {
    if (model.includes("claude")) return 200000;
    if (model.includes("gemini")) return 1000000;
    return 128000;
  },
}));

// Import after mocks are set up
import { ChatInterface } from "./chat-interface";

function createMockConversation(overrides?: Partial<ChatConversationWithMessages>): ChatConversationWithMessages {
  return {
    id: "conv-123",
    userId: "user-456",
    title: "Test Conversation",
    model: "anthropic/claude-sonnet-4-20250514",
    systemPrompt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    archivedAt: null,
    messages: [],
    ...overrides,
  };
}

let messageCounter = 0;

function createMockMessage(overrides?: Partial<ChatMessage>): ChatMessage {
  const uniqueId = `msg-${Date.now()}-${++messageCounter}`;
  return {
    id: uniqueId,
    conversationId: "conv-123",
    role: "user",
    content: "Test message",
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

// Helper to get the dropdown menu trigger button
function getMenuButton(): HTMLElement {
  return screen.getByRole("button", { expanded: false });
}

describe("ChatInterface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddMessage.mockResolvedValue({ success: true, id: "new-msg-id" });
    mockArchiveConversation.mockResolvedValue({ success: true });
    mockDeleteConversation.mockResolvedValue({ success: true });
    mockRecordMessageCost.mockResolvedValue({ success: true });
    mockRunAgentAction.mockResolvedValue({
      text: "AI response",
      usage: { promptTokens: 100, completionTokens: 50 },
    });
    mockUpdateConversation.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("should render conversation title", () => {
      const conversation = createMockConversation({ title: "My Chat" });
      render(<ChatInterface conversation={conversation} />);

      expect(screen.getByRole("heading", { name: "My Chat" })).toBeInTheDocument();
    });

    it("should render 'New Chat' when title is null", () => {
      const conversation = createMockConversation({ title: null });
      render(<ChatInterface conversation={conversation} />);

      expect(screen.getByRole("heading", { name: "New Chat" })).toBeInTheDocument();
    });

    it("should render model name", () => {
      const conversation = createMockConversation({ model: "openai/gpt-4o" });
      render(<ChatInterface conversation={conversation} />);

      expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    });

    it("should render empty state when no messages", () => {
      const conversation = createMockConversation({ messages: [] });
      render(<ChatInterface conversation={conversation} />);

      expect(screen.getByText("Send a message to start the conversation")).toBeInTheDocument();
    });

    it("should render messages when present", () => {
      const conversation = createMockConversation({
        messages: [
          createMockMessage({ role: "user", content: "Hello AI" }),
          createMockMessage({ role: "assistant", content: "Hello human" }),
        ],
      });
      render(<ChatInterface conversation={conversation} />);

      expect(screen.getByText("Hello AI")).toBeInTheDocument();
      expect(screen.getByText("Hello human")).toBeInTheDocument();
    });

    it("should render textarea with placeholder", () => {
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      expect(screen.getByPlaceholderText("Type your message...")).toBeInTheDocument();
    });

    it("should render All Chats link", () => {
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      expect(screen.getByRole("link", { name: "All Chats" })).toHaveAttribute("href", "/chat");
    });
  });

  describe("token stats display", () => {
    it("should not show token stats when no tokens used", () => {
      const conversation = createMockConversation({ messages: [] });
      render(<ChatInterface conversation={conversation} />);

      expect(screen.queryByText(/Context:/)).not.toBeInTheDocument();
    });

    it("should show token stats when messages have token counts", () => {
      const conversation = createMockConversation({
        messages: [
          createMockMessage({
            role: "assistant",
            content: "Response",
            inputTokens: 500,
            outputTokens: 200,
          }),
        ],
      });
      render(<ChatInterface conversation={conversation} />);

      // Should show context usage
      expect(screen.getByText(/Context:/)).toBeInTheDocument();
      // Should show total tokens and cost
      expect(screen.getByText(/Total:/)).toBeInTheDocument();
    });

    it("should calculate cumulative tokens across messages", () => {
      const conversation = createMockConversation({
        messages: [
          createMockMessage({
            role: "assistant",
            content: "First response",
            inputTokens: 100,
            outputTokens: 50,
          }),
          createMockMessage({
            role: "assistant",
            content: "Second response",
            inputTokens: 200,
            outputTokens: 100,
          }),
        ],
      });
      render(<ChatInterface conversation={conversation} />);

      // Total input tokens: 300, total output: 150, total: 450
      expect(screen.getByText(/450 tokens/)).toBeInTheDocument();
    });
  });

  describe("message bubbles", () => {
    it("should display token count on assistant messages with tokens", () => {
      const conversation = createMockConversation({
        messages: [
          createMockMessage({
            role: "assistant",
            content: "Response with tokens",
            inputTokens: 100,
            outputTokens: 50,
          }),
        ],
      });
      render(<ChatInterface conversation={conversation} />);

      // The token count appears in both the message bubble and the total stats
      // Check that both exist
      const tokenTexts = screen.getAllByText(/150 tokens/);
      expect(tokenTexts.length).toBeGreaterThanOrEqual(1);
    });

    it("should not display token count on user messages", () => {
      const conversation = createMockConversation({
        messages: [
          createMockMessage({
            role: "user",
            content: "User message",
          }),
        ],
      });
      render(<ChatInterface conversation={conversation} />);

      // User messages don't show token info
      expect(screen.queryByText("tokens •", { exact: false })).not.toBeInTheDocument();
    });

    it("should not display token count when hasTokens is false", () => {
      const conversation = createMockConversation({
        messages: [
          createMockMessage({
            role: "assistant",
            content: "Response without tokens",
            // inputTokens and outputTokens are undefined
          }),
        ],
      });
      render(<ChatInterface conversation={conversation} />);

      // No token display in message bubble (undefined tokens)
      expect(screen.queryByText("tokens •", { exact: false })).not.toBeInTheDocument();
    });

    it("should not display token count when total tokens is 0", () => {
      const conversation = createMockConversation({
        messages: [
          createMockMessage({
            role: "assistant",
            content: "Response with zero tokens",
            inputTokens: 0,
            outputTokens: 0,
          }),
        ],
      });
      render(<ChatInterface conversation={conversation} />);

      // Should not show the tokens info since totalTokens is 0
      expect(screen.queryByText("0 tokens •", { exact: false })).not.toBeInTheDocument();
    });
  });

  describe("sending messages", () => {
    it("should disable send button when input is empty", () => {
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      // Find the send button by looking for the disabled button with data-slot="button"
      const sendButton = document.querySelector('button[data-slot="button"][disabled]');
      expect(sendButton).toBeInTheDocument();
    });

    it("should enable send button when input has text", async () => {
      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      await user.type(textarea, "Hello");

      // Find the send button by looking for the button that's not disabled
      const buttons = screen.getAllByRole("button");
      const sendButton = buttons.find((btn) => btn.querySelector("svg"));
      expect(sendButton).not.toBeDisabled();
    });

    it("should send message on Enter key", async () => {
      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      await user.type(textarea, "Hello{enter}");

      await waitFor(() => {
        expect(mockAddMessage).toHaveBeenCalledWith("conv-123", {
          role: "user",
          content: "Hello",
        });
      });
    });

    it("should not send on Shift+Enter (allow multiline)", async () => {
      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      await user.type(textarea, "Hello{Shift>}{enter}{/Shift}");

      // Should not have called addMessage
      expect(mockAddMessage).not.toHaveBeenCalled();
    });

    it("should clear input after sending", async () => {
      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const textarea = screen.getByPlaceholderText("Type your message...") as HTMLTextAreaElement;
      await user.type(textarea, "Hello{enter}");

      await waitFor(() => {
        expect(textarea.value).toBe("");
      });
    });

    it("should call runAgentAction after saving user message", async () => {
      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      await user.type(textarea, "Test message{enter}");

      await waitFor(() => {
        expect(mockRunAgentAction).toHaveBeenCalledWith(
          expect.objectContaining({
            model: "anthropic/claude-sonnet-4-20250514",
          })
        );
      });
    });

    it("should save assistant response with token counts", async () => {
      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      await user.type(textarea, "Hello{enter}");

      await waitFor(() => {
        expect(mockAddMessage).toHaveBeenCalledWith("conv-123", {
          role: "assistant",
          content: "AI response",
          inputTokens: 100,
          outputTokens: 50,
        });
      });
    });

    it("should update conversation title on first message", async () => {
      const user = userEvent.setup();
      const conversation = createMockConversation({ messages: [] });
      render(<ChatInterface conversation={conversation} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      await user.type(textarea, "What is the meaning of life?{enter}");

      await waitFor(() => {
        expect(mockUpdateConversation).toHaveBeenCalledWith("conv-123", {
          title: expect.any(String),
        });
      });
    });

    it("should record message cost after successful assistant response", async () => {
      const user = userEvent.setup();
      const conversation = createMockConversation({ messages: [] });
      render(<ChatInterface conversation={conversation} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      await user.type(textarea, "Hello{enter}");

      await waitFor(() => {
        expect(mockRecordMessageCost).toHaveBeenCalledWith({
          conversationId: "conv-123",
          messageId: "new-msg-id",
          model: "anthropic/claude-sonnet-4-20250514",
          inputTokens: 100,
          outputTokens: 50,
          reasoningTokens: 0,
        });
      });
    });

    it("should show error when message fails to send", async () => {
      mockAddMessage.mockResolvedValueOnce({ success: false, error: "Network error" });

      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      await user.type(textarea, "Hello{enter}");

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument();
      });
    });

    it("should show error when assistant message fails to save", async () => {
      // First call (user message) succeeds, second call (assistant message) fails
      mockAddMessage
        .mockResolvedValueOnce({ success: true, id: "user-msg-id" })
        .mockResolvedValueOnce({ success: false, error: "Failed to save assistant response" });

      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      await user.type(textarea, "Hello{enter}");

      await waitFor(() => {
        expect(screen.getByText("Failed to save assistant response")).toBeInTheDocument();
      });
    });

    it("should show generic error when assistant message fails without error message", async () => {
      // First call (user message) succeeds, second call (assistant message) fails without error
      mockAddMessage
        .mockResolvedValueOnce({ success: true, id: "user-msg-id" })
        .mockResolvedValueOnce({ success: false });

      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      await user.type(textarea, "Hello{enter}");

      await waitFor(() => {
        expect(screen.getByText("Failed to save response")).toBeInTheDocument();
      });
    });
  });

  describe("archive functionality", () => {
    it("should archive conversation when Archive is clicked", async () => {
      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      // Open dropdown menu
      const menuButton = getMenuButton();
      await user.click(menuButton);

      // Click Archive
      const archiveButton = screen.getByRole("menuitem", { name: /Archive/i });
      await user.click(archiveButton);

      await waitFor(() => {
        expect(mockArchiveConversation).toHaveBeenCalledWith("conv-123");
      });
    });

    it("should redirect to /chat after successful archive", async () => {
      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const menuButton = getMenuButton();
      await user.click(menuButton);

      const archiveButton = screen.getByRole("menuitem", { name: /Archive/i });
      await user.click(archiveButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/chat");
      });
    });

    it("should show error when archive fails", async () => {
      mockArchiveConversation.mockResolvedValueOnce({ success: false, error: "Archive failed" });

      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const menuButton = getMenuButton();
      await user.click(menuButton);

      const archiveButton = screen.getByRole("menuitem", { name: /Archive/i });
      await user.click(archiveButton);

      await waitFor(() => {
        expect(screen.getByText("Archive failed")).toBeInTheDocument();
      });
    });
  });

  describe("delete functionality", () => {
    it("should show delete confirmation dialog", async () => {
      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const menuButton = getMenuButton();
      await user.click(menuButton);

      const deleteButton = screen.getByRole("menuitem", { name: /Delete/i });
      await user.click(deleteButton);

      expect(screen.getByText("Delete conversation?")).toBeInTheDocument();
    });

    it("should delete conversation when confirmed", async () => {
      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const menuButton = getMenuButton();
      await user.click(menuButton);

      const deleteMenuItem = screen.getByRole("menuitem", { name: /Delete/i });
      await user.click(deleteMenuItem);

      const confirmButton = screen.getByRole("button", { name: "Delete" });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteConversation).toHaveBeenCalledWith("conv-123");
      });
    });

    it("should close dialog when cancel is clicked", async () => {
      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const menuButton = getMenuButton();
      await user.click(menuButton);

      const deleteMenuItem = screen.getByRole("menuitem", { name: /Delete/i });
      await user.click(deleteMenuItem);

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText("Delete conversation?")).not.toBeInTheDocument();
      });
    });

    it("should redirect to /chat after successful delete", async () => {
      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const menuButton = getMenuButton();
      await user.click(menuButton);

      const deleteMenuItem = screen.getByRole("menuitem", { name: /Delete/i });
      await user.click(deleteMenuItem);

      const confirmButton = screen.getByRole("button", { name: "Delete" });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/chat");
      });
    });

    it("should show error when delete fails", async () => {
      mockDeleteConversation.mockResolvedValueOnce({ success: false, error: "Delete failed" });

      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const menuButton = getMenuButton();
      await user.click(menuButton);

      const deleteMenuItem = screen.getByRole("menuitem", { name: /Delete/i });
      await user.click(deleteMenuItem);

      const confirmButton = screen.getByRole("button", { name: "Delete" });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText("Delete failed")).toBeInTheDocument();
      });
    });
  });

  describe("focus behavior", () => {
    it("should focus textarea on mount", () => {
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      expect(document.activeElement).toBe(textarea);
    });
  });

  describe("loading state", () => {
    it("should show 'Thinking...' while waiting for response", async () => {
      // Make runAgentAction hang
      mockRunAgentAction.mockImplementation(() => new Promise(() => {}));

      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      await user.type(textarea, "Hello{enter}");

      await waitFor(() => {
        expect(screen.getByText("Thinking...")).toBeInTheDocument();
      });
    });
  });

  describe("error handling", () => {
    it("should show error when runAgentAction throws", async () => {
      mockRunAgentAction.mockRejectedValueOnce(new Error("API Error"));

      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const textarea = screen.getByPlaceholderText("Type your message...");
      await user.type(textarea, "Hello{enter}");

      await waitFor(() => {
        expect(screen.getByText("An unexpected error occurred")).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });

    it("should show default error message when error has no message", async () => {
      mockAddMessage.mockResolvedValueOnce({ success: false });

      const user = userEvent.setup();
      const conversation = createMockConversation();
      render(<ChatInterface conversation={conversation} />);

      const textarea = screen.getByPlaceholderText("Type your message...");
      await user.type(textarea, "Hello{enter}");

      await waitFor(() => {
        expect(screen.getByText("Failed to send message")).toBeInTheDocument();
      });
    });
  });
});
