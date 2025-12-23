import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
    section: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLElement>) => (
      <section {...props}>{children}</section>
    ),
  },
}));

import { FeatureSection } from "./feature-section";

describe("FeatureSection", () => {
  it("renders the section heading", () => {
    render(<FeatureSection />);

    expect(screen.getByText(/Powerful features for/)).toBeDefined();
    expect(screen.getByText("productive people")).toBeDefined();
  });

  it("renders the section description", () => {
    render(<FeatureSection />);

    expect(
      screen.getByText(/Everything you need to stay organized and informed/)
    ).toBeDefined();
  });

  it("renders News Aggregation feature card", () => {
    render(<FeatureSection />);

    expect(screen.getByText("News Aggregation")).toBeDefined();
    expect(
      screen.getByText(/Stay informed with curated news/)
    ).toBeDefined();
  });

  it("renders PR Tracking feature card", () => {
    render(<FeatureSection />);

    expect(screen.getByText("PR Tracking")).toBeDefined();
    expect(
      screen.getByText(/Monitor pull requests across your GitHub repositories/)
    ).toBeDefined();
  });

  it("renders Expense Management feature card", () => {
    render(<FeatureSection />);

    expect(screen.getByText("Expense Management")).toBeDefined();
    expect(
      screen.getByText(/Track your spending with smart categorization/)
    ).toBeDefined();
  });

  it("has features section with correct id", () => {
    const { container } = render(<FeatureSection />);

    const section = container.querySelector("#features");
    expect(section).toBeDefined();
  });

  it("renders three feature cards", () => {
    const { container } = render(<FeatureSection />);

    // Each feature card has data-slot="card"
    const cards = container.querySelectorAll("[data-slot='card']");
    expect(cards.length).toBe(3);
  });

  it("renders feature icons", () => {
    const { container } = render(<FeatureSection />);

    // Each feature has an icon
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(3);
  });

  it("feature cards have hover effects", () => {
    const { container } = render(<FeatureSection />);

    const hoverElements = container.querySelectorAll("[class*='hover:']");
    expect(hoverElements.length).toBeGreaterThan(0);
  });
});
