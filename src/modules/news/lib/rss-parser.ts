import { XMLParser } from "fast-xml-parser";
import type { NewsItem, RssSource } from "../types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

/**
 * Generate a stable ID from a URL using a simple hash.
 * Combines source and URL to reduce collision probability.
 */
export function generateId(url: string, source?: string): string {
  const input = source ? `${source}:${url}` : url;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  // Use a longer base36 representation to reduce collisions
  const hashStr = Math.abs(hash).toString(36);
  // Add URL length as additional entropy
  const lengthStr = url.length.toString(36);
  return `${hashStr}${lengthStr}`;
}

/**
 * Strip HTML tags and decode common entities.
 */
export function stripHtml(html: string): string {
  return (
    html
      // eslint-disable-next-line sonarjs/slow-regex -- False positive: [^>]* is linear O(n)
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/**
 * Truncate text to a maximum length, adding ellipsis if needed.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3).trim() + "...";
}

/**
 * Extract text content from various XML node formats.
 */
export function extractText(node: unknown): string {
  if (typeof node === "string") return node;
  if (node === null || node === undefined) return "";
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if ("#cdata-section" in obj) return String(obj["#cdata-section"]);
    if ("#text" in obj) return String(obj["#text"]);
    if ("_" in obj) return String(obj["_"]);
  }
  return String(node);
}

/**
 * Extract link from various formats (string, array, object with href).
 */
export function extractLink(link: unknown): string {
  if (typeof link === "string") return link;
  if (Array.isArray(link)) {
    for (const l of link) {
      const href = extractLink(l);
      if (href) return href;
    }
    return "";
  }
  if (link && typeof link === "object") {
    const obj = link as Record<string, unknown>;
    if ("@_href" in obj) return String(obj["@_href"]);
    if ("href" in obj) return String(obj["href"]);
    if ("#text" in obj) return String(obj["#text"]);
  }
  return "";
}

/**
 * Parse a date string, trying multiple formats.
 */
export function parseDate(dateStr: unknown): Date | null {
  if (!dateStr) return null;
  const str = String(dateStr);
  const date = new Date(str);
  if (!isNaN(date.getTime())) return date;
  return null;
}

/**
 * Extract summary from description or content:encoded fields.
 */
function extractSummary(item: Record<string, unknown>): string {
  const description = extractText(
    item["description"] || item["content:encoded"] || item["summary"] || item["content"] || ""
  );
  const stripped = stripHtml(description);
  return truncate(stripped, 200);
}

interface RssItem {
  title?: unknown;
  link?: unknown;
  pubDate?: unknown;
  published?: unknown;
  updated?: unknown;
  description?: unknown;
  "content:encoded"?: unknown;
  summary?: unknown;
  content?: unknown;
}

interface RssChannel {
  item?: RssItem | RssItem[];
}

interface AtomFeed {
  entry?: RssItem | RssItem[];
}

interface ParsedXml {
  rss?: { channel?: RssChannel };
  feed?: AtomFeed;
}

/**
 * Parse RSS/Atom XML content into NewsItem array.
 */
export function parseRssFeed(
  xml: string,
  source: RssSource
): NewsItem[] {
  const parsed = parser.parse(xml) as ParsedXml;
  const items: NewsItem[] = [];

  // Try RSS 2.0 format
  let entries: RssItem[] = [];
  if (parsed.rss?.channel?.item) {
    const channelItems = parsed.rss.channel.item;
    entries = Array.isArray(channelItems) ? channelItems : [channelItems];
  }
  // Try Atom format
  else if (parsed.feed?.entry) {
    const feedEntries = parsed.feed.entry;
    entries = Array.isArray(feedEntries) ? feedEntries : [feedEntries];
  }

  for (const entry of entries) {
    const title = extractText(entry.title);
    const link = extractLink(entry.link);
    const pubDate = parseDate(
      entry.pubDate || entry.published || entry.updated
    );

    // Skip items without required fields
    if (!title || !link || !pubDate) continue;

    const summary = extractSummary(entry as Record<string, unknown>);

    items.push({
      id: generateId(link, source.name),
      title: stripHtml(title),
      summary,
      source: source.name,
      url: link,
      publishedAt: pubDate,
      category: source.category,
    });
  }

  return items;
}
