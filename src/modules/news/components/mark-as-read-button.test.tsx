import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MarkAsReadButton } from "./mark-as-read-button";

vi.mock("../actions", () => ({
  markNewsAsRead: vi.fn().mockResolvedValue({ success: true }),
}));

describe("MarkAsReadButton", () => {
  it("renders nothing when newCount is 0", () => {
    const { container } = render(<MarkAsReadButton newCount={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders button with correct text for 1 item", () => {
    render(<MarkAsReadButton newCount={1} />);
    expect(screen.getByRole("button", { name: /mark 1 as read/i })).toBeDefined();
  });

  it("renders button with correct text for multiple items", () => {
    render(<MarkAsReadButton newCount={5} />);
    expect(screen.getByRole("button", { name: /mark 5 as read/i })).toBeDefined();
  });

  it("calls markNewsAsRead when clicked", async () => {
    const { markNewsAsRead } = await import("../actions");
    render(<MarkAsReadButton newCount={3} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(markNewsAsRead).toHaveBeenCalled();
  });
});
