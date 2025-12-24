import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CategoryBadge } from "./category-badge";

describe("CategoryBadge", () => {
  it("renders badge with correct label for tech", () => {
    render(<CategoryBadge category="tech" />);

    const badge = screen.getByTestId("category-badge");
    expect(badge).toHaveTextContent("Tech");
  });

  it("renders badge with correct label for general", () => {
    render(<CategoryBadge category="general" />);

    const badge = screen.getByTestId("category-badge");
    expect(badge).toHaveTextContent("General");
  });

  it("renders badge with correct label for ai", () => {
    render(<CategoryBadge category="ai" />);

    const badge = screen.getByTestId("category-badge");
    expect(badge).toHaveTextContent("AI");
  });

  it("renders badge with correct label for dev", () => {
    render(<CategoryBadge category="dev" />);

    const badge = screen.getByTestId("category-badge");
    expect(badge).toHaveTextContent("Development");
  });

  it("applies custom className", () => {
    render(<CategoryBadge category="tech" className="my-custom-class" />);

    const badge = screen.getByTestId("category-badge");
    expect(badge.className).toContain("my-custom-class");
  });

  it("applies category-specific color classes", () => {
    render(<CategoryBadge category="tech" />);

    const badge = screen.getByTestId("category-badge");
    expect(badge.className).toContain("bg-blue-100");
  });
});
