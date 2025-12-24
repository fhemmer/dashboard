import { describe, it, expect } from "vitest";
import type {
  ParsedFeedItem,
  ParseFeedResult,
  FetchSourceResult,
  FetchNewsResult,
  FetcherSettings,
  FetchableSource,
  UserWithExclusions,
} from "./types";

describe("news-fetcher types", () => {
  it("should allow creating ParsedFeedItem", () => {
    const item: ParsedFeedItem = {
      title: "Test",
      link: "https://example.com",
      guid: "guid-1",
      summary: "Summary",
      imageUrl: null,
      publishedAt: new Date(),
    };
    expect(item.title).toBe("Test");
  });

  it("should allow creating ParseFeedResult with items", () => {
    const result: ParseFeedResult = {
      items: [
        {
          title: "Test",
          link: "https://example.com",
          guid: "guid-1",
          summary: null,
          imageUrl: null,
          publishedAt: new Date(),
        },
      ],
      error: null,
    };
    expect(result.items).toHaveLength(1);
  });

  it("should allow creating ParseFeedResult with error", () => {
    const result: ParseFeedResult = {
      items: [],
      error: "Parse failed",
    };
    expect(result.error).toBe("Parse failed");
  });

  it("should allow creating FetchSourceResult", () => {
    const result: FetchSourceResult = {
      sourceId: "src-1",
      sourceName: "Test Feed",
      newItemsCount: 5,
      error: null,
    };
    expect(result.newItemsCount).toBe(5);
  });

  it("should allow creating FetchNewsResult", () => {
    const result: FetchNewsResult = {
      success: true,
      sourcesProcessed: 3,
      totalNewItems: 10,
      notificationsCreated: 5,
      notificationsDeleted: 2,
      errors: [],
      durationMs: 1500,
    };
    expect(result.success).toBe(true);
  });

  it("should allow creating FetcherSettings", () => {
    const settings: FetcherSettings = {
      fetchIntervalMinutes: 15,
      notificationRetentionDays: 30,
      lastFetchAt: new Date(),
    };
    expect(settings.fetchIntervalMinutes).toBe(15);
  });

  it("should allow FetcherSettings with null lastFetchAt", () => {
    const settings: FetcherSettings = {
      fetchIntervalMinutes: 15,
      notificationRetentionDays: 30,
      lastFetchAt: null,
    };
    expect(settings.lastFetchAt).toBeNull();
  });

  it("should allow creating FetchableSource", () => {
    const source: FetchableSource = {
      id: "src-1",
      url: "https://example.com/feed.xml",
      name: "Test Feed",
    };
    expect(source.name).toBe("Test Feed");
  });

  it("should allow creating UserWithExclusions", () => {
    const user: UserWithExclusions = {
      userId: "user-1",
      excludedSourceIds: ["src-1", "src-2"],
    };
    expect(user.excludedSourceIds).toHaveLength(2);
  });

  it("should allow empty excludedSourceIds", () => {
    const user: UserWithExclusions = {
      userId: "user-1",
      excludedSourceIds: [],
    };
    expect(user.excludedSourceIds).toHaveLength(0);
  });
});
