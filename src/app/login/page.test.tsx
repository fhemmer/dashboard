import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "./page";

// Mock the signIn action
vi.mock("../auth/actions", () => ({
  signIn: vi.fn(),
  signInWithGoogle: vi.fn(),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

describe("LoginPage", () => {
  it("renders login form correctly", async () => {
    const Page = await LoginPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    expect(screen.getByText("Welcome back")).toBeDefined();
    expect(
      screen.getByText("Enter your email and password to access your dashboard.")
    ).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeDefined();
    expect(screen.getByText("Sign up")).toBeDefined();
  });

  it("displays error message when error param is present", async () => {
    const Page = await LoginPage({
      searchParams: Promise.resolve({ error: "Invalid credentials" }),
    });

    render(Page);

    expect(screen.getByText("Invalid credentials")).toBeDefined();
  });

  it("displays success message when message param is present", async () => {
    const Page = await LoginPage({
      searchParams: Promise.resolve({
        message: "Check your email to confirm your account.",
      }),
    });

    render(Page);

    expect(
      screen.getByText("Check your email to confirm your account.")
    ).toBeDefined();
  });

  it("displays both error and message when both are present", async () => {
    const Page = await LoginPage({
      searchParams: Promise.resolve({
        error: "Something went wrong",
        message: "Please try again",
      }),
    });

    render(Page);

    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("Please try again")).toBeDefined();
  });
});
