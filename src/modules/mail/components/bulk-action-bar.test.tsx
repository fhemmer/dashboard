import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BulkActionBar } from "./bulk-action-bar";

describe("BulkActionBar", () => {
  it("should not render when selectedCount is 0", () => {
    const mockOnAction = vi.fn();
    const mockOnClear = vi.fn();

    const { container } = render(
      <BulkActionBar
        selectedCount={0}
        onAction={mockOnAction}
        onClearSelection={mockOnClear}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("should render when selectedCount > 0", () => {
    const mockOnAction = vi.fn();
    const mockOnClear = vi.fn();

    render(
      <BulkActionBar
        selectedCount={3}
        onAction={mockOnAction}
        onClearSelection={mockOnClear}
      />
    );

    expect(screen.getByText("3 selected")).toBeInTheDocument();
  });

  it("should call onAction with correct action type", () => {
    const mockOnAction = vi.fn();
    const mockOnClear = vi.fn();

    render(
      <BulkActionBar
        selectedCount={2}
        onAction={mockOnAction}
        onClearSelection={mockOnClear}
      />
    );

    fireEvent.click(screen.getByText("Read"));
    expect(mockOnAction).toHaveBeenCalledWith("markRead");

    fireEvent.click(screen.getByText("Unread"));
    expect(mockOnAction).toHaveBeenCalledWith("markUnread");

    fireEvent.click(screen.getByText("Junk"));
    expect(mockOnAction).toHaveBeenCalledWith("moveToJunk");

    fireEvent.click(screen.getByText("Delete"));
    expect(mockOnAction).toHaveBeenCalledWith("delete");
  });

  it("should call onClearSelection when Clear is clicked", () => {
    const mockOnAction = vi.fn();
    const mockOnClear = vi.fn();

    render(
      <BulkActionBar
        selectedCount={5}
        onAction={mockOnAction}
        onClearSelection={mockOnClear}
      />
    );

    fireEvent.click(screen.getByText("Clear"));
    expect(mockOnClear).toHaveBeenCalled();
  });
});
