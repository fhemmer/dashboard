import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TimerWidget } from "./timers-widget";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockGetTimers = vi.fn();

vi.mock("../actions", () => ({
  getTimers: () => mockGetTimers(),
}));

describe("TimerWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders empty state when no timers", async () => {
    mockGetTimers.mockResolvedValue({ timers: [], error: undefined });

    const component = await TimerWidget();
    const { container } = render(component);

    expect(screen.getByText("Timers")).toBeInTheDocument();
    expect(screen.getByText("No timers configured")).toBeInTheDocument();
    expect(screen.getByText("Create Timer")).toBeInTheDocument();
    expect(container.querySelector('a[href="/timers"]')).toBeInTheDocument();
  });

  it("renders error state", async () => {
    mockGetTimers.mockResolvedValue({
      timers: [],
      error: "Failed to load timers",
    });

    const component = await TimerWidget();
    render(component);

    expect(screen.getByText("Failed to load timers")).toBeInTheDocument();
  });

  it("renders timer count badge", async () => {
    mockGetTimers.mockResolvedValue({
      timers: [
        {
          id: "timer-1",
          userId: "user-1",
          name: "Timer 1",
          durationSeconds: 300,
          remainingSeconds: 300,
          state: "stopped",
          endTime: null,
          enableCompletionColor: true,
          completionColor: "#4CAF50",
          enableAlarm: true,
          alarmSound: "default",
          displayOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "timer-2",
          userId: "user-1",
          name: "Timer 2",
          durationSeconds: 600,
          remainingSeconds: 600,
          state: "stopped",
          endTime: null,
          enableCompletionColor: true,
          completionColor: "#4CAF50",
          enableAlarm: true,
          alarmSound: "default",
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      error: undefined,
    });

    const component = await TimerWidget();
    render(component);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("2 timers ready")).toBeInTheDocument();
  });

  it("renders running timer info", async () => {
    mockGetTimers.mockResolvedValue({
      timers: [
        {
          id: "timer-1",
          userId: "user-1",
          name: "Work Timer",
          durationSeconds: 1500,
          remainingSeconds: 300,
          state: "running",
          endTime: new Date(Date.now() + 300000),
          enableCompletionColor: true,
          completionColor: "#4CAF50",
          enableAlarm: true,
          alarmSound: "default",
          displayOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      error: undefined,
    });

    const component = await TimerWidget();
    render(component);

    expect(screen.getByText("Currently running:")).toBeInTheDocument();
    expect(screen.getByText("Work Timer")).toBeInTheDocument();
    expect(screen.getByText("5:00")).toBeInTheDocument();
    expect(screen.getByText("remaining")).toBeInTheDocument();
  });

  it("renders view all link", async () => {
    mockGetTimers.mockResolvedValue({ timers: [], error: undefined });

    const component = await TimerWidget();
    const { container } = render(component);

    const links = container.querySelectorAll('a[href="/timers"]');
    expect(links.length).toBeGreaterThan(0);
  });
});
