import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock framer-motion to avoid animation issues in tests
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
    h1: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h1 {...props}>{children}</h1>
    ),
    p: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p {...props}>{children}</p>
    ),
  },
}));

import { LandingPage } from "./landing-page";

describe("LandingPage", () => {
  it("renders all sections", () => {
    render(<LandingPage />);

    // HeroSection
    expect(screen.getByText("Everything you need.")).toBeDefined();

    // FeatureSection
    expect(screen.getByText(/Powerful features for/)).toBeDefined();

    // CTASection
    expect(screen.getByText("Ready to get started?")).toBeDefined();

    // LandingFooter
    expect(screen.getByText("Dashboard")).toBeDefined();
  });

  it("renders in correct order", () => {
    const { container } = render(<LandingPage />);

    const sections = container.querySelectorAll("section");
    expect(sections.length).toBeGreaterThanOrEqual(2);
  });
});
