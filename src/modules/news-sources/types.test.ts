import { describe, expect, it } from "vitest";
import type { NewsSourceRow } from "./types";
import {
    BRAND_COLORS,
    getBrandColorClass,
    getCategoryColorClass,
    getCategoryLabel,
    SOURCE_ICONS,
    toNewsSource,
} from "./types";

describe("news-sources types", () => {
  describe("toNewsSource", () => {
    it("converts database row to NewsSource object", () => {
      const row: NewsSourceRow = {
        id: "source-123",
        url: "https://example.com/rss",
        name: "Example News",
        category: "tech",
        icon_name: "rocket",
        brand_color: "blue",
        is_active: true,
        created_by: "user-456",
        created_at: "2025-01-01T12:00:00Z",
      };

      const source = toNewsSource(row);

      expect(source).toEqual({
        id: "source-123",
        url: "https://example.com/rss",
        name: "Example News",
        category: "tech",
        iconName: "rocket",
        brandColor: "blue",
        isActive: true,
        createdBy: "user-456",
        createdAt: new Date("2025-01-01T12:00:00Z"),
      });
    });

    it("handles null created_by", () => {
      const row: NewsSourceRow = {
        id: "source-123",
        url: "https://example.com/rss",
        name: "Example News",
        category: "general",
        icon_name: "blocks",
        brand_color: "gray",
        is_active: false,
        created_by: null,
        created_at: "2025-01-01T12:00:00Z",
      };

      const source = toNewsSource(row);

      expect(source.createdBy).toBeNull();
      expect(source.isActive).toBe(false);
    });

    it("converts all categories correctly", () => {
      const categories = ["tech", "general", "ai", "dev"] as const;

      for (const category of categories) {
        const row: NewsSourceRow = {
          id: `id-${category}`,
          url: "https://example.com",
          name: "Test",
          category,
          icon_name: "blocks",
          brand_color: "gray",
          is_active: true,
          created_by: null,
          created_at: "2025-01-01T12:00:00Z",
        };

        const source = toNewsSource(row);
        expect(source.category).toBe(category);
      }
    });
  });

  describe("getBrandColorClass", () => {
    it("returns correct class for each brand color", () => {
      expect(getBrandColorClass("gray")).toBe("bg-gray-500");
      expect(getBrandColorClass("red")).toBe("bg-red-500");
      expect(getBrandColorClass("orange")).toBe("bg-orange-500");
      expect(getBrandColorClass("yellow")).toBe("bg-yellow-500");
      expect(getBrandColorClass("green")).toBe("bg-green-500");
      expect(getBrandColorClass("emerald")).toBe("bg-emerald-500");
      expect(getBrandColorClass("cyan")).toBe("bg-cyan-500");
      expect(getBrandColorClass("sky")).toBe("bg-sky-500");
      expect(getBrandColorClass("blue")).toBe("bg-blue-500");
      expect(getBrandColorClass("violet")).toBe("bg-violet-500");
      expect(getBrandColorClass("fuchsia")).toBe("bg-fuchsia-500");
      expect(getBrandColorClass("rose")).toBe("bg-rose-500");
    });
  });

  describe("getCategoryColorClass", () => {
    it("returns correct class for tech", () => {
      expect(getCategoryColorClass("tech")).toBe(
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      );
    });

    it("returns correct class for general", () => {
      expect(getCategoryColorClass("general")).toBe(
        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      );
    });

    it("returns correct class for ai", () => {
      expect(getCategoryColorClass("ai")).toBe(
        "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      );
    });

    it("returns correct class for dev", () => {
      expect(getCategoryColorClass("dev")).toBe(
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      );
    });
  });

  describe("getCategoryLabel", () => {
    it("returns correct label for tech", () => {
      expect(getCategoryLabel("tech")).toBe("Tech");
    });

    it("returns correct label for general", () => {
      expect(getCategoryLabel("general")).toBe("General");
    });

    it("returns correct label for ai", () => {
      expect(getCategoryLabel("ai")).toBe("AI");
    });

    it("returns correct label for dev", () => {
      expect(getCategoryLabel("dev")).toBe("Development");
    });
  });

  describe("constants", () => {
    it("BRAND_COLORS contains all expected colors", () => {
      expect(BRAND_COLORS).toEqual([
        "gray",
        "red",
        "orange",
        "yellow",
        "green",
        "emerald",
        "cyan",
        "sky",
        "blue",
        "violet",
        "fuchsia",
        "rose",
      ]);
    });

    it("SOURCE_ICONS contains all expected icons", () => {
      expect(SOURCE_ICONS).toEqual([
        "blocks",
        "brain",
        "binary",
        "code-2",
        "globe",
        "mic",
        "newspaper",
        "radio",
        "rocket",
        "rss",
        "tv",
      ]);
    });
  });
});
