import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "./progress";

describe("Progress", () => {
  it("renders with default value", () => {
    const { container } = render(<Progress />);
    const progress = container.querySelector('[role="progressbar"]');
    expect(progress).toBeInTheDocument();
    expect(progress).toHaveAttribute("aria-valuenow", "0");
  });

  it("renders with specified value", () => {
    const { container } = render(<Progress value={50} />);
    const progress = container.querySelector('[role="progressbar"]');
    expect(progress).toHaveAttribute("aria-valuenow", "50");
  });

  it("clamps value to 0-100 range", () => {
    const { container: container1 } = render(<Progress value={-10} />);
    expect(
      container1.querySelector('[role="progressbar"]')
    ).toHaveAttribute("aria-valuenow", "0");

    const { container: container2 } = render(<Progress value={150} />);
    expect(
      container2.querySelector('[role="progressbar"]')
    ).toHaveAttribute("aria-valuenow", "100");
  });

  it("applies custom className", () => {
    const { container } = render(<Progress className="custom-class" />);
    const progress = container.querySelector('[role="progressbar"]');
    expect(progress).toHaveClass("custom-class");
  });

  it("has correct ARIA attributes", () => {
    const { container } = render(<Progress value={75} />);
    const progress = container.querySelector('[role="progressbar"]');
    expect(progress).toHaveAttribute("aria-valuemin", "0");
    expect(progress).toHaveAttribute("aria-valuemax", "100");
    expect(progress).toHaveAttribute("aria-valuenow", "75");
  });
});
