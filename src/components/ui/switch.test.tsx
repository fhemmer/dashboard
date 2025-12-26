import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Switch } from "./switch";

describe("Switch", () => {
  it("renders correctly", () => {
    render(<Switch aria-label="Toggle" />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("starts unchecked by default", () => {
    render(<Switch aria-label="Toggle" />);
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("starts checked when defaultChecked is true", () => {
    render(<Switch aria-label="Toggle" defaultChecked />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("can be controlled", () => {
    render(<Switch aria-label="Toggle" checked />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("calls onCheckedChange when clicked", () => {
    const onChange = vi.fn();
    render(<Switch aria-label="Toggle" onCheckedChange={onChange} />);
    fireEvent.click(screen.getByRole("switch"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("can be disabled", () => {
    render(<Switch aria-label="Toggle" disabled />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("applies custom className", () => {
    render(<Switch aria-label="Toggle" className="custom-class" />);
    expect(screen.getByRole("switch")).toHaveClass("custom-class");
  });
});
