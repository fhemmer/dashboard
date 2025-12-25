import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GoogleIcon } from "./google-icon";

describe("GoogleIcon", () => {
  it("renders an SVG element", () => {
    const { container } = render(<GoogleIcon />);
    const svg = container.querySelector("svg");
    expect(svg).toBeDefined();
  });

  it("applies custom className when provided", () => {
    const { container } = render(<GoogleIcon className="custom-class" />);
    const svg = container.querySelector("svg");
    expect(svg?.classList.contains("custom-class")).toBe(true);
  });

  it("has correct SVG attributes", () => {
    const { container } = render(<GoogleIcon />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 488 512");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("focusable")).toBe("false");
  });

  it("contains the Google logo path", () => {
    const { container } = render(<GoogleIcon />);
    const path = container.querySelector("path");
    expect(path).toBeDefined();
    expect(path?.getAttribute("fill")).toBe("currentColor");
  });
});
