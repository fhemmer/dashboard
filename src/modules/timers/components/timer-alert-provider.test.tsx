import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Timer } from "../types";
import { TimerAlertProvider } from "./timer-alert-provider";

// Track mocks at module level
let mockCreateOscillator: ReturnType<typeof vi.fn>;
let mockCreateGain: ReturnType<typeof vi.fn>;
let mockClose: ReturnType<typeof vi.fn>;
let mockOscillator: {
  connect: ReturnType<typeof vi.fn>;
  frequency: { value: number };
  type: string;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
};
let mockGainNode: {
  connect: ReturnType<typeof vi.fn>;
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    linearRampToValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
};

// Define MockAudioContext at module level so it's available for all tests
class MockAudioContextClass {
  createOscillator: ReturnType<typeof vi.fn>;
  createGain: ReturnType<typeof vi.fn>;
  destination = {};
  currentTime = 0;
  state = "running";
  close: ReturnType<typeof vi.fn>;

  constructor() {
    this.createOscillator = mockCreateOscillator;
    this.createGain = mockCreateGain;
    this.close = mockClose;
  }
}

describe("TimerAlertProvider", () => {
  const mockTimer: Timer = {
    id: "timer-1",
    userId: "user-1",
    name: "Test Timer",
    durationSeconds: 300,
    remainingSeconds: 0,
    state: "completed",
    endTime: null,
    enableCompletionColor: true,
    completionColor: "#4CAF50",
    enableAlarm: true,
    alarmSound: "default",
    displayOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let originalNotification: typeof globalThis.Notification;
  let originalAudioContext: typeof globalThis.AudioContext;
  let mockRequestPermission: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock functions
    mockOscillator = {
      connect: vi.fn(),
      frequency: { value: 0 },
      type: "sine",
      start: vi.fn(),
      stop: vi.fn(),
    };
    mockGainNode = {
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
    };
    mockCreateOscillator = vi.fn(() => mockOscillator);
    mockCreateGain = vi.fn(() => mockGainNode);
    mockClose = vi.fn().mockResolvedValue(undefined);

    // Store originals
    originalNotification = globalThis.Notification;
    originalAudioContext = globalThis.AudioContext;

    // Mock Notification API
    mockRequestPermission = vi.fn().mockResolvedValue("granted");
    const NotificationMock = vi.fn() as unknown as typeof Notification;
    Object.defineProperty(NotificationMock, "permission", {
      value: "default",
      configurable: true,
      writable: true,
    });
    Object.defineProperty(NotificationMock, "requestPermission", {
      value: mockRequestPermission,
      configurable: true,
      writable: true,
    });
    globalThis.Notification = NotificationMock;

    // Mock AudioContext using the module-level class
    globalThis.AudioContext = MockAudioContextClass as unknown as typeof AudioContext;
    // Also mock on window for components that check window.AudioContext
    if (typeof window !== "undefined") {
      (window as unknown as { AudioContext: typeof AudioContext }).AudioContext = MockAudioContextClass as unknown as typeof AudioContext;
    }
  });

  afterEach(() => {
    // Restore originals
    globalThis.Notification = originalNotification;
    globalThis.AudioContext = originalAudioContext;
    if (typeof window !== "undefined") {
      (window as unknown as { AudioContext: typeof AudioContext }).AudioContext = originalAudioContext;
    }
  });

  it("renders notification permission prompt when permission is default", () => {
    render(<TimerAlertProvider />);

    expect(screen.getByText("Enable Notifications")).toBeInTheDocument();
    expect(screen.getByText("Get notified when your timers complete")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument();
  });

  it("requests notification permission when Enable button is clicked", async () => {
    const user = userEvent.setup();
    render(<TimerAlertProvider />);

    const enableButton = screen.getByRole("button", { name: "Enable" });
    await user.click(enableButton);

    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it("renders enabled status when notification permission is granted", async () => {
    Object.defineProperty(globalThis.Notification, "permission", {
      value: "granted",
      configurable: true,
    });

    // Ensure AudioContext mock is set (may be cleared by other tests)
    globalThis.AudioContext = MockAudioContextClass as unknown as typeof AudioContext;

    render(<TimerAlertProvider />);

    // Wait for the async permission check via setTimeout
    await waitFor(() => {
      expect(screen.getByText("Notifications Enabled")).toBeInTheDocument();
      expect(screen.getByText("You'll be notified when timers complete")).toBeInTheDocument();
    });
  });

  it("renders blocked status when notification permission is denied", async () => {
    Object.defineProperty(globalThis.Notification, "permission", {
      value: "denied",
      configurable: true,
    });

    // Ensure AudioContext mock is set (may be cleared by other tests)
    globalThis.AudioContext = MockAudioContextClass as unknown as typeof AudioContext;

    render(<TimerAlertProvider />);

    // Wait for the async permission check via setTimeout
    await waitFor(() => {
      expect(screen.getByText("Notifications Blocked")).toBeInTheDocument();
      expect(screen.getByText("Enable notifications in your browser settings to receive alerts")).toBeInTheDocument();
    });
  });

  it("plays alarm sound when timer-complete event is dispatched with enableAlarm", async () => {
    // Ensure AudioContext mock is set (may be cleared by other tests)
    globalThis.AudioContext = MockAudioContextClass as unknown as typeof AudioContext;

    Object.defineProperty(globalThis.Notification, "permission", {
      value: "granted",
      configurable: true,
    });

    render(<TimerAlertProvider />);

    // Wait for permission state to update
    await waitFor(() => {
      expect(screen.queryByText("Enable Notifications")).not.toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("timer-complete", {
          detail: { timer: mockTimer },
        })
      );
    });

    // Verify oscillator was created for beep sound (3 times for 3 beeps)
    expect(mockCreateOscillator).toHaveBeenCalledTimes(3);
    expect(mockCreateGain).toHaveBeenCalledTimes(3);
    expect(mockOscillator.start).toHaveBeenCalledTimes(3);
    expect(mockOscillator.stop).toHaveBeenCalledTimes(3);
  });

  it("does not play alarm sound when enableAlarm is false", async () => {
    // Ensure AudioContext mock is set (may be cleared by other tests)
    globalThis.AudioContext = MockAudioContextClass as unknown as typeof AudioContext;

    Object.defineProperty(globalThis.Notification, "permission", {
      value: "granted",
      configurable: true,
    });

    render(<TimerAlertProvider />);

    // Wait for permission state to update
    await waitFor(() => {
      expect(screen.queryByText("Enable Notifications")).not.toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("timer-complete", {
          detail: { timer: { ...mockTimer, enableAlarm: false } },
        })
      );
    });

    expect(mockCreateOscillator).not.toHaveBeenCalled();
  });

  it("shows browser notification when permission is granted", async () => {
    // Ensure AudioContext mock is set (may be cleared by other tests)
    globalThis.AudioContext = MockAudioContextClass as unknown as typeof AudioContext;

    Object.defineProperty(globalThis.Notification, "permission", {
      value: "granted",
      configurable: true,
    });

    render(<TimerAlertProvider />);

    // Wait for permission state to update and effect to re-register listener
    await waitFor(() => {
      expect(screen.queryByText("Enable Notifications")).not.toBeInTheDocument();
    });

    // Give React time to complete the effect re-run with new permission state
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("timer-complete", {
          detail: { timer: mockTimer },
        })
      );
    });

    expect(globalThis.Notification).toHaveBeenCalledWith(
      "Timer Complete: Test Timer",
      expect.objectContaining({
        body: "Your timer has finished!",
        tag: "timer-timer-1",
      })
    );
  });

  it("shows browser notification even when audio is disabled", async () => {
    // Ensure AudioContext mock is set (may be cleared by other tests)
    globalThis.AudioContext = MockAudioContextClass as unknown as typeof AudioContext;

    Object.defineProperty(globalThis.Notification, "permission", {
      value: "granted",
      configurable: true,
    });

    render(<TimerAlertProvider />);

    // Wait for permission state to update and effect to re-register listener
    await waitFor(() => {
      expect(screen.queryByText("Enable Notifications")).not.toBeInTheDocument();
    });

    // Give React time to complete the effect re-run with new permission state
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("timer-complete", {
          detail: { timer: { ...mockTimer, enableAlarm: false } },
        })
      );
    });

    // Browser notification should still show
    expect(globalThis.Notification).toHaveBeenCalledWith(
      "Timer Complete: Test Timer",
      expect.objectContaining({
        body: "Your timer has finished!",
      })
    );
    // But audio should not play
    expect(mockCreateOscillator).not.toHaveBeenCalled();
  });

  it("does not show browser notification when permission is denied", async () => {
    Object.defineProperty(globalThis.Notification, "permission", {
      value: "denied",
      configurable: true,
    });

    render(<TimerAlertProvider />);

    // Wait for permission state to update
    await waitFor(() => {
      expect(screen.queryByText("Enable Notifications")).not.toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("timer-complete", {
          detail: { timer: mockTimer },
        })
      );
    });

    expect(globalThis.Notification).not.toHaveBeenCalled();
  });

  it("cleans up event listener and AudioContext on unmount", async () => {
    // Ensure AudioContext mock is set (may be cleared by other tests)
    globalThis.AudioContext = MockAudioContextClass as unknown as typeof AudioContext;

    Object.defineProperty(globalThis.Notification, "permission", {
      value: "granted",
      configurable: true,
    });

    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(<TimerAlertProvider />);

    // Wait for permission state to update
    await waitFor(() => {
      expect(screen.queryByText("Enable Notifications")).not.toBeInTheDocument();
    });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "timer-complete",
      expect.any(Function)
    );
    expect(mockClose).toHaveBeenCalled();

    removeEventListenerSpy.mockRestore();
  });

  it("handles AudioContext close errors gracefully", async () => {
    // Ensure AudioContext mock is set (may be cleared by other tests)
    globalThis.AudioContext = MockAudioContextClass as unknown as typeof AudioContext;

    Object.defineProperty(globalThis.Notification, "permission", {
      value: "granted",
      configurable: true,
    });

    mockClose.mockRejectedValueOnce(new Error("Close error"));

    const { unmount } = render(<TimerAlertProvider />);

    // Wait for permission state to update
    await waitFor(() => {
      expect(screen.queryByText("Enable Notifications")).not.toBeInTheDocument();
    });

    // Should not throw
    expect(() => unmount()).not.toThrow();
  });

  it("handles error in playAlarmSound gracefully", async () => {
    // Ensure AudioContext mock is set (may be removed by parallel tests)
    globalThis.AudioContext = MockAudioContextClass as unknown as typeof AudioContext;
    
    Object.defineProperty(globalThis.Notification, "permission", {
      value: "granted",
      configurable: true,
    });

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    // Make createOscillator throw
    mockCreateOscillator.mockImplementation(() => {
      throw new Error("Audio error");
    });

    render(<TimerAlertProvider />);

    // Wait for permission state to update
    await waitFor(() => {
      expect(screen.queryByText("Enable Notifications")).not.toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent("timer-complete", {
          detail: { timer: mockTimer },
        })
      );
    });

    expect(consoleError).toHaveBeenCalledWith(
      "Error playing alarm sound:",
      expect.any(Error)
    );

    consoleError.mockRestore();
  });

  it("handles missing AudioContext gracefully", async () => {
    Object.defineProperty(globalThis.Notification, "permission", {
      value: "granted",
      configurable: true,
    });

    // Remove AudioContext
    const savedAudioContext = globalThis.AudioContext;
    // @ts-expect-error - Intentionally removing for test
    delete globalThis.AudioContext;

    render(<TimerAlertProvider />);

    // Wait for permission state to update
    await waitFor(() => {
      expect(screen.getByText("Notifications Enabled")).toBeInTheDocument();
    });

    // Should not throw when timer-complete is dispatched
    act(() => {
      window.dispatchEvent(
        new CustomEvent("timer-complete", {
          detail: { timer: mockTimer },
        })
      );
    });

    // Restore
    globalThis.AudioContext = savedAudioContext;
  });

  it("handles missing Notification API gracefully", async () => {
    // Remove Notification API
    const savedNotification = globalThis.Notification;
    // @ts-expect-error - Intentionally removing for test
    delete globalThis.Notification;

    render(<TimerAlertProvider />);

    // Should show permission prompt because permission stays at default
    await waitFor(() => {
      expect(screen.getByText("Enable Notifications")).toBeInTheDocument();
    });

    // Restore
    globalThis.Notification = savedNotification;
  });

  it("handles requestPermission when Notification API is missing", async () => {
    // Start with Notification API present to render the prompt
    render(<TimerAlertProvider />);

    expect(screen.getByText("Enable Notifications")).toBeInTheDocument();

    // Remove Notification before clicking
    const savedNotification = globalThis.Notification;
    // @ts-expect-error - Intentionally removing for test
    delete globalThis.Notification;

    const user = userEvent.setup();
    const enableButton = screen.getByRole("button", { name: "Enable" });

    // Should not throw when clicking without Notification API
    await user.click(enableButton);

    // Restore
    globalThis.Notification = savedNotification;
  });
});
