import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TimersPage from "./page";

const mockGetTimers = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/modules/timers", () => ({
  getTimers: () => mockGetTimers(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock child components
vi.mock("@/modules/timers/components/create-timer-dialog", () => ({
  CreateTimerDialog: ({ onCreated }: { onCreated?: () => void }) => (
    <button onClick={onCreated} data-testid="create-timer-dialog">
      Create Timer
    </button>
  ),
}));

vi.mock("@/modules/timers/components/timer-alert-provider", () => ({
  TimerAlertProvider: () => <div data-testid="timer-alert-provider" />,
}));

vi.mock("@/modules/timers/components/timer-card", () => ({
  TimerCard: ({ timer, onUpdate }: { timer: { id: string; name: string }; onUpdate?: () => void }) => (
    <div data-testid={`timer-card-${timer.id}`} onClick={onUpdate}>
      {timer.name}
    </div>
  ),
}));

describe("TimersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    // Never resolve the promise to keep loading state
    mockGetTimers.mockReturnValue(new Promise(() => {}));

    render(<TimersPage />);

    expect(screen.getByText("Loading timers...")).toBeInTheDocument();
  });

  it("renders page title and description", async () => {
    mockGetTimers.mockResolvedValue({ timers: [], error: undefined });

    render(<TimersPage />);

    await waitFor(() => {
      expect(screen.queryByText("Loading timers...")).not.toBeInTheDocument();
    });

    expect(screen.getByText("Timers")).toBeInTheDocument();
    expect(
      screen.getByText("Countdown timers with audio and browser notifications")
    ).toBeInTheDocument();
  });

  it("renders empty state when no timers exist", async () => {
    mockGetTimers.mockResolvedValue({ timers: [], error: undefined });

    render(<TimersPage />);

    await waitFor(() => {
      expect(screen.getByText("No timers yet")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Create your first countdown timer/)
    ).toBeInTheDocument();
  });

  it("renders error message when fetch fails", async () => {
    mockGetTimers.mockResolvedValue({ timers: [], error: "Database error" });

    render(<TimersPage />);

    await waitFor(() => {
      expect(screen.getByText("Database error")).toBeInTheDocument();
    });
  });

  it("renders timer cards for existing timers", async () => {
    const mockTimers = [
      {
        id: "timer-1",
        userId: "user-1",
        name: "Work Timer",
        durationSeconds: 1500,
        remainingSeconds: 1500,
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
        name: "Break Timer",
        durationSeconds: 300,
        remainingSeconds: 300,
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
    ];

    mockGetTimers.mockResolvedValue({ timers: mockTimers, error: undefined });

    render(<TimersPage />);

    await waitFor(() => {
      expect(screen.getByTestId("timer-card-timer-1")).toBeInTheDocument();
    });

    expect(screen.getByTestId("timer-card-timer-2")).toBeInTheDocument();
    expect(screen.getByText("Work Timer")).toBeInTheDocument();
    expect(screen.getByText("Break Timer")).toBeInTheDocument();
  });

  it("renders TimerAlertProvider", async () => {
    mockGetTimers.mockResolvedValue({ timers: [], error: undefined });

    render(<TimersPage />);

    await waitFor(() => {
      expect(screen.getByTestId("timer-alert-provider")).toBeInTheDocument();
    });
  });

  it("renders CreateTimerDialog", async () => {
    mockGetTimers.mockResolvedValue({ timers: [], error: undefined });

    render(<TimersPage />);

    await waitFor(() => {
      expect(screen.getByTestId("create-timer-dialog")).toBeInTheDocument();
    });
  });

  it("does not render empty state when there are timers", async () => {
    const mockTimers = [
      {
        id: "timer-1",
        userId: "user-1",
        name: "Work Timer",
        durationSeconds: 1500,
        remainingSeconds: 1500,
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
    ];

    mockGetTimers.mockResolvedValue({ timers: mockTimers, error: undefined });

    render(<TimersPage />);

    await waitFor(() => {
      expect(screen.getByTestId("timer-card-timer-1")).toBeInTheDocument();
    });

    expect(screen.queryByText("No timers yet")).not.toBeInTheDocument();
  });

  it("refreshes router and reloads timers on update", async () => {
    const mockTimers = [
      {
        id: "timer-1",
        userId: "user-1",
        name: "Work Timer",
        durationSeconds: 1500,
        remainingSeconds: 1500,
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
    ];

    mockGetTimers.mockResolvedValue({ timers: mockTimers, error: undefined });

    render(<TimersPage />);

    await waitFor(() => {
      expect(screen.getByTestId("timer-card-timer-1")).toBeInTheDocument();
    });

    // Reset mock to track new calls
    mockGetTimers.mockClear();
    mockRefresh.mockClear();

    // Click the timer card to trigger onUpdate
    const timerCard = screen.getByTestId("timer-card-timer-1");
    timerCard.click();

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockGetTimers).toHaveBeenCalled();
    });
  });

  it("clears error state on successful reload", async () => {
    // First call fails
    mockGetTimers.mockResolvedValueOnce({ timers: [], error: "Database error" });

    render(<TimersPage />);

    await waitFor(() => {
      expect(screen.getByText("Database error")).toBeInTheDocument();
    });

    // Second call succeeds
    mockGetTimers.mockResolvedValueOnce({ timers: [], error: undefined });

    // Click create button to trigger handleUpdate -> loadTimers
    const createButton = screen.getByTestId("create-timer-dialog");
    createButton.click();

    await waitFor(() => {
      expect(screen.queryByText("Database error")).not.toBeInTheDocument();
    });
  });
});
