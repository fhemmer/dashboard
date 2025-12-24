import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules
const mockGetUser = vi.fn();
const mockGetCurrentUserRole = vi.fn();
const mockGetNewsSources = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    })
  ),
}));

vi.mock("@/modules/news-sources", () => ({
  getCurrentUserRole: () => mockGetCurrentUserRole(),
  getNewsSources: () => mockGetNewsSources(),
  SourceList: ({ initialSources, userRole, userId }: { initialSources: unknown[]; userRole: string; userId: string }) => (
    <div data-testid="source-list" data-role={userRole} data-user={userId}>
      Sources: {initialSources.length}
    </div>
  ),
}));

const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    mockRedirect(path);
    throw new Error(`REDIRECT:${path}`);
  },
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import NewsSourcesPage from "./page";

describe("NewsSourcesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /login when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(NewsSourcesPage()).rejects.toThrow("REDIRECT:/login");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to / for regular users", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockGetCurrentUserRole.mockResolvedValue("user");

    await expect(NewsSourcesPage()).rejects.toThrow("REDIRECT:/");
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("renders page for admin", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockGetCurrentUserRole.mockResolvedValue("admin");
    mockGetNewsSources.mockResolvedValue({
      sources: [{ id: "1", name: "Test" }],
      error: null,
    });

    const result = await NewsSourcesPage();

    expect(result).toBeTruthy();
    // The component should render with SourceList
    expect(result.props.children).toBeDefined();
  });

  it("renders page for news_manager", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-456" } },
    });
    mockGetCurrentUserRole.mockResolvedValue("news_manager");
    mockGetNewsSources.mockResolvedValue({
      sources: [],
      error: null,
    });

    const result = await NewsSourcesPage();

    expect(result).toBeTruthy();
  });

  it("displays error message when fetching fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
    });
    mockGetCurrentUserRole.mockResolvedValue("admin");
    mockGetNewsSources.mockResolvedValue({
      sources: [],
      error: "Database error",
    });

    const result = await NewsSourcesPage();

    // Convert to string to check content
    const html = JSON.stringify(result);
    expect(html).toContain("Database error");
  });

  it("passes correct props to SourceList", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-789" } },
    });
    mockGetCurrentUserRole.mockResolvedValue("admin");
    mockGetNewsSources.mockResolvedValue({
      sources: [{ id: "1" }, { id: "2" }],
      error: null,
    });

    const result = await NewsSourcesPage();

    // Serialize the tree to check for the SourceList props
    const serialized = JSON.stringify(result);
    // Verify SourceList receives correct props
    expect(serialized).toContain('"userRole":"admin"');
    expect(serialized).toContain('"userId":"user-789"');
    expect(serialized).toContain('"initialSources":[{"id":"1"},{"id":"2"}]');
  });
});
