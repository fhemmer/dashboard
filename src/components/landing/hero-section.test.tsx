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
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import { HeroSection } from "./hero-section";

describe("HeroSection", () => {
  it("renders the main headline", () => {
    render(<HeroSection />);

    expect(screen.getByText("Everything you need.")).toBeDefined();
    expect(screen.getByText("One dashboard.")).toBeDefined();
  });

  it("renders the subheadline", () => {
    render(<HeroSection />);

    expect(
      screen.getByText(/Aggregate your news, track pull requests/)
    ).toBeDefined();
  });

  it("renders the command center badge", () => {
    render(<HeroSection />);

    expect(screen.getByText("Your personal command center")).toBeDefined();
  });

  it("renders Get Started button with correct link", () => {
    render(<HeroSection />);

    const getStartedLink = screen.getByRole("link", { name: /get started/i });
    expect(getStartedLink).toBeDefined();
    expect(getStartedLink.getAttribute("href")).toBe("/signup");
  });

  it("renders Sign In button with correct link", () => {
    render(<HeroSection />);

    const signInLink = screen.getByRole("link", { name: /sign in/i });
    expect(signInLink).toBeDefined();
    expect(signInLink.getAttribute("href")).toBe("/login");
  });

  it("renders as a section element", () => {
    const { container } = render(<HeroSection />);

    const section = container.querySelector("section");
    expect(section).toBeDefined();
  });

  it("Get Started button has primary styling", () => {
    render(<HeroSection />);

    const button = screen.getByRole("link", { name: /get started/i });
    expect(button.className).toContain("bg-primary");
  });

  it("renders sparkles icon", () => {
    const { container } = render(<HeroSection />);

    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("has background blur elements", () => {
    const { container } = render(<HeroSection />);

    const blurElements = container.querySelectorAll("[class*='blur-']");
    expect(blurElements.length).toBeGreaterThan(0);
  });
});
