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

    // Mock AudioContext - must be a proper constructor function
    // Define it as a proper class that can be instantiated with 'new'
    class MockAudioContext {
      createOscillator = mockCreateOscillator;
      createGain = mockCreateGain;
      destination = {};
      currentTime = 0;
      state = "running";
      close = mockClose;
    }

    // Ensure the mock works with instanceof and is properly constructible
    globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;
  });

  afterEach(() => {
    // Restore originals
    globalThis.Notification = originalNotification;
    globalThis.AudioContext = originalAudioContext;
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

  it("renders nothing when notification permission is granted", async () => {
    Object.defineProperty(globalThis.Notification, "permission", {
      value: "granted",
      configurable: true,
    });

    const { container } = render(<TimerAlertProvider />);

    // Wait for the async permission check via setTimeout
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it("renders nothing when notification permission is denied", async () => {
    Object.defineProperty(globalThis.Notification, "permission", {
      value: "denied",
      configurable: true,
    });

    const { container } = render(<TimerAlertProvider />);

    // Wait for the async permission check via setTimeout
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it("plays alarm sound when timer-complete event is dispatched with enableAlarm", async () => {
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
    // Re-establish AudioContext mock in case it was overwritten by other tests
    class MockAudioContext {
      createOscillator = mockCreateOscillator;
      createGain = mockCreateGain;
      destination = {};
      currentTime = 0;
      state = "running";
      close = mockClose;
    }
    globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;

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
    // Re-establish AudioContext mock in case it was overwritten by other tests
    class MockAudioContext {
      createOscillator = mockCreateOscillator;
      createGain = mockCreateGain;
      destination = {};
      currentTime = 0;
      state = "running";
      close = mockClose;
    }
    globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;

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

    expect(globalThis.Notification).toHaveBeenCalledWith(
      "Timer Complete: Test Timer",
      expect.objectContaining({
        body: "Your timer has finished!",
        tag: "timer-timer-1",
      })
    );
  });

  it("shows browser notification even when audio is disabled", async () => {
    // Re-establish AudioContext mock in case it was overwritten by other tests
    class MockAudioContext {
      createOscillator = mockCreateOscillator;
      createGain = mockCreateGain;
      destination = {};
      currentTime = 0;
      state = "running";
      close = mockClose;
    }
    globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;

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

    const { container } = render(<TimerAlertProvider />);

    // Wait for permission state to update
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
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
});
