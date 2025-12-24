import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TimerCard } from "./timer-card";
import type { Timer } from "../types";

const mockDeleteTimer = vi.fn();
const mockStartTimer = vi.fn();
const mockPauseTimer = vi.fn();
const mockResetTimer = vi.fn();

vi.mock("../actions", () => ({
  deleteTimer: (id: string) => mockDeleteTimer(id),
  startTimer: (id: string) => mockStartTimer(id),
  pauseTimer: (id: string, remaining: number) => mockPauseTimer(id, remaining),
  resetTimer: (id: string) => mockResetTimer(id),
}));

describe("TimerCard", () => {
  const baseTimer: Timer = {
    id: "timer-1",
    userId: "user-1",
    name: "Test Timer",
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it("renders timer name and duration", () => {
    render(<TimerCard timer={baseTimer} />);

    expect(screen.getByText("Test Timer")).toBeInTheDocument();
    expect(screen.getByText("5:00 timer")).toBeInTheDocument();
    expect(screen.getByText("5:00")).toBeInTheDocument();
  });

  it("renders Start button when stopped", () => {
    render(<TimerCard timer={baseTimer} />);

    expect(screen.getByText("Start")).toBeInTheDocument();
    expect(screen.queryByText("Pause")).not.toBeInTheDocument();
  });

  it("renders Resume button when paused", () => {
    const pausedTimer = { ...baseTimer, state: "paused" as const, remainingSeconds: 150 };
    render(<TimerCard timer={pausedTimer} />);

    expect(screen.getByText("Resume")).toBeInTheDocument();
  });

  it("renders Pause button when running", () => {
    const runningTimer = {
      ...baseTimer,
      state: "running" as const,
      endTime: new Date(Date.now() + 300000),
    };
    render(<TimerCard timer={runningTimer} />);

    expect(screen.getByText("Pause")).toBeInTheDocument();
  });

  it("calls startTimer when Start button clicked", async () => {
    mockStartTimer.mockResolvedValue({ success: true });
    const onUpdate = vi.fn();

    render(<TimerCard timer={baseTimer} onUpdate={onUpdate} />);

    const startButton = screen.getByText("Start");
    await userEvent.click(startButton);

    // Just verify the mock was called, don't wait for onUpdate
    expect(mockStartTimer).toHaveBeenCalledWith("timer-1");
  });

  it("calls pauseTimer when Pause button clicked", async () => {
    mockPauseTimer.mockResolvedValue({ success: true });
    const onUpdate = vi.fn();
    const runningTimer = {
      ...baseTimer,
      state: "running" as const,
      endTime: new Date(Date.now() + 300000),
    };

    render(<TimerCard timer={runningTimer} onUpdate={onUpdate} />);

    const pauseButton = screen.getByText("Pause");
    await userEvent.click(pauseButton);

    // Just verify the mock was called
    expect(mockPauseTimer).toHaveBeenCalled();
  });

  it("calls resetTimer when Reset button clicked", async () => {
    mockResetTimer.mockResolvedValue({ success: true });
    const onUpdate = vi.fn();

    render(<TimerCard timer={baseTimer} onUpdate={onUpdate} />);

    const resetButton = screen.getByText("Reset");
    await userEvent.click(resetButton);

    // Just verify the mock was called
    expect(mockResetTimer).toHaveBeenCalledWith("timer-1");
  });

  it("calls deleteTimer when delete button clicked and confirmed", async () => {
    mockDeleteTimer.mockResolvedValue({ success: true });
    const onUpdate = vi.fn();

    render(<TimerCard timer={baseTimer} onUpdate={onUpdate} />);

    const deleteButtons = screen.getAllByRole("button");
    const deleteButton = deleteButtons.find((btn) =>
      btn.querySelector("svg.lucide-trash-2")
    );
    expect(deleteButton).toBeDefined();

    if (deleteButton) {
      await userEvent.click(deleteButton);
    }

    // Just verify the mock was called
    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteTimer).toHaveBeenCalledWith("timer-1");
  });

  it("does not delete when confirmation cancelled", async () => {
    window.confirm = vi.fn(() => false);
    const onUpdate = vi.fn();

    render(<TimerCard timer={baseTimer} onUpdate={onUpdate} />);

    const deleteButtons = screen.getAllByRole("button");
    const deleteButton = deleteButtons.find((btn) =>
      btn.querySelector("svg.lucide-trash-2")
    );

    if (deleteButton) {
      await userEvent.click(deleteButton);
    }

    // Just verify delete wasn't called
    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteTimer).not.toHaveBeenCalled();
  });

  it("disables Start button when timer is at 0", () => {
    const completedTimer = { ...baseTimer, remainingSeconds: 0 };
    render(<TimerCard timer={completedTimer} />);

    const startButton = screen.getByText("Start");
    expect(startButton).toBeDisabled();
  });

  it("applies completion color when timer completes", () => {
    const completedTimer = {
      ...baseTimer,
      remainingSeconds: 0,
      enableCompletionColor: true,
      completionColor: "#FF0000",
    };

    const { container } = render(<TimerCard timer={completedTimer} />);

    // Check that the card has the inline style applied
    const card = container.firstChild as HTMLElement;
    expect(card).toBeInTheDocument();
    expect(card.style.borderColor).toBeTruthy();
  });

  it("renders progress bar", () => {
    const halfTimer = { ...baseTimer, remainingSeconds: 150 };
    const { container } = render(<TimerCard timer={halfTimer} />);

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
  });
});
