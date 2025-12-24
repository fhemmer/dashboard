import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutoMarkAsRead } from "./auto-mark-as-read";

vi.mock("../actions", () => ({
  markNewsAsRead: vi.fn().mockResolvedValue({ success: true }),
}));

describe("AutoMarkAsRead", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("does not call markNewsAsRead when newCount is 0", async () => {
    const { markNewsAsRead } = await import("../actions");
    render(<AutoMarkAsRead newCount={0} />);

    vi.advanceTimersByTime(10000);

    expect(markNewsAsRead).not.toHaveBeenCalled();
  });

  it("calls markNewsAsRead after delay when newCount > 0", async () => {
    const { markNewsAsRead } = await import("../actions");
    render(<AutoMarkAsRead newCount={5} delayMs={5000} />);

    expect(markNewsAsRead).not.toHaveBeenCalled();

    vi.advanceTimersByTime(5000);

    expect(markNewsAsRead).toHaveBeenCalledTimes(1);
  });

  it("uses default delay of 5000ms", async () => {
    const { markNewsAsRead } = await import("../actions");
    render(<AutoMarkAsRead newCount={3} />);

    vi.advanceTimersByTime(4999);
    expect(markNewsAsRead).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(markNewsAsRead).toHaveBeenCalledTimes(1);
  });

  it("only calls markNewsAsRead once", async () => {
    const { markNewsAsRead } = await import("../actions");
    const { rerender } = render(<AutoMarkAsRead newCount={5} delayMs={1000} />);

    vi.advanceTimersByTime(1000);
    expect(markNewsAsRead).toHaveBeenCalledTimes(1);

    rerender(<AutoMarkAsRead newCount={5} delayMs={1000} />);
    vi.advanceTimersByTime(1000);

    expect(markNewsAsRead).toHaveBeenCalledTimes(1);
  });

  it("clears timer on unmount", async () => {
    const { markNewsAsRead } = await import("../actions");
    const { unmount } = render(<AutoMarkAsRead newCount={5} delayMs={5000} />);

    vi.advanceTimersByTime(2000);
    unmount();
    vi.advanceTimersByTime(5000);

    expect(markNewsAsRead).not.toHaveBeenCalled();
  });

  it("renders nothing visible", () => {
    const { container } = render(<AutoMarkAsRead newCount={5} />);
    expect(container.firstChild).toBeNull();
  });
});
