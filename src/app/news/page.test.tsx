import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NewsPage from "./page";

const createMockSource = (id: string, name: string) => ({
  id,
  name,
  iconName: "rocket" as const,
  brandColor: "orange" as const,
  category: "dev" as const,
});

const mockGetNewsItems = vi.fn().mockResolvedValue({
  items: [
    {
      id: "1",
      title: "Test News Item 1",
      summary: "Test summary 1",
      url: "https://example.com/1",
      imageUrl: null,
      publishedAt: new Date("2025-12-20T10:00:00Z"),
      source: createMockSource("source-1", "Test Source"),
    },
    {
      id: "2",
      title: "Test News Item 2",
      summary: "Test summary 2",
      url: "https://example.com/2",
      imageUrl: null,
      publishedAt: new Date("2025-12-19T10:00:00Z"),
      source: createMockSource("source-2", "Test Source 2"),
    },
  ],
  error: null,
});

const mockGetNewsLastSeenAt = vi.fn().mockResolvedValue(null);

const mockGetSourcesWithExclusion = vi.fn().mockResolvedValue({
  sources: [
    { ...createMockSource("source-1", "Test Source"), isExcluded: false },
    { ...createMockSource("source-2", "Test Source 2"), isExcluded: false },
  ],
  error: null,
});

vi.mock("@/modules/news", () => ({
  getNewsItems: () => mockGetNewsItems(),
  getNewsLastSeenAt: () => mockGetNewsLastSeenAt(),
  getSourcesWithExclusion: () => mockGetSourcesWithExclusion(),
  NewsItemComponent: ({ item, isNew }: { item: { title: string }; isNew?: boolean }) => (
    <div data-testid="news-item" data-is-new={isNew}>
      {item.title}
    </div>
  ),
  RefreshButton: () => <button>Refresh</button>,
  MarkAsReadButton: ({ newCount }: { newCount: number }) =>
    newCount > 0 ? <button>Mark {newCount} as read</button> : null,
  AutoMarkAsRead: () => null,
  SourceExclusionSettings: () => <button>Manage Sources</button>,
}));

describe("News Page", () => {
  it("renders page header", async () => {
    const Page = await NewsPage();
    render(Page);

    expect(screen.getByText("News")).toBeDefined();
  });

  it("renders back button", async () => {
    const Page = await NewsPage();
    render(Page);

    const backLink = screen.getByRole("link", { name: /back to dashboard/i });
    expect(backLink.getAttribute("href")).toBe("/");
  });

  it("renders refresh button", async () => {
    const Page = await NewsPage();
    render(Page);

    expect(screen.getByRole("button", { name: /refresh/i })).toBeDefined();
  });

  it("renders manage sources button", async () => {
    const Page = await NewsPage();
    render(Page);

    expect(screen.getByRole("button", { name: /manage sources/i })).toBeDefined();
  });

  it("renders all news items", async () => {
    const Page = await NewsPage();
    render(Page);

    expect(screen.getByText("Test News Item 1")).toBeDefined();
    expect(screen.getByText("Test News Item 2")).toBeDefined();
  });

  it("shows new item count when there are new items", async () => {
    mockGetNewsLastSeenAt.mockResolvedValueOnce(null);
    const Page = await NewsPage();
    render(Page);

    expect(screen.getByText(/2 new items/)).toBeDefined();
  });

  it("shows mark as read button when there are new items", async () => {
    mockGetNewsLastSeenAt.mockResolvedValueOnce(null);
    const Page = await NewsPage();
    render(Page);

    expect(screen.getByRole("button", { name: /mark 2 as read/i })).toBeDefined();
  });

  it("marks items as new when published after lastSeenAt", async () => {
    mockGetNewsLastSeenAt.mockResolvedValueOnce(new Date("2025-12-19T12:00:00Z"));
    const Page = await NewsPage();
    render(Page);

    const items = screen.getAllByTestId("news-item");
    expect(items[0].getAttribute("data-is-new")).toBe("true");
    expect(items[1].getAttribute("data-is-new")).toBe("false");
  });

  it("does not show new count when all items are read", async () => {
    mockGetNewsLastSeenAt.mockResolvedValueOnce(new Date("2025-12-21T00:00:00Z"));
    const Page = await NewsPage();
    render(Page);

    expect(screen.queryByText(/new item/)).toBeNull();
  });
});

describe("News Page empty state", () => {
  it("shows empty message when no items", async () => {
    mockGetNewsItems.mockResolvedValueOnce({ items: [], error: null });

    const Page = await NewsPage();
    render(Page);

    expect(screen.getByText("No news items available")).toBeDefined();
  });
});

describe("News Page error state", () => {
  it("shows error alert when loading fails", async () => {
    mockGetNewsItems.mockResolvedValueOnce({
      items: [],
      error: "Database error",
    });

    const Page = await NewsPage();
    render(Page);

    expect(screen.getByText("Failed to load news")).toBeDefined();
    expect(screen.getByText("Database error")).toBeDefined();
  });
});
