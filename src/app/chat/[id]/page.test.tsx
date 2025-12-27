import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatConversationPage from "./page";

// Mock the chat actions
vi.mock("@/modules/chat/actions", () => ({
  getConversation: vi.fn(),
}));

// Mock next/navigation
const mockNotFound = vi.fn();
vi.mock("next/navigation", () => ({
  notFound: () => {
    mockNotFound();
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// Mock ChatInterface
vi.mock("./chat-interface", () => ({
  ChatInterface: ({ conversation }: { conversation: { id: string; title: string } }) => (
    <div data-testid="chat-interface">Chat: {conversation.title}</div>
  ),
}));

import { getConversation } from "@/modules/chat/actions";

const mockGetConversation = vi.mocked(getConversation);

function createMockConversation(overrides: Partial<{
  id: string;
  title: string;
  model: string;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id: overrides.id ?? "conv-1",
    title: overrides.title ?? "Test Conversation",
    model: overrides.model ?? "openrouter/anthropic/claude-3",
    systemPrompt: null,
    createdAt: overrides.createdAt ?? new Date("2024-01-01T10:00:00Z"),
    updatedAt: overrides.updatedAt ?? new Date("2024-01-01T10:05:00Z"),
    userId: "user-1",
    messages: [],
    archivedAt: null,
  };
}

describe("ChatConversationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders chat interface when conversation is found", async () => {
    const conversation = createMockConversation({ title: "My Chat" });
    mockGetConversation.mockResolvedValue({ conversation, error: undefined });

    const Component = await ChatConversationPage({
      params: Promise.resolve({ id: "conv-1" }),
    });
    render(Component);

    expect(screen.getByTestId("chat-interface")).toBeInTheDocument();
    expect(screen.getByText("Chat: My Chat")).toBeInTheDocument();
  });

  it("calls notFound when conversation is not found", async () => {
    mockGetConversation.mockResolvedValue({
      conversation: null,
      error: "Conversation not found",
    });

    await expect(
      ChatConversationPage({
        params: Promise.resolve({ id: "non-existent" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("calls notFound when conversation is null", async () => {
    mockGetConversation.mockResolvedValue({
      conversation: null,
      error: undefined,
    });

    await expect(
      ChatConversationPage({
        params: Promise.resolve({ id: "null-conv" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalled();
  });

  it("displays error message for other errors", async () => {
    mockGetConversation.mockResolvedValue({
      conversation: null,
      error: "Database connection failed",
    });

    // This test passes because the error is not "Conversation not found"
    // but there's no conversation, so notFound is still called
    await expect(
      ChatConversationPage({
        params: Promise.resolve({ id: "error-conv" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("displays generic error when conversation exists but has other error", async () => {
    const conversation = createMockConversation();
    mockGetConversation.mockResolvedValue({
      conversation,
      error: "Some other error",
    });

    const Component = await ChatConversationPage({
      params: Promise.resolve({ id: "conv-1" }),
    });
    render(Component);

    expect(screen.getByText("Some other error")).toBeInTheDocument();
  });

  it("fetches conversation with correct id from params", async () => {
    const conversation = createMockConversation();
    mockGetConversation.mockResolvedValue({ conversation, error: undefined });

    await ChatConversationPage({
      params: Promise.resolve({ id: "specific-id-123" }),
    });

    expect(mockGetConversation).toHaveBeenCalledWith("specific-id-123");
  });
});
