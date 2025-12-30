import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ChatConversation } from "../types";
import { ChatWidgetClient } from "./chat-widget-client";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("ChatWidgetClient", () => {
  const baseConversation: ChatConversation = {
    id: "conv-1",
    userId: "user-1",
    title: "Test conversation",
    model: "openai/gpt-4o",
    systemPrompt: null,
    archivedAt: null,
    createdAt: new Date("2024-12-26T10:00:00Z"),
    updatedAt: new Date("2024-12-26T12:00:00Z"),
  };

  it("renders widget with no conversations", () => {
    render(
      <ChatWidgetClient
        recentConversations={[]}
        totalConversations={0}
      />
    );

    expect(screen.getByText("AI Chat")).toBeInTheDocument();
    expect(screen.getByText("Start a conversation")).toBeInTheDocument();
    expect(screen.getByText("No conversations yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start chat/i })).toHaveAttribute("href", "/chat/new");
  });

  it("renders widget with conversations", () => {
    render(
      <ChatWidgetClient
        recentConversations={[baseConversation]}
        totalConversations={5}
      />
    );

    expect(screen.getByText("AI Chat")).toBeInTheDocument();
    expect(screen.getByText("5 conversations")).toBeInTheDocument();
    expect(screen.getByText("Test conversation")).toBeInTheDocument();
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
  });

  it("renders singular conversation text for one conversation", () => {
    render(
      <ChatWidgetClient
        recentConversations={[baseConversation]}
        totalConversations={1}
      />
    );

    expect(screen.getByText("1 conversation")).toBeInTheDocument();
  });

  it("renders link to new chat", () => {
    render(
      <ChatWidgetClient
        recentConversations={[]}
        totalConversations={0}
      />
    );

    expect(screen.getByRole("link", { name: "New chat" })).toHaveAttribute("href", "/chat/new");
  });

  it("renders link to view all chats", () => {
    render(
      <ChatWidgetClient
        recentConversations={[]}
        totalConversations={0}
      />
    );

    expect(screen.getByRole("link", { name: "View All" })).toHaveAttribute("href", "/chat");
  });

  it("renders multiple conversations", () => {
    const conversations: ChatConversation[] = [
      { ...baseConversation, id: "conv-1", title: "First chat" },
      { ...baseConversation, id: "conv-2", title: "Second chat" },
      { ...baseConversation, id: "conv-3", title: "Third chat" },
    ];

    render(
      <ChatWidgetClient
        recentConversations={conversations}
        totalConversations={10}
      />
    );

    expect(screen.getByText("10 conversations")).toBeInTheDocument();
    expect(screen.getByText("First chat")).toBeInTheDocument();
    expect(screen.getByText("Second chat")).toBeInTheDocument();
    expect(screen.getByText("Third chat")).toBeInTheDocument();
  });

  it("shows 'New Chat' for conversation without title", () => {
    const untitledConversation = { ...baseConversation, title: null };

    render(
      <ChatWidgetClient
        recentConversations={[untitledConversation]}
        totalConversations={1}
      />
    );

    expect(screen.getByText("New Chat")).toBeInTheDocument();
  });

  it("links each conversation to its detail page", () => {
    render(
      <ChatWidgetClient
        recentConversations={[baseConversation]}
        totalConversations={1}
      />
    );

    const convLink = screen.getByRole("link", { name: /Test conversation/ });
    expect(convLink).toHaveAttribute("href", "/chat/conv-1");
  });

  it("extracts model name from full model path", () => {
    const conversationWithLongModel = {
      ...baseConversation,
      model: "anthropic/claude-3-5-sonnet-20241022",
    };

    render(
      <ChatWidgetClient
        recentConversations={[conversationWithLongModel]}
        totalConversations={1}
      />
    );

    // Model name is truncated to 20 chars by truncateMessage
    expect(screen.getByText("claude-3-5-sonnet-20...")).toBeInTheDocument();
  });

  it("handles model without slash", () => {
    const conversationWithSimpleModel = {
      ...baseConversation,
      model: "gpt-4",
    };

    render(
      <ChatWidgetClient
        recentConversations={[conversationWithSimpleModel]}
        totalConversations={1}
      />
    );

    expect(screen.getByText("gpt-4")).toBeInTheDocument();
  });
});
