import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Timer } from "../types";
import { TimerCard } from "./timer-card";

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

    render(<TimerCard timer={baseTimer} />);

    const startButton = screen.getByText("Start");
    await userEvent.click(startButton);

    expect(mockStartTimer).toHaveBeenCalledWith("timer-1");
  });

  it("calls pauseTimer when Pause button clicked", async () => {
    mockPauseTimer.mockResolvedValue({ success: true });
    const runningTimer = {
      ...baseTimer,
      state: "running" as const,
      endTime: new Date(Date.now() + 300000),
    };

    render(<TimerCard timer={runningTimer} />);

    const pauseButton = screen.getByText("Pause");
    await userEvent.click(pauseButton);

    expect(mockPauseTimer).toHaveBeenCalled();
  });

  it("calls resetTimer when Reset button clicked", async () => {
    mockResetTimer.mockResolvedValue({ success: true });

    render(<TimerCard timer={baseTimer} />);

    const resetButton = screen.getByText("Reset");
    await userEvent.click(resetButton);

    expect(mockResetTimer).toHaveBeenCalledWith("timer-1");
  });

  it("calls deleteTimer when delete button clicked and confirmed", async () => {
    mockDeleteTimer.mockResolvedValue({ success: true });

    render(<TimerCard timer={baseTimer} />);

    const deleteButton = screen.getByRole("button", { name: /delete timer/i });
    await userEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteTimer).toHaveBeenCalledWith("timer-1");
  });

  it("has accessible label on delete button", () => {
    render(<TimerCard timer={baseTimer} />);

    const deleteButton = screen.getByRole("button", { name: "Delete timer Test Timer" });
    expect(deleteButton).toBeInTheDocument();
  });

  it("does not delete when confirmation cancelled", async () => {
    window.confirm = vi.fn(() => false);

    render(<TimerCard timer={baseTimer} />);

    const deleteButton = screen.getByRole("button", { name: /delete timer/i });
    await userEvent.click(deleteButton);

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

  it("does not apply completion color when enableCompletionColor is false", () => {
    const completedTimer = {
      ...baseTimer,
      remainingSeconds: 0,
      enableCompletionColor: false,
      completionColor: "#FF0000",
    };

    const { container } = render(<TimerCard timer={completedTimer} />);

    const card = container.firstChild as HTMLElement;
    expect(card.style.borderColor).toBe("");
  });

  it("syncs with prop changes", () => {
    const { rerender } = render(<TimerCard timer={baseTimer} />);

    expect(screen.getByText("5:00")).toBeInTheDocument();

    const updatedTimer = { ...baseTimer, remainingSeconds: 120 };
    rerender(<TimerCard timer={updatedTimer} />);

    expect(screen.getByText("2:00")).toBeInTheDocument();
  });

  it("re-enables delete button after deletion fails", async () => {
    // Use mockImplementation instead of mockRejectedValue to avoid unhandled rejection warning
    mockDeleteTimer.mockImplementation(() => Promise.reject(new Error("Delete failed")));

    render(<TimerCard timer={baseTimer} />);

    const deleteButton = screen.getByRole("button", { name: /delete timer/i });
    expect(deleteButton).not.toBeDisabled();

    await userEvent.click(deleteButton);

    await waitFor(() => {
      expect(deleteButton).not.toBeDisabled();
    });
  });

  describe("countdown timer", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("counts down when timer is running", () => {
      const runningTimer = {
        ...baseTimer,
        state: "running" as const,
        remainingSeconds: 5,
        endTime: new Date(Date.now() + 5000),
      };

      render(<TimerCard timer={runningTimer} />);

      expect(screen.getByText("0:05")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText("0:04")).toBeInTheDocument();
    });

    it("dispatches timer-complete event when countdown reaches zero", () => {
      const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
      const onUpdate = vi.fn();
      const runningTimer = {
        ...baseTimer,
        state: "running" as const,
        remainingSeconds: 1,
        endTime: new Date(Date.now() + 1000),
      };

      render(<TimerCard timer={runningTimer} onUpdate={onUpdate} />);

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "timer-complete",
        })
      );

      dispatchEventSpy.mockRestore();
    });

    it("clears interval when timer completes", () => {
      const runningTimer = {
        ...baseTimer,
        state: "running" as const,
        remainingSeconds: 2,
        endTime: new Date(Date.now() + 2000),
      };

      render(<TimerCard timer={runningTimer} />);

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText("0:00")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByText("0:00")).toBeInTheDocument();
    });

    it("clears interval on unmount", () => {
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");
      const runningTimer = {
        ...baseTimer,
        state: "running" as const,
        remainingSeconds: 60,
        endTime: new Date(Date.now() + 60000),
      };

      const { unmount } = render(<TimerCard timer={runningTimer} />);
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it("does not start interval for stopped timer", () => {
      const setIntervalSpy = vi.spyOn(global, "setInterval");

      render(<TimerCard timer={baseTimer} />);

      const timerCalls = setIntervalSpy.mock.calls.filter(
        call => call[1] === 1000
      );
      expect(timerCalls.length).toBe(0);

      setIntervalSpy.mockRestore();
    });
  });
});
