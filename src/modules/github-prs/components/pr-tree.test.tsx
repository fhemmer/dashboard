import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GitHubAccountWithPRs, PullRequest } from "../types";
import { PRTree } from "./pr-tree";

const basePR: PullRequest = {
  id: 1,
  number: 42,
  title: "Test PR",
  htmlUrl: "https://github.com/owner/repo/pull/42",
  state: "open",
  draft: false,
  createdAt: new Date("2023-01-01"),
  updatedAt: new Date("2023-01-02"),
  repository: { fullName: "owner/repo", htmlUrl: "https://github.com/owner/repo" },
  user: { login: "testuser", avatarUrl: "https://example.com/avatar.png" },
  labels: [],
};

const mockAccountWithPRs: GitHubAccountWithPRs = {
  account: {
    id: "acc-1",
    userId: "user-123",
    githubUserId: 12345,
    githubUsername: "testuser",
    avatarUrl: "https://example.com/avatar.png",
    accountLabel: "Personal",
    createdAt: new Date("2023-01-01"),
  },
  categories: [
    { category: "review-requested", label: "Waiting For My Review", items: [basePR] },
    { category: "created", label: "Created By Me", items: [] },
    { category: "all-open", label: "All Open", items: [basePR, { ...basePR, id: 2, number: 43 }] },
  ],
};

describe("PRTree", () => {
  it("shows empty message when no accounts", () => {
    render(<PRTree accounts={[]} />);

    expect(screen.getByText("No GitHub accounts connected")).toBeDefined();
  });

  it("renders account node with label and username", () => {
    render(<PRTree accounts={[mockAccountWithPRs]} />);

    expect(screen.getByText("Personal")).toBeDefined();
    expect(screen.getByText("@testuser")).toBeDefined();
  });

  it("shows total PR count on account node", () => {
    render(<PRTree accounts={[mockAccountWithPRs]} />);

    // Total: 1 + 0 + 2 = 3
    expect(screen.getByText("3")).toBeDefined();
  });

  it("shows category counts", () => {
    // defaultExpanded=true means account is already open and shows categories
    render(<PRTree accounts={[mockAccountWithPRs]} defaultExpanded />);

    // Categories should already be visible
    expect(screen.getByText("Waiting For My Review")).toBeDefined();
    expect(screen.getByText("Created By Me")).toBeDefined();
    expect(screen.getByText("All Open")).toBeDefined();
  });

  it("expands and collapses account node", () => {
    render(<PRTree accounts={[mockAccountWithPRs]} defaultExpanded={false} />);

    // Categories should be visible when expanded by default
    expect(screen.getByText("Personal")).toBeDefined();

    // Click to toggle
    const trigger = screen.getByText("Personal").closest("button");
    expect(trigger).toBeDefined();
  });

  it("expands and collapses category node", () => {
    render(<PRTree accounts={[mockAccountWithPRs]} defaultExpanded />);

    // Click on category
    const categoryTrigger = screen.getByText("Waiting For My Review").closest("button");
    if (categoryTrigger) {
      fireEvent.click(categoryTrigger);
    }

    // PR should be visible after expanding category
    expect(screen.getByText(/owner\/repo#42/)).toBeDefined();
  });

  it("shows no pull requests message for empty category", () => {
    render(<PRTree accounts={[mockAccountWithPRs]} defaultExpanded />);

    // Click on empty category
    const categoryTrigger = screen.getByText("Created By Me").closest("button");
    if (categoryTrigger) {
      fireEvent.click(categoryTrigger);
    }

    expect(screen.getByText("No pull requests")).toBeDefined();
  });

  it("shows error message when account has error", () => {
    const accountWithError: GitHubAccountWithPRs = {
      ...mockAccountWithPRs,
      categories: [],
      error: "Failed to fetch PRs",
    };

    render(<PRTree accounts={[accountWithError]} defaultExpanded />);

    expect(screen.getByText("Failed to fetch PRs")).toBeDefined();
  });

  it("renders multiple accounts", () => {
    const secondAccount: GitHubAccountWithPRs = {
      account: {
        ...mockAccountWithPRs.account,
        id: "acc-2",
        accountLabel: "Work",
        githubUsername: "workuser",
      },
      categories: mockAccountWithPRs.categories,
    };

    render(<PRTree accounts={[mockAccountWithPRs, secondAccount]} />);

    expect(screen.getByText("Personal")).toBeDefined();
    expect(screen.getByText("Work")).toBeDefined();
  });

  it("renders avatar fallback for account without avatar", () => {
    const accountNoAvatar: GitHubAccountWithPRs = {
      ...mockAccountWithPRs,
      account: { ...mockAccountWithPRs.account, avatarUrl: null },
    };

    render(<PRTree accounts={[accountNoAvatar]} />);

    expect(screen.getByText("T")).toBeDefined(); // First letter of "testuser"
  });
});
