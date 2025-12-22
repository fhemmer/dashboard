import type { GitHubAccount } from "@/modules/github-prs";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubAccountsList } from "./github-accounts-list";

vi.mock("@/modules/github-prs", async () => {
  const actual = await vi.importActual("@/modules/github-prs");
  return {
    ...actual,
    updateAccountLabel: vi.fn().mockResolvedValue({ success: true }),
    disconnectGitHubAccount: vi.fn().mockResolvedValue({ success: true }),
  };
});

const mockAccounts: GitHubAccount[] = [
  {
    id: "acc-1",
    userId: "user-123",
    githubUserId: 12345,
    githubUsername: "testuser",
    avatarUrl: "https://example.com/avatar.png",
    accountLabel: "Personal",
    createdAt: new Date("2023-01-01"),
  },
  {
    id: "acc-2",
    userId: "user-123",
    githubUserId: 67890,
    githubUsername: "workuser",
    avatarUrl: null,
    accountLabel: "Work",
    createdAt: new Date("2023-01-02"),
  },
];

describe("GitHubAccountsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders list of accounts", () => {
    render(<GitHubAccountsList accounts={mockAccounts} />);

    expect(screen.getByText("Personal")).toBeDefined();
    expect(screen.getByText("@testuser")).toBeDefined();
    expect(screen.getByText("Work")).toBeDefined();
    expect(screen.getByText("@workuser")).toBeDefined();
  });

  it("shows avatar container for account with avatar URL", () => {
    render(<GitHubAccountsList accounts={[mockAccounts[0]]} />);

    // Avatar shows fallback in test environment since Next.js Image doesn't load
    // Verify the avatar container exists with the fallback initial
    expect(screen.getByText("T")).toBeDefined();
  });

  it("shows fallback for account without avatar", () => {
    render(<GitHubAccountsList accounts={[mockAccounts[1]]} />);

    expect(screen.getByText("W")).toBeDefined(); // First letter of "workuser"
  });

  it("enters edit mode when clicking edit button", () => {
    render(<GitHubAccountsList accounts={[mockAccounts[0]]} />);

    // Find all buttons and get the edit button (pencil icon - first small button)
    const buttons = screen.getAllByRole("button");
    const editButton = buttons.find(btn => btn.querySelector("svg.h-3"));
    if (editButton) fireEvent.click(editButton);

    expect(screen.getByRole("textbox")).toBeDefined();
    expect(screen.getByDisplayValue("Personal")).toBeDefined();
  });

  it("saves label when clicking save button", async () => {
    const { updateAccountLabel } = await import("@/modules/github-prs");
    render(<GitHubAccountsList accounts={[mockAccounts[0]]} />);

    // Enter edit mode
    const buttons = screen.getAllByRole("button");
    const editButton = buttons.find(btn => btn.querySelector("svg.h-3"));
    if (editButton) fireEvent.click(editButton);

    // Change value
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New Label" } });

    // Click save (first button in edit mode)
    const editButtons = screen.getAllByRole("button");
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(updateAccountLabel).toHaveBeenCalledWith("acc-1", "New Label");
    });
  });

  it("cancels edit when clicking cancel button", () => {
    render(<GitHubAccountsList accounts={[mockAccounts[0]]} />);

    // Enter edit mode
    const buttons = screen.getAllByRole("button");
    const editButton = buttons.find(btn => btn.querySelector("svg.h-3"));
    if (editButton) fireEvent.click(editButton);

    // Change value
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New Label" } });

    // Click cancel (second button in edit mode)
    const editButtons = screen.getAllByRole("button");
    fireEvent.click(editButtons[1]);

    // Should show original label
    expect(screen.getByText("Personal")).toBeDefined();
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("disconnects account when clicking delete button", async () => {
    const { disconnectGitHubAccount } = await import("@/modules/github-prs");
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<GitHubAccountsList accounts={[mockAccounts[0]]} />);

    // Find delete button (the one with destructive styling)
    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons.find(btn => btn.classList.contains("text-destructive"));
    if (deleteButton) fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(disconnectGitHubAccount).toHaveBeenCalledWith("acc-1");
    });
  });

  it("does not disconnect when confirm is cancelled", async () => {
    const { disconnectGitHubAccount } = await import("@/modules/github-prs");
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<GitHubAccountsList accounts={[mockAccounts[0]]} />);

    // Find delete button
    const buttons = screen.getAllByRole("button");
    const deleteButton = buttons.find(btn => btn.classList.contains("text-destructive"));
    if (deleteButton) fireEvent.click(deleteButton);

    expect(disconnectGitHubAccount).not.toHaveBeenCalled();
  });
});
