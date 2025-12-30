import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentTasksWidget } from "./agent-tasks-widget";

// Mock the actions
vi.mock("../actions", () => ({
  getAgentTasksSummary: vi.fn(),
}));

// Mock the client component
vi.mock("./agent-tasks-widget-client", () => ({
  AgentTasksWidgetClient: vi.fn(({ recentRuns, totalRuns, runningCount, totalCost }) => (
    <div data-testid="agent-tasks-widget-client">
      <span data-testid="recent-runs">{recentRuns.length}</span>
      <span data-testid="total-runs">{totalRuns}</span>
      <span data-testid="running-count">{runningCount}</span>
      <span data-testid="total-cost">{totalCost}</span>
    </div>
  )),
}));

import { getAgentTasksSummary } from "../actions";

const mockGetAgentTasksSummary = vi.mocked(getAgentTasksSummary);

describe("AgentTasksWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders client component with fetched data", async () => {
    const mockSummary = {
      recentRuns: [
        {
          id: "run-1",
          userId: "user-1",
          prompt: "Test prompt",
          systemPrompt: null,
          model: "openai/gpt-4o",
          status: "completed" as const,
          result: "Test result",
          error: null,
          inputTokens: 100,
          outputTokens: 200,
          createdAt: new Date(),
          completedAt: new Date(),
        },
      ],
      totalRuns: 5,
      runningCount: 1,
      totalCost: 0.05,
    };
    mockGetAgentTasksSummary.mockResolvedValue(mockSummary);

    const Widget = await AgentTasksWidget();
    render(Widget);

    expect(screen.getByTestId("agent-tasks-widget-client")).toBeInTheDocument();
    expect(screen.getByTestId("recent-runs")).toHaveTextContent("1");
    expect(screen.getByTestId("total-runs")).toHaveTextContent("5");
    expect(screen.getByTestId("running-count")).toHaveTextContent("1");
    expect(screen.getByTestId("total-cost")).toHaveTextContent("0.05");
  });

  it("renders with empty data", async () => {
    const mockSummary = {
      recentRuns: [],
      totalRuns: 0,
      runningCount: 0,
      totalCost: 0,
    };
    mockGetAgentTasksSummary.mockResolvedValue(mockSummary);

    const Widget = await AgentTasksWidget();
    render(Widget);

    expect(screen.getByTestId("agent-tasks-widget-client")).toBeInTheDocument();
    expect(screen.getByTestId("recent-runs")).toHaveTextContent("0");
    expect(screen.getByTestId("total-runs")).toHaveTextContent("0");
    expect(screen.getByTestId("running-count")).toHaveTextContent("0");
    expect(screen.getByTestId("total-cost")).toHaveTextContent("0");
  });
});
