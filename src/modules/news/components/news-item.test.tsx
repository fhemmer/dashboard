import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { NewsItem } from "../types";
import { NewsItemComponent } from "./news-item";

describe("NewsItemComponent", () => {
  const mockItem: NewsItem = {
    id: "1",
    title: "Test News Title",
    summary: "This is a test summary for the news item.",
    source: "Test Source",
    url: "https://example.com/news",
    publishedAt: new Date("2025-12-20T10:00:00Z"),
    category: "dev",
  };

  describe("compact mode", () => {
    it("renders title and source", () => {
      render(<NewsItemComponent item={mockItem} compact />);

      expect(screen.getByText("Test News Title")).toBeDefined();
      expect(screen.getByText("Test Source")).toBeDefined();
    });

    it("renders category badge", () => {
      render(<NewsItemComponent item={mockItem} compact />);

      expect(screen.getByText("dev")).toBeDefined();
    });

    it("renders link with correct href", () => {
      render(<NewsItemComponent item={mockItem} compact />);

      const link = screen.getByRole("link");
      expect(link.getAttribute("href")).toBe("https://example.com/news");
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    });

    it("renders source badge with icon", () => {
      render(<NewsItemComponent item={mockItem} compact />);

      const sourceBadge = screen.getByText("Test Source").closest("span");
      expect(sourceBadge).toBeDefined();
      expect(sourceBadge?.querySelector("svg")).toBeDefined();
    });

    it("renders NEW badge when isNew is true", () => {
      render(<NewsItemComponent item={mockItem} compact isNew />);

      expect(screen.getByText("NEW")).toBeDefined();
    });

    it("does not render NEW badge when isNew is false", () => {
      render(<NewsItemComponent item={mockItem} compact isNew={false} />);

      expect(screen.queryByText("NEW")).toBeNull();
    });
  });

  describe("full mode", () => {
    it("renders title, summary, and source", () => {
      render(<NewsItemComponent item={mockItem} />);

      expect(screen.getByText("Test News Title")).toBeDefined();
      expect(screen.getByText("This is a test summary for the news item.")).toBeDefined();
      expect(screen.getByText("Test Source")).toBeDefined();
    });

    it("renders category badge", () => {
      render(<NewsItemComponent item={mockItem} />);

      expect(screen.getByText("dev")).toBeDefined();
    });

    it("renders source badge with icon", () => {
      render(<NewsItemComponent item={mockItem} />);

      const sourceBadge = screen.getByText("Test Source").closest("span");
      expect(sourceBadge).toBeDefined();
      expect(sourceBadge?.querySelector("svg")).toBeDefined();
    });

    it("renders NEW badge when isNew is true", () => {
      render(<NewsItemComponent item={mockItem} isNew />);

      expect(screen.getByText("NEW")).toBeDefined();
    });

    it("applies highlighted styling when isNew is true", () => {
      render(<NewsItemComponent item={mockItem} isNew />);

      const link = screen.getByRole("link");
      expect(link.className).toContain("border-primary/50");
      expect(link.className).toContain("bg-primary/5");
    });

    it("does not apply highlighted styling when isNew is false", () => {
      render(<NewsItemComponent item={mockItem} isNew={false} />);

      const link = screen.getByRole("link");
      expect(link.className).not.toContain("border-primary/50");
    });
  });

  describe("category colors", () => {
    it.each([
      ["tech", "text-blue-500"],
      ["dev", "text-green-500"],
      ["ai", "text-purple-500"],
      ["general", "text-gray-500"],
    ] as const)("renders %s category with correct color", (category, expectedClass) => {
      const item = { ...mockItem, category };
      render(<NewsItemComponent item={item} />);

      const badge = screen.getByText(category);
      expect(badge.className).toContain(expectedClass);
    });
  });

  describe("source branding", () => {
    it.each([
      ["Hacker News", "text-orange-600"],
      ["AP", "text-red-600"],
      ["BBC Tech", "text-rose-600"],
      ["VS Code", "text-cyan-600"],
    ])("renders %s with branded colors", (source, expectedClass) => {
      const item = { ...mockItem, source };
      render(<NewsItemComponent item={item} />);

      const sourceBadge = screen.getByText(source).closest("span");
      expect(sourceBadge?.className).toContain(expectedClass);
    });

    it("renders unknown source with default styling", () => {
      render(<NewsItemComponent item={mockItem} />);

      const sourceBadge = screen.getByText("Test Source").closest("span");
      expect(sourceBadge?.className).toContain("text-gray-600");
    });
  });

  describe("relative time formatting", () => {
    it("shows relative time for recent items", () => {
      const recentItem = {
        ...mockItem,
        publishedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      };
      render(<NewsItemComponent item={recentItem} />);

      expect(screen.getByText("30m ago")).toBeDefined();
    });

    it("shows hours for items within a day", () => {
      const hourAgoItem = {
        ...mockItem,
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      };
      render(<NewsItemComponent item={hourAgoItem} />);

      expect(screen.getByText("3h ago")).toBeDefined();
    });

    it("shows 'Yesterday' for items from yesterday", () => {
      const yesterdayItem = {
        ...mockItem,
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 24 hours ago
      };
      render(<NewsItemComponent item={yesterdayItem} />);

      expect(screen.getByText("Yesterday")).toBeDefined();
    });

    it("shows days for items within a week", () => {
      const daysAgoItem = {
        ...mockItem,
        publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      };
      render(<NewsItemComponent item={daysAgoItem} />);

      expect(screen.getByText("3d ago")).toBeDefined();
    });

    it("shows date for items older than a week", () => {
      const oldItem = {
        ...mockItem,
        publishedAt: new Date("2025-01-01T10:00:00Z"),
      };
      render(<NewsItemComponent item={oldItem} />);

      // The exact format depends on locale, just check it's not a relative format
      const timeElements = screen.queryByText(/ago$/);
      expect(timeElements).toBeNull();
    });
  });
});
