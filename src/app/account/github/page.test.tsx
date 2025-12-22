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
  getGitHubAccounts: vi.fn().mockResolvedValue([
    {
      id: "acc-1",
      userId: "user-123",
      githubUserId: 12345,
      githubUsername: "testuser",
      avatarUrl: "https://example.com/avatar.png",
      accountLabel: "Personal",
      createdAt: new Date(),
    },
  ]),
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
}));

vi.mock("./github-accounts-list", () => ({
  GitHubAccountsList: ({ accounts }: { accounts: unknown[] }) => (
    <div data-testid="accounts-list">{accounts.length} accounts</div>
  ),
}));

describe("GitHub Accounts Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_DASHBOARD_CLIENT_ID = "test-client-id";
  });

  it("renders page with accounts list", async () => {
    const GitHubAccountsPage = (await import("./page")).default;
    const Component = await GitHubAccountsPage({
      searchParams: Promise.resolve({}),
    });
    render(Component);

    expect(screen.getByText("GitHub Accounts")).toBeDefined();
    expect(screen.getByText("Manage your connected GitHub accounts")).toBeDefined();
    expect(screen.getByTestId("accounts-list")).toBeDefined();
  });

  it("shows success message after connection", async () => {
    const GitHubAccountsPage = (await import("./page")).default;
    const Component = await GitHubAccountsPage({
      searchParams: Promise.resolve({ success: "connected" }),
    });
    render(Component);

    expect(screen.getByText("GitHub account connected successfully!")).toBeDefined();
  });

  it("shows error message on failure", async () => {
    const GitHubAccountsPage = (await import("./page")).default;
    const Component = await GitHubAccountsPage({
      searchParams: Promise.resolve({ error: "access_denied" }),
    });
    render(Component);

    expect(screen.getByText("Failed to connect GitHub account")).toBeDefined();
    expect(screen.getByText("Error: access_denied")).toBeDefined();
  });

  it("has connect button with OAuth URL", async () => {
    const GitHubAccountsPage = (await import("./page")).default;
    const Component = await GitHubAccountsPage({
      searchParams: Promise.resolve({}),
    });
    render(Component);

    const connectButton = screen.getByRole("link", { name: /Connect GitHub Account/i });
    expect(connectButton.getAttribute("href")).toContain("github.com/login/oauth/authorize");
    expect(connectButton.getAttribute("href")).toContain("client_id=test-client-id");
  });

  it("redirects when not authenticated", async () => {
    const { redirect } = await import("next/navigation");
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const GitHubAccountsPage = (await import("./page")).default;
    await GitHubAccountsPage({ searchParams: Promise.resolve({}) });

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("shows empty state when no accounts", async () => {
    const { getGitHubAccounts } = await import("@/modules/github-prs");
    vi.mocked(getGitHubAccounts).mockResolvedValueOnce([]);

    const GitHubAccountsPage = (await import("./page")).default;
    const Component = await GitHubAccountsPage({
      searchParams: Promise.resolve({}),
    });
    render(Component);

    expect(screen.getByText("No GitHub accounts connected yet")).toBeDefined();
  });
});
