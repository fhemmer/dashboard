import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUser = { id: "user-123", email: "test@example.com" };

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
    })
  ),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/modules/github-prs", () => ({
  getPullRequests: vi.fn().mockResolvedValue({
    accounts: [
      {
        account: {
          id: "acc-1",
          userId: "user-123",
          githubUserId: 12345,
          githubUsername: "testuser",
          avatarUrl: null,
          accountLabel: "Personal",
          createdAt: new Date(),
        },
        categories: [
          { category: "review-requested", label: "Waiting For My Review", items: [] },
          { category: "created", label: "Created By Me", items: [] },
          { category: "all-open", label: "All Open", items: [] },
        ],
      },
    ],
    errors: [],
  }),
  PRTree: ({ accounts }: { accounts: unknown[] }) => (
    <div data-testid="pr-tree">PR Tree with {accounts.length} accounts</div>
  ),
}));

describe("Pull Requests Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders page with PR tree", async () => {
    const PullRequestsPage = (await import("./page")).default;
    const Component = await PullRequestsPage();
    render(Component);

    expect(screen.getByText("Pull Requests")).toBeDefined();
    expect(screen.getByText("View PRs across all your connected GitHub accounts")).toBeDefined();
    expect(screen.getByTestId("pr-tree")).toBeDefined();
  });

  it("shows manage accounts button", async () => {
    const PullRequestsPage = (await import("./page")).default;
    const Component = await PullRequestsPage();
    render(Component);

    const manageLink = screen.getByRole("link", { name: /Manage Accounts/i });
    expect(manageLink.getAttribute("href")).toBe("/account/github");
  });

  it("redirects when not authenticated", async () => {
    const { redirect } = await import("next/navigation");
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const PullRequestsPage = (await import("./page")).default;
    await PullRequestsPage();

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("shows error banner when errors present", async () => {
    const { getPullRequests } = await import("@/modules/github-prs");
    vi.mocked(getPullRequests).mockResolvedValueOnce({
      accounts: [],
      errors: [
        { accountId: "acc-1", message: "Token expired" },
        { accountId: "acc-2", message: "Rate limited" },
      ],
    });

    const PullRequestsPage = (await import("./page")).default;
    const Component = await PullRequestsPage();
    render(Component);

    expect(screen.getByText("Failed to load 2 account(s)")).toBeDefined();
    expect(screen.getByText("• Token expired")).toBeDefined();
    expect(screen.getByText("• Rate limited")).toBeDefined();
  });

  it("shows empty state when no accounts and no errors", async () => {
    const { getPullRequests } = await import("@/modules/github-prs");
    vi.mocked(getPullRequests).mockResolvedValueOnce({
      accounts: [],
      errors: [],
    });

    const PullRequestsPage = (await import("./page")).default;
    const Component = await PullRequestsPage();
    render(Component);

    expect(screen.getByText("No GitHub accounts connected")).toBeDefined();
    expect(screen.getByRole("link", { name: "Connect GitHub Account" })).toBeDefined();
  });
});
