import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewsWidget } from "./news-widget";

vi.mock("../actions", () => ({
  getNewsItems: vi.fn().mockResolvedValue({
    items: [
      {
        id: "1",
        title: "First News Item",
        summary: "Summary 1",
        url: "https://example.com/1",
        imageUrl: null,
        publishedAt: new Date("2025-12-20T10:00:00Z"),
        source: {
          id: "source-1",
          name: "Source 1",
          iconName: "rocket" as const,
          brandColor: "orange" as const,
          category: "dev" as const,
        },
      },
      {
        id: "2",
        title: "Second News Item",
        summary: "Summary 2",
        url: "https://example.com/2",
        imageUrl: null,
        publishedAt: new Date("2025-12-19T10:00:00Z"),
        source: {
          id: "source-2",
          name: "Source 2",
          iconName: "rocket" as const,
          brandColor: "orange" as const,
          category: "dev" as const,
        },
      },
      {
        id: "3",
        title: "Third News Item",
        summary: "Summary 3",
        url: "https://example.com/3",
        imageUrl: null,
        publishedAt: new Date("2025-12-18T10:00:00Z"),
        source: {
          id: "source-3",
          name: "Source 3",
          iconName: "rocket" as const,
          brandColor: "orange" as const,
          category: "dev" as const,
        },
      },
      {
        id: "4",
        title: "Fourth News Item",
        summary: "Summary 4",
        url: "https://example.com/4",
        imageUrl: null,
        publishedAt: new Date("2025-12-17T10:00:00Z"),
        source: {
          id: "source-4",
          name: "Source 4",
          iconName: "rocket" as const,
          brandColor: "orange" as const,
          category: "dev" as const,
        },
      },
    ],
    error: null,
  }),
}));

describe("NewsWidget", () => {
  it("renders widget header", async () => {
    const Widget = await NewsWidget({});
    render(Widget);

    expect(screen.getByText("News")).toBeDefined();
    expect(screen.getByText("Latest updates from your sources")).toBeDefined();
  });

  it("renders View All link", async () => {
    const Widget = await NewsWidget({});
    render(Widget);

    const viewAllLink = screen.getByRole("link", { name: /view all/i });
    expect(viewAllLink.getAttribute("href")).toBe("/news");
  });

  it("renders default 3 items", async () => {
    const Widget = await NewsWidget({});
    render(Widget);

    expect(screen.getByText("First News Item")).toBeDefined();
    expect(screen.getByText("Second News Item")).toBeDefined();
    expect(screen.getByText("Third News Item")).toBeDefined();
    expect(screen.queryByText("Fourth News Item")).toBeNull();
  });

  it("respects maxItems prop", async () => {
    const Widget = await NewsWidget({ maxItems: 2 });
    render(Widget);

    expect(screen.getByText("First News Item")).toBeDefined();
    expect(screen.getByText("Second News Item")).toBeDefined();
    expect(screen.queryByText("Third News Item")).toBeNull();
  });
});

describe("NewsWidget empty state", () => {
  it("shows empty message when no items", async () => {
    const { getNewsItems } = await import("../actions");
    vi.mocked(getNewsItems).mockResolvedValueOnce({ items: [], error: null });

    const Widget = await NewsWidget({});
    render(Widget);

    expect(screen.getByText("No news items available")).toBeDefined();
  });
});

describe("NewsWidget error state", () => {
  it("shows error message when loading fails", async () => {
    const { getNewsItems } = await import("../actions");
    vi.mocked(getNewsItems).mockResolvedValueOnce({
      items: [],
      error: "Failed to fetch news",
    });

    const Widget = await NewsWidget({});
    render(Widget);

    expect(screen.getByText("Failed to load news")).toBeDefined();
  });
});
