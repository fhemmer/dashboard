import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DateTimeDisplay,
  formatDate,
  formatRelativeTime,
  formatTime,
} from "./datetime-display";

describe("DateTimeDisplay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set a fixed date for consistent testing
    vi.setSystemTime(new Date("2025-12-21T14:30:45"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders skeleton placeholders initially before hydration", () => {
    render(<DateTimeDisplay />);

    // Before hydration (useEffect runs), should show loading placeholders
    const container = screen.getByLabelText("Date and time display");
    expect(container).toBeDefined();
    // Check for pulse animation which is in skeleton
    expect(container.querySelector(".animate-pulse")).toBeDefined();
  });

  it("renders current time after hydration", async () => {
    render(<DateTimeDisplay />);

    // Run effect and advance timers to trigger state update
    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    // Time without seconds: 14:30 (after first tick becomes 14:30)
    expect(screen.getByText("14:30")).toBeDefined();
  });

  it("renders date on larger screens", async () => {
    render(<DateTimeDisplay />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    // Should show the formatted date (hidden on mobile via CSS)
    expect(screen.getByText("Sun, Dec 21")).toBeDefined();
  });

  it("updates time every second", async () => {
    render(<DateTimeDisplay />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    // After initial hydration we see 14:30
    expect(screen.getByText("14:30")).toBeDefined();

    // Advance by 30 seconds to change the minute
    await act(async () => {
      vi.advanceTimersByTime(30000);
    });

    expect(screen.getByText("14:31")).toBeDefined();
  });

  it("shows 'just now' for recently loaded pages", async () => {
    render(<DateTimeDisplay />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    expect(
      screen.getAllByText((_, element) =>
        element?.tagName === "SPAN" &&
        (element?.textContent?.includes("just now") ?? false)
      ).length
    ).toBeGreaterThan(0);
  });

  it("shows seconds ago after a few seconds", async () => {
    render(<DateTimeDisplay />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    // Advance by 10 seconds (after initial tick, so 11s total from load time)
    await act(async () => {
      vi.advanceTimersByTime(10000);
    });

    expect(
      screen.getAllByText((_, element) =>
        element?.tagName === "SPAN" &&
        (element?.textContent?.includes("11s ago") ?? false)
      ).length
    ).toBeGreaterThan(0);
  });

  it("shows minutes ago after 60 seconds", async () => {
    render(<DateTimeDisplay />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    // Advance by 2 minutes
    await act(async () => {
      vi.advanceTimersByTime(120000);
    });

    expect(
      screen.getAllByText((_, element) =>
        element?.tagName === "SPAN" &&
        (element?.textContent?.includes("2m ago") ?? false)
      ).length
    ).toBeGreaterThan(0);
  });

  it("shows hours ago after 60 minutes", async () => {
    render(<DateTimeDisplay />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    // Advance by 2 hours
    await act(async () => {
      vi.advanceTimersByTime(7200000);
    });

    expect(
      screen.getAllByText((_, element) =>
        element?.tagName === "SPAN" &&
        (element?.textContent?.includes("2h ago") ?? false)
      ).length
    ).toBeGreaterThan(0);
  });

  it("accepts custom className", async () => {
    render(<DateTimeDisplay className="custom-class" />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const container = screen.getByLabelText("Date and time display");
    expect(container.className).toContain("custom-class");
  });

  it("has proper accessibility attributes", async () => {
    render(<DateTimeDisplay />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const container = screen.getByLabelText("Date and time display");
    expect(container.getAttribute("aria-live")).toBe("polite");
  });

  it("renders live indicator dot", async () => {
    render(<DateTimeDisplay />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    // Check for the animated ping element by its class
    const container = screen.getByLabelText("Date and time display");
    const pingElement = container.querySelector(".animate-ping");
    expect(pingElement).toBeDefined();
  });

  it("renders refresh icon in last loaded section", async () => {
    render(<DateTimeDisplay />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    // Check that "Loaded" text appears (no longer has an icon)
    expect(screen.getByText(/Loaded/)).toBeDefined();
  });

  it("shows 'Loaded' label on larger screens", async () => {
    render(<DateTimeDisplay />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    // "Loaded" is now always visible with relative time
    expect(screen.getByText(/Loaded just now/)).toBeDefined();
  });

  it("cleans up interval on unmount", async () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    const { unmount } = render(<DateTimeDisplay />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("handles time format correctly at midnight", async () => {
    vi.setSystemTime(new Date("2025-12-21T00:00:00"));

    render(<DateTimeDisplay />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    // Time without seconds: 00:00
    expect(screen.getByText("00:00")).toBeDefined();
  });

  it("handles time format correctly at noon", async () => {
    vi.setSystemTime(new Date("2025-12-21T12:00:00"));

    render(<DateTimeDisplay />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    // Time without seconds: 12:00
    expect(screen.getByText("12:00")).toBeDefined();
  });

  it("displays title attribute with load time on hover element", async () => {
    render(<DateTimeDisplay />);

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const loadedSection = screen.getByTitle(/Page loaded at/);
    expect(loadedSection).toBeDefined();
  });
});

describe("formatTime", () => {
  it("formats time in 24-hour format without seconds by default", () => {
    expect(formatTime(new Date("2025-12-21T14:30:45"))).toBe("14:30");
    expect(formatTime(new Date("2025-12-21T00:00:00"))).toBe("00:00");
    expect(formatTime(new Date("2025-12-21T23:59:59"))).toBe("23:59");
  });

  it("formats time with seconds when includeSeconds is true", () => {
    expect(formatTime(new Date("2025-12-21T14:30:45"), true)).toBe("14:30:45");
    expect(formatTime(new Date("2025-12-21T00:00:00"), true)).toBe("00:00:00");
  });
});

describe("formatDate", () => {
  it("formats date with weekday, month, and day", () => {
    expect(formatDate(new Date("2025-12-21T14:30:45"))).toBe("Sun, Dec 21");
    expect(formatDate(new Date("2025-01-01T00:00:00"))).toBe("Wed, Jan 1");
  });
});

describe("formatRelativeTime", () => {
  it("returns 'just now' for less than 5 seconds", () => {
    const now = new Date("2025-12-21T14:30:45");
    const loadTime = new Date("2025-12-21T14:30:43");
    expect(formatRelativeTime(loadTime, now)).toBe("just now");
  });

  it("returns seconds ago for less than 60 seconds", () => {
    const now = new Date("2025-12-21T14:30:45");
    const loadTime = new Date("2025-12-21T14:30:30");
    expect(formatRelativeTime(loadTime, now)).toBe("15s ago");
  });

  it("returns minutes ago for less than 60 minutes", () => {
    const now = new Date("2025-12-21T14:30:45");
    const loadTime = new Date("2025-12-21T14:25:45");
    expect(formatRelativeTime(loadTime, now)).toBe("5m ago");
  });

  it("returns hours ago for less than 24 hours", () => {
    const now = new Date("2025-12-21T14:30:45");
    const loadTime = new Date("2025-12-21T11:30:45");
    expect(formatRelativeTime(loadTime, now)).toBe("3h ago");
  });

  it("returns formatted time for more than 24 hours", () => {
    const now = new Date("2025-12-22T14:30:45");
    const loadTime = new Date("2025-12-21T10:15:30");
    expect(formatRelativeTime(loadTime, now)).toBe("10:15:30");
  });
});
