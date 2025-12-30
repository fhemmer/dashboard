import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AgentRun } from "../types";
import { AgentTasksWidgetClient } from "./agent-tasks-widget-client";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AgentTasksWidgetClient", () => {
  const baseRun: AgentRun = {
    id: "run-1",
    userId: "user-1",
    prompt: "Test prompt for the agent task",
    systemPrompt: null,
    model: "openai/gpt-4o",
    status: "completed",
    result: "Test result",
    error: null,
    inputTokens: 100,
    outputTokens: 200,
    createdAt: new Date(),
    completedAt: new Date(),
  };

  it("renders widget with no tasks", () => {
    render(
      <AgentTasksWidgetClient
        recentRuns={[]}
        totalRuns={0}
        runningCount={0}
        totalCost={0}
      />
    );

    expect(screen.getByText("Agent Tasks")).toBeInTheDocument();
    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.getByText("No agent tasks yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /run task/i })).toHaveAttribute("href", "/agent-tasks/new");
  });

  it("renders widget with tasks", () => {
    render(
      <AgentTasksWidgetClient
        recentRuns={[baseRun]}
        totalRuns={5}
        runningCount={0}
        totalCost={0.15}
      />
    );

    expect(screen.getByText("Agent Tasks")).toBeInTheDocument();
    expect(screen.getByText("5 tasks • $0.15")).toBeInTheDocument();
    expect(screen.getByText(/Test prompt for the agent/)).toBeInTheDocument();
    expect(screen.getByText("gpt-4o")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders singular task text for one task", () => {
    render(
      <AgentTasksWidgetClient
        recentRuns={[baseRun]}
        totalRuns={1}
        runningCount={0}
        totalCost={0.01}
      />
    );

    expect(screen.getByText("1 task • $0.01")).toBeInTheDocument();
  });

  it("shows running count badge when tasks are running", () => {
    render(
      <AgentTasksWidgetClient
        recentRuns={[]}
        totalRuns={3}
        runningCount={2}
        totalCost={0.05}
      />
    );

    expect(screen.getByText("2 running")).toBeInTheDocument();
  });

  it("does not show running badge when no tasks are running", () => {
    render(
      <AgentTasksWidgetClient
        recentRuns={[baseRun]}
        totalRuns={3}
        runningCount={0}
        totalCost={0.05}
      />
    );

    expect(screen.queryByText(/running/)).not.toBeInTheDocument();
  });

  it("renders link to new task", () => {
    render(
      <AgentTasksWidgetClient
        recentRuns={[]}
        totalRuns={0}
        runningCount={0}
        totalCost={0}
      />
    );

    expect(screen.getByRole("link", { name: "New agent task" })).toHaveAttribute("href", "/agent-tasks/new");
  });

  it("renders link to view all tasks", () => {
    render(
      <AgentTasksWidgetClient
        recentRuns={[]}
        totalRuns={0}
        runningCount={0}
        totalCost={0}
      />
    );

    expect(screen.getByRole("link", { name: "View All" })).toHaveAttribute("href", "/agent-tasks");
  });

  it("renders multiple runs", () => {
    const runs: AgentRun[] = [
      { ...baseRun, id: "run-1", status: "completed" },
      { ...baseRun, id: "run-2", prompt: "Second task prompt", status: "running" },
      { ...baseRun, id: "run-3", prompt: "Third task prompt", status: "failed", error: "Error occurred" },
    ];

    render(
      <AgentTasksWidgetClient
        recentRuns={runs}
        totalRuns={10}
        runningCount={1}
        totalCost={0.50}
      />
    );

    expect(screen.getByText("10 tasks • $0.50")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("truncates long prompts", () => {
    const longPrompt = "This is a very long prompt that should be truncated because it exceeds fifty characters";
    const run = { ...baseRun, prompt: longPrompt };

    render(
      <AgentTasksWidgetClient
        recentRuns={[run]}
        totalRuns={1}
        runningCount={0}
        totalCost={0.01}
      />
    );

    // The component shows first 50 chars + "..." in the same element with whitespace
    const textElement = screen.getByText((content, element) => {
      return element?.tagName === "DIV" &&
        content.includes("This is a very long prompt") &&
        element.textContent?.includes("...");
    });
    expect(textElement).toBeInTheDocument();
  });

  it("does not add ellipsis for short prompts", () => {
    const shortPrompt = "Short prompt";
    const run = { ...baseRun, prompt: shortPrompt };

    render(
      <AgentTasksWidgetClient
        recentRuns={[run]}
        totalRuns={1}
        runningCount={0}
        totalCost={0.01}
      />
    );

    expect(screen.getByText("Short prompt")).toBeInTheDocument();
    expect(screen.queryByText("Short prompt...")).not.toBeInTheDocument();
  });

  it("links each run to its detail page", () => {
    render(
      <AgentTasksWidgetClient
        recentRuns={[baseRun]}
        totalRuns={1}
        runningCount={0}
        totalCost={0.01}
      />
    );

    const runLink = screen.getByRole("link", { name: /Test prompt/ });
    expect(runLink).toHaveAttribute("href", "/agent-tasks/run-1");
  });

  it("renders queued status correctly", () => {
    const queuedRun = { ...baseRun, status: "queued" as const };

    render(
      <AgentTasksWidgetClient
        recentRuns={[queuedRun]}
        totalRuns={1}
        runningCount={0}
        totalCost={0}
      />
    );

    expect(screen.getByText("Queued")).toBeInTheDocument();
  });
});
