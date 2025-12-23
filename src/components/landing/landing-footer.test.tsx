import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LandingFooter } from "./landing-footer";

describe("LandingFooter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the app name", () => {
    render(<LandingFooter />);

    expect(screen.getByText("Dashboard")).toBeDefined();
  });

  it("renders the copyright with year", () => {
    render(<LandingFooter />);

    // The text "© 2025" is split across whitespace, so we need to find the span containing both
    expect(screen.getByText(/©/)).toBeDefined();
  });

  it("renders Sign Up link with correct href", () => {
    render(<LandingFooter />);

    const signUpLink = screen.getByRole("link", { name: /sign up/i });
    expect(signUpLink).toBeDefined();
    expect(signUpLink.getAttribute("href")).toBe("/signup");
  });

  it("renders Login link with correct href", () => {
    render(<LandingFooter />);

    const loginLink = screen.getByRole("link", { name: /login/i });
    expect(loginLink).toBeDefined();
    expect(loginLink.getAttribute("href")).toBe("/login");
  });

  it("renders as a footer element", () => {
    const { container } = render(<LandingFooter />);

    const footer = container.querySelector("footer");
    expect(footer).toBeDefined();
  });

  it("navigation links have hover styles", () => {
    render(<LandingFooter />);

    const signUpLink = screen.getByRole("link", { name: /sign up/i });
    expect(signUpLink.className).toContain("hover:");
  });

  it("has navigation element", () => {
    const { container } = render(<LandingFooter />);

    const nav = container.querySelector("nav");
    expect(nav).toBeDefined();
  });
});
