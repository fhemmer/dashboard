import { describe, it, expect } from "vitest";
import { parseFeed, hashGuid } from "./parser";

describe("parser", () => {
  describe("parseFeed", () => {
    describe("RSS 2.0 feeds", () => {
      it("should parse a basic RSS 2.0 feed", () => {
        const xml = `
          <?xml version="1.0" encoding="UTF-8"?>
          <rss version="2.0">
            <channel>
              <title>Test Feed</title>
              <item>
                <title>Test Article</title>
                <link>https://example.com/article</link>
                <guid>https://example.com/article</guid>
                <description>This is a test article.</description>
                <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
              </item>
            </channel>
          </rss>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toMatchObject({
          title: "Test Article",
          link: "https://example.com/article",
          guid: "https://example.com/article",
          summary: "This is a test article.",
        });
      });

      it("should parse multiple items", () => {
        const xml = `
          <rss version="2.0">
            <channel>
              <item>
                <title>Article 1</title>
                <link>https://example.com/1</link>
              </item>
              <item>
                <title>Article 2</title>
                <link>https://example.com/2</link>
              </item>
              <item>
                <title>Article 3</title>
                <link>https://example.com/3</link>
              </item>
            </channel>
          </rss>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items).toHaveLength(3);
        expect(result.items[0].title).toBe("Article 1");
        expect(result.items[1].title).toBe("Article 2");
        expect(result.items[2].title).toBe("Article 3");
      });

      it("should handle CDATA sections", () => {
        const xml = `
          <rss version="2.0">
            <channel>
              <item>
                <title><![CDATA[Article with <special> characters]]></title>
                <link>https://example.com/article</link>
                <description><![CDATA[<p>HTML content</p>]]></description>
              </item>
            </channel>
          </rss>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items).toHaveLength(1);
        expect(result.items[0].title).toBe("Article with <special> characters");
        expect(result.items[0].summary).toBe("HTML content");
      });

      it("should decode HTML entities", () => {
        const xml = `
          <rss version="2.0">
            <channel>
              <item>
                <title>Tom &amp; Jerry&#39;s &quot;Adventure&quot;</title>
                <link>https://example.com/article</link>
              </item>
            </channel>
          </rss>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items[0].title).toBe("Tom & Jerry's \"Adventure\"");
      });

      it("should extract media content images", () => {
        const xml = `
          <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
            <channel>
              <item>
                <title>Article with image</title>
                <link>https://example.com/article</link>
                <media:content url="https://example.com/image.jpg" />
              </item>
            </channel>
          </rss>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items[0].imageUrl).toBe("https://example.com/image.jpg");
      });

      it("should extract enclosure images", () => {
        const xml = `
          <rss version="2.0">
            <channel>
              <item>
                <title>Article with enclosure</title>
                <link>https://example.com/article</link>
                <enclosure url="https://example.com/image.jpg" type="image/jpeg" />
              </item>
            </channel>
          </rss>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items[0].imageUrl).toBe("https://example.com/image.jpg");
      });

      it("should extract images from description HTML", () => {
        const xml = `
          <rss version="2.0">
            <channel>
              <item>
                <title>Article with inline image</title>
                <link>https://example.com/article</link>
                <description>&lt;img src="https://example.com/inline.jpg" /&gt; Some text</description>
              </item>
            </channel>
          </rss>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items[0].imageUrl).toBe("https://example.com/inline.jpg");
      });

      it("should use dc:date for pubDate", () => {
        const xml = `
          <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
            <channel>
              <item>
                <title>Article</title>
                <link>https://example.com/article</link>
                <dc:date>2024-06-15T10:30:00Z</dc:date>
              </item>
            </channel>
          </rss>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items[0].publishedAt).toEqual(new Date("2024-06-15T10:30:00Z"));
      });

      it("should skip items without title or link", () => {
        const xml = `
          <rss version="2.0">
            <channel>
              <item>
                <title>Valid Article</title>
                <link>https://example.com/valid</link>
              </item>
              <item>
                <title>No link article</title>
              </item>
              <item>
                <link>https://example.com/no-title</link>
              </item>
            </channel>
          </rss>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items).toHaveLength(1);
        expect(result.items[0].title).toBe("Valid Article");
      });

      it("should truncate long summaries", () => {
        const longText = "A".repeat(600);
        const xml = `
          <rss version="2.0">
            <channel>
              <item>
                <title>Article</title>
                <link>https://example.com/article</link>
                <description>${longText}</description>
              </item>
            </channel>
          </rss>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items[0].summary?.length).toBeLessThanOrEqual(503); // 500 + "..."
        expect(result.items[0].summary?.endsWith("...")).toBe(true);
      });

      it("should generate guid from title and source when missing", () => {
        const xml = `
          <rss version="2.0">
            <channel>
              <item>
                <title>No GUID Article</title>
                <link>https://example.com/article</link>
              </item>
            </channel>
          </rss>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items[0].guid).toBe("https://example.com/article");
      });
    });

    describe("Atom feeds", () => {
      it("should parse a basic Atom feed", () => {
        const xml = `
          <?xml version="1.0" encoding="UTF-8"?>
          <feed xmlns="http://www.w3.org/2005/Atom">
            <title>Test Atom Feed</title>
            <entry>
              <title>Test Entry</title>
              <link href="https://example.com/entry" />
              <id>urn:uuid:1234</id>
              <summary>This is a test entry.</summary>
              <updated>2024-01-01T12:00:00Z</updated>
            </entry>
          </feed>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toMatchObject({
          title: "Test Entry",
          link: "https://example.com/entry",
          guid: "urn:uuid:1234",
          summary: "This is a test entry.",
        });
      });

      it("should prefer alternate links", () => {
        const xml = `
          <feed xmlns="http://www.w3.org/2005/Atom">
            <entry>
              <title>Entry with multiple links</title>
              <link rel="self" href="https://example.com/self" />
              <link rel="alternate" href="https://example.com/alternate" />
              <id>urn:uuid:1234</id>
            </entry>
          </feed>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items[0].link).toBe("https://example.com/alternate");
      });

      it("should use content when summary is missing", () => {
        const xml = `
          <feed xmlns="http://www.w3.org/2005/Atom">
            <entry>
              <title>Entry with content</title>
              <link href="https://example.com/entry" />
              <id>urn:uuid:1234</id>
              <content>Full content here.</content>
            </entry>
          </feed>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items[0].summary).toBe("Full content here.");
      });

      it("should use published date when updated is missing", () => {
        const xml = `
          <feed xmlns="http://www.w3.org/2005/Atom">
            <entry>
              <title>Entry</title>
              <link href="https://example.com/entry" />
              <id>urn:uuid:1234</id>
              <published>2024-03-15T08:00:00Z</published>
            </entry>
          </feed>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items[0].publishedAt).toEqual(new Date("2024-03-15T08:00:00Z"));
      });
    });

    describe("error handling", () => {
      it("should return empty items for empty XML", () => {
        const result = parseFeed("", "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items).toHaveLength(0);
      });

      it("should return empty items for invalid XML structure", () => {
        const xml = "<html><body>Not a feed</body></html>";
        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items).toHaveLength(0);
      });

      it("should skip Atom entries without title or link", () => {
        const xml = `
          <feed xmlns="http://www.w3.org/2005/Atom">
            <entry>
              <title>Valid Entry</title>
              <link href="https://example.com/valid" />
              <id>urn:uuid:valid</id>
            </entry>
            <entry>
              <title>No link entry</title>
              <id>urn:uuid:nolink</id>
            </entry>
            <entry>
              <link href="https://example.com/notitle" />
              <id>urn:uuid:notitle</id>
            </entry>
          </feed>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items).toHaveLength(1);
        expect(result.items[0].title).toBe("Valid Entry");
      });

      it("should decode numeric HTML entities", () => {
        const xml = `
          <rss version="2.0">
            <channel>
              <item>
                <title>Article with &#8212; dash and &#169; copyright</title>
                <link>https://example.com/article</link>
              </item>
            </channel>
          </rss>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items[0].title).toBe("Article with — dash and © copyright");
      });

      it("should decode hex HTML entities", () => {
        const xml = `
          <rss version="2.0">
            <channel>
              <item>
                <title>Article with &#x2014; dash and &#xA9; copyright</title>
                <link>https://example.com/article</link>
              </item>
            </channel>
          </rss>
        `;

        const result = parseFeed(xml, "https://example.com/feed");

        expect(result.error).toBeNull();
        expect(result.items[0].title).toBe("Article with — dash and © copyright");
      });
    });
  });

  describe("hashGuid", () => {
    it("should generate consistent SHA-256 hash", async () => {
      const guid = "https://example.com/article-123";
      const hash1 = await hashGuid(guid);
      const hash2 = await hashGuid(guid);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex chars
    });

    it("should generate different hashes for different inputs", async () => {
      const hash1 = await hashGuid("guid-1");
      const hash2 = await hashGuid("guid-2");

      expect(hash1).not.toBe(hash2);
    });

    it("should handle special characters", async () => {
      const hash = await hashGuid("guid with spaces & <special> chars");

      expect(hash).toHaveLength(64);
    });

    it("should handle unicode characters", async () => {
      const hash = await hashGuid("日本語タイトル");

      expect(hash).toHaveLength(64);
    });
  });
});
