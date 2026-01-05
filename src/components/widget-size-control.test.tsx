import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WidgetSizeControl } from "./widget-size-control";

// Mock the UI components
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <span data-testid="tooltip-content">{children}</span>,
}));

describe("WidgetSizeControl", () => {
  const mockOnSizeChange = vi.fn();

  beforeEach(() => {
    mockOnSizeChange.mockClear();
  });

  it("renders size control buttons", () => {
    render(
      <WidgetSizeControl
        currentWidth={1}
        currentHeight={1}
        minWidth={1}
        minHeight={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    // Should have height and width buttons
    expect(screen.getByRole("button", { name: /cycle height/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /cycle width/i })).toBeDefined();
  });

  it("cycles height when height button is clicked (1 -> 2)", () => {
    render(
      <WidgetSizeControl
        currentWidth={1}
        currentHeight={1}
        minWidth={1}
        minHeight={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    const heightButton = screen.getByRole("button", { name: /cycle height/i });
    fireEvent.click(heightButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(1, 2);
  });

  it("cycles height when height button is clicked (2 -> 3)", () => {
    render(
      <WidgetSizeControl
        currentWidth={1}
        currentHeight={2}
        minWidth={1}
        minHeight={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    const heightButton = screen.getByRole("button", { name: /cycle height/i });
    fireEvent.click(heightButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(1, 3);
  });

  it("cycles height and respects minHeight (wraps from 4 to minHeight)", () => {
    render(
      <WidgetSizeControl
        currentWidth={1}
        currentHeight={4}
        minWidth={1}
        minHeight={2}
        onSizeChange={mockOnSizeChange}
      />
    );

    const heightButton = screen.getByRole("button", { name: /cycle height/i });
    fireEvent.click(heightButton);

    // When cycling from 4, next would be 1, but minHeight is 2
    expect(mockOnSizeChange).toHaveBeenCalledWith(1, 2);
  });

  it("cycles width when width button is clicked (1 -> 2)", () => {
    render(
      <WidgetSizeControl
        currentWidth={1}
        currentHeight={1}
        minWidth={1}
        minHeight={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    const widthButton = screen.getByRole("button", { name: /cycle width/i });
    fireEvent.click(widthButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(2, 1);
  });

  it("cycles width and respects minWidth (wraps from 4 to minWidth)", () => {
    render(
      <WidgetSizeControl
        currentWidth={4}
        currentHeight={1}
        minWidth={2}
        minHeight={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    const widthButton = screen.getByRole("button", { name: /cycle width/i });
    fireEvent.click(widthButton);

    // When cycling from 4, next would be 1, but minWidth is 2
    expect(mockOnSizeChange).toHaveBeenCalledWith(2, 1);
  });

  it("expands to 4x4 when expand button is clicked", () => {
    render(
      <WidgetSizeControl
        currentWidth={1}
        currentHeight={1}
        minWidth={1}
        minHeight={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    const expandButton = screen.getByRole("button", { name: /expand to max/i });
    fireEvent.click(expandButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(4, 4);
  });

  it("shrinks to min size when shrink button is clicked", () => {
    render(
      <WidgetSizeControl
        currentWidth={4}
        currentHeight={4}
        minWidth={2}
        minHeight={2}
        onSizeChange={mockOnSizeChange}
      />
    );

    const shrinkButton = screen.getByRole("button", { name: /shrink to min/i });
    fireEvent.click(shrinkButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(2, 2);
  });

  it("does not show expand button when already at max size (4x4)", () => {
    render(
      <WidgetSizeControl
        currentWidth={4}
        currentHeight={4}
        minWidth={1}
        minHeight={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    expect(screen.queryByRole("button", { name: /expand to max/i })).toBeNull();
  });

  it("does not show shrink button when already at min size", () => {
    render(
      <WidgetSizeControl
        currentWidth={2}
        currentHeight={2}
        minWidth={2}
        minHeight={2}
        onSizeChange={mockOnSizeChange}
      />
    );

    expect(screen.queryByRole("button", { name: /shrink to min/i })).toBeNull();
  });

  it("shows both expand and shrink buttons for medium sizes", () => {
    render(
      <WidgetSizeControl
        currentWidth={2}
        currentHeight={2}
        minWidth={1}
        minHeight={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    expect(screen.getByRole("button", { name: /expand to max/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /shrink to min/i })).toBeDefined();
  });

  it("disables buttons when disabled prop is true", () => {
    render(
      <WidgetSizeControl
        currentWidth={2}
        currentHeight={2}
        minWidth={1}
        minHeight={1}
        onSizeChange={mockOnSizeChange}
        disabled={true}
      />
    );

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toHaveProperty("disabled", true);
    });
  });

  it("preserves current width when cycling height", () => {
    render(
      <WidgetSizeControl
        currentWidth={3}
        currentHeight={1}
        minWidth={1}
        minHeight={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    const heightButton = screen.getByRole("button", { name: /cycle height/i });
    fireEvent.click(heightButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(3, 2);
  });

  it("preserves current height when cycling width", () => {
    render(
      <WidgetSizeControl
        currentWidth={1}
        currentHeight={3}
        minWidth={1}
        minHeight={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    const widthButton = screen.getByRole("button", { name: /cycle width/i });
    fireEvent.click(widthButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(2, 3);
  });
});
