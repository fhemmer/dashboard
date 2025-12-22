import { describe, expect, it, vi } from "vitest";
import { fetchAllNews } from "./fetcher";

// Mock sources to control test data
vi.mock("./sources", () => ({
  rssSources: [
    {
      name: "Test Source 1",
      url: "https://test1.example.com/rss",
      category: "tech",
    },
    {
      name: "Test Source 2",
      url: "https://test2.example.com/rss",
      category: "ai",
    },
  ],
  MAX_AGE_DAYS: 5,
  MAX_ITEMS_PER_SOURCE: 20,
}));

const mockRssXml = (title: string, daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `<?xml version="1.0"?>
    <rss version="2.0">
      <channel>
        <item>
          <title>${title}</title>
          <link>https://example.com/${title.toLowerCase().replace(/\s/g, "-")}</link>
          <pubDate>${date.toUTCString()}</pubDate>
          <description>Description for ${title}</description>
        </item>
      </channel>
    </rss>`;
};

const mockMultiItemRssXml = (items: Array<{ title: string; daysAgo: number }>) => {
  const itemsXml = items
    .map(({ title, daysAgo }) => {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      return `<item>
          <title>${title}</title>
          <link>https://example.com/${title.toLowerCase().replace(/\s/g, "-")}</link>
          <pubDate>${date.toUTCString()}</pubDate>
          <description>Description for ${title}</description>
        </item>`;
    })
    .join("\n");

  return `<?xml version="1.0"?>
    <rss version="2.0">
      <channel>
        ${itemsXml}
      </channel>
    </rss>`;
};

type FetchUrl = string | URL | Request;

describe("News Fetcher", () => {
  describe("fetchAllNews", () => {
    it("fetches from all sources and merges results", async () => {
      global.fetch = vi.fn((url: FetchUrl) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (urlStr.includes("test1")) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockRssXml("Article From Source 1", 1)),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockRssXml("Article From Source 2", 0)),
        } as Response);
      });

      const result = await fetchAllNews();

      expect(result.items).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it("records errors for failed fetches", async () => {
      global.fetch = vi.fn((url: FetchUrl) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (urlStr.includes("test1")) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockRssXml("Working Source", 0)),
        } as Response);
      });

      const result = await fetchAllNews();

      expect(result.items).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].source).toBe("Test Source 1");
      expect(result.errors[0].message).toContain("500");
    });

    it("records errors for network failures", async () => {
      global.fetch = vi.fn((url: FetchUrl) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (urlStr.includes("test1")) {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockRssXml("Working Source", 0)),
        } as Response);
      });

      const result = await fetchAllNews();

      expect(result.items).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe("Network error");
    });

    it("filters out old items", async () => {
      global.fetch = vi.fn((url: FetchUrl) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (urlStr.includes("test1")) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockRssXml("Old Article", 10)), // 10 days old
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockRssXml("New Article", 1)), // 1 day old
        } as Response);
      });

      const result = await fetchAllNews();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("New Article");
    });

    it("sorts items by date (newest first)", async () => {
      global.fetch = vi.fn((url: FetchUrl) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (urlStr.includes("test1")) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(mockRssXml("Older Article", 2)),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockRssXml("Newer Article", 0)),
        } as Response);
      });

      const result = await fetchAllNews();

      expect(result.items[0].title).toBe("Newer Article");
      expect(result.items[1].title).toBe("Older Article");
    });

    it("handles unknown errors gracefully", async () => {
      global.fetch = vi.fn(() => Promise.reject("Unknown error type"));

      const result = await fetchAllNews();

      expect(result.items).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].message).toBe("Unknown error");
    });

    it("includes User-Agent header", async () => {
      let capturedHeaders: HeadersInit | undefined;
      global.fetch = vi.fn((_, init) => {
        capturedHeaders = init?.headers;
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockRssXml("Test", 0)),
        } as Response);
      });

      await fetchAllNews();

      expect(capturedHeaders).toBeDefined();
      expect((capturedHeaders as Record<string, string>)["User-Agent"]).toContain("Mozilla");
    });

    it("sorts items within a source by date when multiple items returned", async () => {
      global.fetch = vi.fn((url: FetchUrl) => {
        const urlStr = typeof url === "string" ? url : url.toString();
        if (urlStr.includes("test1")) {
          // Return multiple items out of order to test the sort
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve(
                mockMultiItemRssXml([
                  { title: "Oldest Item", daysAgo: 3 },
                  { title: "Newest Item", daysAgo: 0 },
                  { title: "Middle Item", daysAgo: 1 },
                ])
              ),
          } as Response);
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockRssXml("Other Source", 0)),
        } as Response);
      });

      const result = await fetchAllNews();

      // Find items from test source 1 - they should be sorted by date
      const test1Items = result.items.filter((item) =>
        ["Oldest Item", "Newest Item", "Middle Item"].includes(item.title)
      );
      expect(test1Items).toHaveLength(3);
      expect(test1Items[0].title).toBe("Newest Item");
      expect(test1Items[1].title).toBe("Middle Item");
      expect(test1Items[2].title).toBe("Oldest Item");
    });
  });
});
