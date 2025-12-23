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

import { CTASection } from "./cta-section";

describe("CTASection", () => {
  it("renders the section heading", () => {
    render(<CTASection />);

    expect(screen.getByText("Ready to get started?")).toBeDefined();
  });

  it("renders the description text", () => {
    render(<CTASection />);

    expect(
      screen.getByText(/Join and take control of your digital life/)
    ).toBeDefined();
  });

  it("renders Create Account button with correct link", () => {
    render(<CTASection />);

    const createAccountLink = screen.getByRole("link", {
      name: /create your account/i,
    });
    expect(createAccountLink).toBeDefined();
    expect(createAccountLink.getAttribute("href")).toBe("/signup");
  });

  it("renders Sign In button with correct link", () => {
    render(<CTASection />);

    const signInLink = screen.getByRole("link", {
      name: /sign in to existing account/i,
    });
    expect(signInLink).toBeDefined();
    expect(signInLink.getAttribute("href")).toBe("/login");
  });

  it("has proper section structure", () => {
    const { container } = render(<CTASection />);

    const section = container.querySelector("section");
    expect(section).toBeDefined();
  });

  it("Create Account button has primary styling", () => {
    render(<CTASection />);

    const createAccountLink = screen.getByRole("link", {
      name: /create your account/i,
    });
    expect(createAccountLink.className).toContain("bg-primary");
  });

  it("Sign In button has outline styling", () => {
    render(<CTASection />);

    const signInLink = screen.getByRole("link", {
      name: /sign in to existing account/i,
    });
    expect(signInLink.className).toContain("border");
  });
});
