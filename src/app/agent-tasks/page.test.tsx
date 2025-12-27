import type { AgentRunStatus } from "@/modules/agent-tasks";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AgentTasksPage from "./page";

// Mock the agent-tasks actions
vi.mock("@/modules/agent-tasks/actions", () => ({
  getAgentRuns: vi.fn(),
}));

// Mock Next.js Link component
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { getAgentRuns } from "@/modules/agent-tasks/actions";

const mockGetAgentRuns = vi.mocked(getAgentRuns);

function createMockRun(overrides: Partial<{
  id: string;
  prompt: string;
  status: AgentRunStatus;
  model: string;
  createdAt: Date;
  completedAt: Date | null;
  inputTokens: number;
  outputTokens: number;
}> = {}) {
  return {
    id: overrides.id ?? "run-1",
    prompt: overrides.prompt ?? "Test prompt",
    status: overrides.status ?? "completed" as AgentRunStatus,
    model: overrides.model ?? "openrouter/anthropic/claude-3",
    createdAt: overrides.createdAt ?? new Date("2024-01-01T10:00:00Z"),
    completedAt: overrides.completedAt ?? new Date("2024-01-01T10:05:00Z"),
    inputTokens: overrides.inputTokens ?? 100,
    outputTokens: overrides.outputTokens ?? 200,
    result: null,
    userId: "user-1",
    systemPrompt: null,
    error: null,
  };
}

describe("AgentTasksPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the page header", async () => {
    mockGetAgentRuns.mockResolvedValue({ runs: [], error: undefined });

    const Component = await AgentTasksPage();
    render(Component);

    expect(screen.getByRole("heading", { level: 1, name: /agent tasks/i })).toBeInTheDocument();
    expect(screen.getByText(/background ai task execution/i)).toBeInTheDocument();
  });

  it("renders empty state when no runs exist", async () => {
    mockGetAgentRuns.mockResolvedValue({ runs: [], error: undefined });

    const Component = await AgentTasksPage();
    render(Component);

    expect(screen.getByText(/no agent tasks yet/i)).toBeInTheDocument();
    expect(screen.getByText(/queue a background task/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /run task/i })).toHaveAttribute("href", "/agent-tasks/new");
  });

  it("renders error message when there is an error", async () => {
    mockGetAgentRuns.mockResolvedValue({ runs: [], error: "Failed to fetch runs" });

    const Component = await AgentTasksPage();
    render(Component);

    expect(screen.getByText("Failed to fetch runs")).toBeInTheDocument();
  });

  it("renders list of runs", async () => {
    const runs = [
      createMockRun({ id: "run-1", prompt: "First task" }),
      createMockRun({ id: "run-2", prompt: "Second task", status: "running" }),
    ];
    mockGetAgentRuns.mockResolvedValue({ runs, error: undefined });

    const Component = await AgentTasksPage();
    render(Component);

    expect(screen.getByText("First task")).toBeInTheDocument();
    expect(screen.getByText("Second task")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
  });

  it("truncates long prompts", async () => {
    const longPrompt = "A".repeat(150);
    const runs = [createMockRun({ prompt: longPrompt })];
    mockGetAgentRuns.mockResolvedValue({ runs, error: undefined });

    const Component = await AgentTasksPage();
    render(Component);

    // The prompt should be truncated to 100 chars + "..."
    expect(screen.getByText((content) => {
      return content.includes("A".repeat(100)) && content.includes("...");
    })).toBeInTheDocument();
  });

  it("calculates and displays total cost for completed runs", async () => {
    const runs = [
      createMockRun({ status: "completed", inputTokens: 1000, outputTokens: 2000 }),
      createMockRun({ id: "run-2", status: "running" }), // Should not be included in total
    ];
    mockGetAgentRuns.mockResolvedValue({ runs, error: undefined });

    const Component = await AgentTasksPage();
    render(Component);

    // Total cost should be displayed (only completed runs count)
    expect(screen.getByText(/total cost:/i)).toBeInTheDocument();
  });

  it("renders new task button with correct link", async () => {
    mockGetAgentRuns.mockResolvedValue({ runs: [], error: undefined });

    const Component = await AgentTasksPage();
    render(Component);

    const newTaskButton = screen.getByRole("link", { name: /new task/i });
    expect(newTaskButton).toHaveAttribute("href", "/agent-tasks/new");
  });

  it("displays model name from path", async () => {
    const runs = [createMockRun({ model: "openrouter/anthropic/claude-3.5-sonnet" })];
    mockGetAgentRuns.mockResolvedValue({ runs, error: undefined });

    const Component = await AgentTasksPage();
    render(Component);

    // Model name should show only the last part
    expect(screen.getByText(/claude-3.5-sonnet/)).toBeInTheDocument();
  });

  it("renders links to individual run pages", async () => {
    const runs = [createMockRun({ id: "abc-123" })];
    mockGetAgentRuns.mockResolvedValue({ runs, error: undefined });

    const Component = await AgentTasksPage();
    render(Component);

    const runLink = screen.getByRole("link", { name: /test prompt/i });
    expect(runLink).toHaveAttribute("href", "/agent-tasks/abc-123");
  });

  it("renders correct badge variant for different statuses", async () => {
    const runs = [
      createMockRun({ id: "run-1", prompt: "Completed task", status: "completed" }),
      createMockRun({ id: "run-2", prompt: "Failed task", status: "failed" }),
      createMockRun({ id: "run-3", prompt: "Queued task", status: "queued" }),
    ];
    mockGetAgentRuns.mockResolvedValue({ runs, error: undefined });

    const Component = await AgentTasksPage();
    render(Component);

    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Queued")).toBeInTheDocument();
  });
});
