import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignUpPage from "./page";

// Mock the signUp action
vi.mock("../auth/actions", () => ({
  signUp: vi.fn(),
}));

describe("SignUpPage", () => {
  it("renders signup form correctly", async () => {
    const Page = await SignUpPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    expect(screen.getByText("Create an account")).toBeDefined();
    expect(
      screen.getByText("Enter your email and password to get started.")
    ).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByLabelText("Confirm Password")).toBeDefined();
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeDefined();
    expect(screen.getByText("Login")).toBeDefined();
  });

  it("displays error message when error param is present", async () => {
    const Page = await SignUpPage({
      searchParams: Promise.resolve({ error: "Email already exists" }),
    });

    render(Page);

    expect(screen.getByText("Email already exists")).toBeDefined();
  });

  it("does not display error when no error param", async () => {
    const Page = await SignUpPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    // Should not find any destructive text container
    const errorContainers = document.querySelectorAll(".bg-destructive\\/15");
    expect(errorContainers.length).toBe(0);
  });
});
