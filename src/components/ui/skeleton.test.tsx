import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("renders with data-slot attribute", () => {
    render(<Skeleton data-testid="skeleton" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveAttribute("data-slot", "skeleton");
  });

  it("applies default classes", () => {
    render(<Skeleton data-testid="skeleton" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveClass("bg-accent");
    expect(skeleton).toHaveClass("animate-pulse");
    expect(skeleton).toHaveClass("rounded-md");
  });

  it("applies custom className", () => {
    render(<Skeleton data-testid="skeleton" className="custom-class h-10 w-20" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveClass("custom-class");
    expect(skeleton).toHaveClass("h-10");
    expect(skeleton).toHaveClass("w-20");
  });

  it("passes through additional props", () => {
    render(<Skeleton data-testid="skeleton" aria-label="Loading content" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton).toHaveAttribute("aria-label", "Loading content");
  });

  it("renders as a div element", () => {
    render(<Skeleton data-testid="skeleton" />);

    const skeleton = screen.getByTestId("skeleton");
    expect(skeleton.tagName).toBe("DIV");
  });
});
