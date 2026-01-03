import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
        currentColspan={1}
        currentRowspan={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    // Should have height and width buttons
    expect(screen.getByRole("button", { name: /cycle height/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /toggle width/i })).toBeDefined();
  });

  it("cycles rowspan when height button is clicked (1 -> 2)", () => {
    render(
      <WidgetSizeControl
        currentColspan={1}
        currentRowspan={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    const heightButton = screen.getByRole("button", { name: /cycle height/i });
    fireEvent.click(heightButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(1, 2);
  });

  it("cycles rowspan when height button is clicked (2 -> 3)", () => {
    render(
      <WidgetSizeControl
        currentColspan={1}
        currentRowspan={2}
        onSizeChange={mockOnSizeChange}
      />
    );

    const heightButton = screen.getByRole("button", { name: /cycle height/i });
    fireEvent.click(heightButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(1, 3);
  });

  it("cycles rowspan when height button is clicked (3 -> 1)", () => {
    render(
      <WidgetSizeControl
        currentColspan={1}
        currentRowspan={3}
        onSizeChange={mockOnSizeChange}
      />
    );

    const heightButton = screen.getByRole("button", { name: /cycle height/i });
    fireEvent.click(heightButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(1, 1);
  });

  it("toggles colspan when width button is clicked (1 -> 2)", () => {
    render(
      <WidgetSizeControl
        currentColspan={1}
        currentRowspan={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    const widthButton = screen.getByRole("button", { name: /toggle width/i });
    fireEvent.click(widthButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(2, 1);
  });

  it("toggles colspan when width button is clicked (2 -> 1)", () => {
    render(
      <WidgetSizeControl
        currentColspan={2}
        currentRowspan={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    const widthButton = screen.getByRole("button", { name: /toggle width/i });
    fireEvent.click(widthButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(1, 1);
  });

  it("expands to max size when expand button is clicked", () => {
    render(
      <WidgetSizeControl
        currentColspan={1}
        currentRowspan={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    const expandButton = screen.getByRole("button", { name: /expand to max/i });
    fireEvent.click(expandButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(2, 3);
  });

  it("shrinks to min size when shrink button is clicked", () => {
    render(
      <WidgetSizeControl
        currentColspan={2}
        currentRowspan={3}
        onSizeChange={mockOnSizeChange}
      />
    );

    const shrinkButton = screen.getByRole("button", { name: /shrink to min/i });
    fireEvent.click(shrinkButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(1, 1);
  });

  it("does not show expand button when already at max size", () => {
    render(
      <WidgetSizeControl
        currentColspan={2}
        currentRowspan={3}
        onSizeChange={mockOnSizeChange}
      />
    );

    expect(screen.queryByRole("button", { name: /expand to max/i })).toBeNull();
  });

  it("does not show shrink button when already at min size", () => {
    render(
      <WidgetSizeControl
        currentColspan={1}
        currentRowspan={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    expect(screen.queryByRole("button", { name: /shrink to min/i })).toBeNull();
  });

  it("shows both expand and shrink buttons for medium sizes", () => {
    render(
      <WidgetSizeControl
        currentColspan={1}
        currentRowspan={2}
        onSizeChange={mockOnSizeChange}
      />
    );

    expect(screen.getByRole("button", { name: /expand to max/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /shrink to min/i })).toBeDefined();
  });

  it("disables buttons when disabled prop is true", () => {
    render(
      <WidgetSizeControl
        currentColspan={1}
        currentRowspan={2}
        onSizeChange={mockOnSizeChange}
        disabled={true}
      />
    );

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toHaveProperty("disabled", true);
    });
  });

  it("preserves current colspan when cycling rowspan", () => {
    render(
      <WidgetSizeControl
        currentColspan={2}
        currentRowspan={1}
        onSizeChange={mockOnSizeChange}
      />
    );

    const heightButton = screen.getByRole("button", { name: /cycle height/i });
    fireEvent.click(heightButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(2, 2);
  });

  it("preserves current rowspan when toggling colspan", () => {
    render(
      <WidgetSizeControl
        currentColspan={1}
        currentRowspan={3}
        onSizeChange={mockOnSizeChange}
      />
    );

    const widthButton = screen.getByRole("button", { name: /toggle width/i });
    fireEvent.click(widthButton);

    expect(mockOnSizeChange).toHaveBeenCalledWith(2, 3);
  });
});
