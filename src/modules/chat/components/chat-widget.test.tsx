import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatWidget } from "./chat-widget";

// Mock the actions
vi.mock("../actions", () => ({
  getChatSummary: vi.fn(),
}));

// Mock the client component
vi.mock("./chat-widget-client", () => ({
  ChatWidgetClient: vi.fn(({ recentConversations, totalConversations }) => (
    <div data-testid="chat-widget-client">
      <span data-testid="recent-conversations">{recentConversations.length}</span>
      <span data-testid="total-conversations">{totalConversations}</span>
    </div>
  )),
}));

import { getChatSummary } from "../actions";

const mockGetChatSummary = vi.mocked(getChatSummary);

describe("ChatWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders client component with fetched data", async () => {
    const mockSummary = {
      recentConversations: [
        {
          id: "conv-1",
          userId: "user-1",
          title: "Test conversation",
          model: "openai/gpt-4o",
          systemPrompt: null,
          archivedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      totalConversations: 5,
    };
    mockGetChatSummary.mockResolvedValue(mockSummary);

    const Widget = await ChatWidget();
    render(Widget);

    expect(screen.getByTestId("chat-widget-client")).toBeInTheDocument();
    expect(screen.getByTestId("recent-conversations")).toHaveTextContent("1");
    expect(screen.getByTestId("total-conversations")).toHaveTextContent("5");
  });

  it("renders with empty data", async () => {
    const mockSummary = {
      recentConversations: [],
      totalConversations: 0,
    };
    mockGetChatSummary.mockResolvedValue(mockSummary);

    const Widget = await ChatWidget();
    render(Widget);

    expect(screen.getByTestId("chat-widget-client")).toBeInTheDocument();
    expect(screen.getByTestId("recent-conversations")).toHaveTextContent("0");
    expect(screen.getByTestId("total-conversations")).toHaveTextContent("0");
  });
});
