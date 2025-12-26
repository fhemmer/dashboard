import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders loading state initially", () => {
    mockGetTimers.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<TimerWidget />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders empty state when no timers", async () => {
    mockGetTimers.mockResolvedValue({ timers: [], error: undefined });

    render(<TimerWidget />);

    await waitFor(() => {
      expect(screen.getByText("No timers configured")).toBeInTheDocument();
    });

    expect(screen.getByText("Timers")).toBeInTheDocument();
    expect(screen.getByText("Create Timer")).toBeInTheDocument();
  });

  it("renders error state", async () => {
    mockGetTimers.mockResolvedValue({
      timers: [],
      error: "Failed to load timers",
    });

    render(<TimerWidget />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load timers")).toBeInTheDocument();
    });
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

    render(<TimerWidget />);

    await waitFor(() => {
      expect(screen.getByText("Timer 1")).toBeInTheDocument();
    });

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Timer 2")).toBeInTheDocument();
  });

  it("renders running timer with countdown", async () => {
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

    render(<TimerWidget />);

    await waitFor(() => {
      expect(screen.getByText("Work Timer")).toBeInTheDocument();
    });

    expect(screen.getByText("5:00")).toBeInTheDocument();
  });

  it("renders view all link", async () => {
    mockGetTimers.mockResolvedValue({ timers: [], error: undefined });

    const { container } = render(<TimerWidget />);

    await waitFor(() => {
      expect(screen.getByText("No timers configured")).toBeInTheDocument();
    });

    const links = container.querySelectorAll('a[href="/timers"]');
    expect(links.length).toBeGreaterThan(0);
  });

  it("sorts timers by state priority (running > paused > stopped > completed)", async () => {
    mockGetTimers.mockResolvedValue({
      timers: [
        {
          id: "timer-stopped",
          userId: "user-1",
          name: "Stopped Timer",
          durationSeconds: 300,
          remainingSeconds: 300,
          state: "stopped",
          endTime: null,
          enableCompletionColor: false,
          completionColor: "#4CAF50",
          enableAlarm: true,
          alarmSound: "default",
          displayOrder: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "timer-running",
          userId: "user-1",
          name: "Running Timer",
          durationSeconds: 600,
          remainingSeconds: 200,
          state: "running",
          endTime: new Date(Date.now() + 200000),
          enableCompletionColor: false,
          completionColor: "#4CAF50",
          enableAlarm: true,
          alarmSound: "default",
          displayOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "timer-paused",
          userId: "user-1",
          name: "Paused Timer",
          durationSeconds: 900,
          remainingSeconds: 450,
          state: "paused",
          endTime: null,
          enableCompletionColor: false,
          completionColor: "#4CAF50",
          enableAlarm: true,
          alarmSound: "default",
          displayOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      error: undefined,
    });

    render(<TimerWidget />);

    await waitFor(() => {
      expect(screen.getByText("Running Timer")).toBeInTheDocument();
    });

    const timerNames = screen.getAllByText(/Timer$/).map((el) => el.textContent);
    expect(timerNames).toEqual(["Running Timer", "Paused Timer", "Stopped Timer"]);
  });

  it("shows +N more when more than 4 timers", async () => {
    mockGetTimers.mockResolvedValue({
      timers: Array.from({ length: 6 }, (_, i) => ({
        id: `timer-${i}`,
        userId: "user-1",
        name: `Timer ${i + 1}`,
        durationSeconds: 300,
        remainingSeconds: 300,
        state: "stopped" as const,
        endTime: null,
        enableCompletionColor: false,
        completionColor: "#4CAF50",
        enableAlarm: true,
        alarmSound: "default",
        displayOrder: i,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      error: undefined,
    });

    render(<TimerWidget />);

    await waitFor(() => {
      expect(screen.getByText("+2 more timers")).toBeInTheDocument();
    });
  });

  it("shows completed timer with strikethrough styling", async () => {
    mockGetTimers.mockResolvedValue({
      timers: [
        {
          id: "timer-completed",
          userId: "user-1",
          name: "Done Timer",
          durationSeconds: 300,
          remainingSeconds: 0,
          state: "completed",
          endTime: null,
          enableCompletionColor: false,
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

    render(<TimerWidget />);

    await waitFor(() => {
      expect(screen.getByText("Done Timer")).toBeInTheDocument();
    });

    const timerName = screen.getByText("Done Timer");
    expect(timerName).toHaveClass("line-through");
  });

  it("decrements running timer every second", async () => {
    vi.useFakeTimers();
    mockGetTimers.mockResolvedValue({
      timers: [
        {
          id: "timer-1",
          userId: "user-1",
          name: "Countdown",
          durationSeconds: 300,
          remainingSeconds: 65,
          state: "running",
          endTime: new Date(Date.now() + 65000),
          enableCompletionColor: false,
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

    render(<TimerWidget />);

    // Wait for initial load
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("1:05")).toBeInTheDocument();

    // Advance by 1 second (only the countdown interval, not the 30s refresh)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText("1:04")).toBeInTheDocument();
  });
});
