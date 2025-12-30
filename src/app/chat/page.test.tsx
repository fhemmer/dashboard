import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ChatPage from "./page";

vi.mock("@/modules/chat/actions", () => ({
  getConversations: vi.fn(),
}));

vi.mock("./conversation-list-item", () => ({
  ConversationListItem: ({ conversation }: { conversation: { title: string | null } }) => (
    <div data-testid="conversation-item">{conversation.title ?? "New Chat"}</div>
  ),
}));

const { getConversations } = await import("@/modules/chat/actions");

describe("ChatPage", () => {
  it("renders page title and description", async () => {
    vi.mocked(getConversations).mockResolvedValue({
      conversations: [],
      error: undefined,
    });

    const page = await ChatPage();
    render(page);

    expect(screen.getByText("AI Chat")).toBeInTheDocument();
    expect(screen.getByText("Chat with AI models using OpenRouter")).toBeInTheDocument();
  });

  it("renders new chat button", async () => {
    vi.mocked(getConversations).mockResolvedValue({
      conversations: [],
      error: undefined,
    });

    const page = await ChatPage();
    render(page);

    expect(screen.getByRole("link", { name: /new chat/i })).toHaveAttribute(
      "href",
      "/chat/new"
    );
  });

  it("shows empty state when no conversations", async () => {
    vi.mocked(getConversations).mockResolvedValue({
      conversations: [],
      error: undefined,
    });

    const page = await ChatPage();
    render(page);

    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
    expect(screen.getByText(/start a new chat/i)).toBeInTheDocument();
  });

  it("displays error message when there is an error", async () => {
    vi.mocked(getConversations).mockResolvedValue({
      conversations: [],
      error: "Failed to load",
    });

    const page = await ChatPage();
    render(page);

    expect(screen.getByText("Failed to load")).toBeInTheDocument();
  });

  it("renders conversations when they exist", async () => {
    vi.mocked(getConversations).mockResolvedValue({
      conversations: [
        {
          id: "conv-1",
          userId: "user-1",
          title: "First Chat",
          model: "gpt-4",
          systemPrompt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        },
        {
          id: "conv-2",
          userId: "user-1",
          title: null,
          model: "gpt-4o",
          systemPrompt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          archivedAt: null,
        },
      ],
      error: undefined,
    });

    const page = await ChatPage();
    render(page);

    const items = screen.getAllByTestId("conversation-item");
    expect(items).toHaveLength(2);
    expect(screen.getByText("First Chat")).toBeInTheDocument();
    // "New Chat" appears both in button and untitled conversation
    expect(screen.getAllByText("New Chat")).toHaveLength(2);
  });
});
