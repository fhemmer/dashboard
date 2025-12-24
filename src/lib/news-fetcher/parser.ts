/**
 * RSS 2.0 and Atom feed parser.
 */

import type { ParsedFeedItem, ParseFeedResult } from "./types";

/**
 * Parse an RSS 2.0 or Atom feed from XML text.
 */
export function parseFeed(xml: string, sourceUrl: string): ParseFeedResult {
  try {
    // Detect feed type and parse accordingly
    if (xml.includes("<feed") && xml.includes("xmlns=\"http://www.w3.org/2005/Atom\"")) {
      return parseAtomFeed(xml, sourceUrl);
    }

    // Default to RSS 2.0
    return parseRssFeed(xml, sourceUrl);
  } catch (error) {
    return {
      items: [],
      error: error instanceof Error ? error.message : "Unknown parse error",
    };
  }
}

/**
 * Parse an RSS 2.0 feed.
 */
function parseRssFeed(xml: string, sourceUrl: string): ParseFeedResult {
  const items: ParsedFeedItem[] = [];

  // Extract all <item> elements
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const item = parseRssItem(itemXml, sourceUrl);
    if (item) {
      items.push(item);
    }
  }

  return { items, error: null };
}

/**
 * Parse a single RSS item.
 */
function parseRssItem(xml: string, sourceUrl: string): ParsedFeedItem | null {
  const title = extractTagContent(xml, "title");
  const link = extractTagContent(xml, "link") || extractAttr(xml, "link", "href");
  const guid =
    extractTagContent(xml, "guid") || extractTagContent(xml, "link") || generateGuid(title ?? "", sourceUrl);
  const description = extractTagContent(xml, "description") || extractTagContent(xml, "content:encoded");
  const pubDate = extractTagContent(xml, "pubDate") || extractTagContent(xml, "dc:date");

  // Try to extract image from various sources
  const imageUrl =
    extractAttr(xml, "media:content", "url") ||
    extractAttr(xml, "media:thumbnail", "url") ||
    extractAttr(xml, "enclosure", "url") ||
    extractImageFromContent(description);

  if (!title || !link) {
    return null;
  }

  return {
    title: decodeHtmlEntities(title.trim()),
    link: link.trim(),
    guid: guid.trim(),
    summary: description ? truncateSummary(stripHtml(decodeHtmlEntities(description))) : null,
    imageUrl: imageUrl?.trim() || null,
    publishedAt: pubDate ? new Date(pubDate) : new Date(),
  };
}

/**
 * Parse an Atom feed.
 */
function parseAtomFeed(xml: string, sourceUrl: string): ParseFeedResult {
  const items: ParsedFeedItem[] = [];

  // Extract all <entry> elements
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];
    const item = parseAtomEntry(entryXml, sourceUrl);
    if (item) {
      items.push(item);
    }
  }

  return { items, error: null };
}

/**
 * Parse a single Atom entry.
 */
function parseAtomEntry(xml: string, sourceUrl: string): ParsedFeedItem | null {
  const title = extractTagContent(xml, "title");
  const link = extractAttr(xml, 'link[rel="alternate"]', "href") || extractAttr(xml, "link", "href");
  const id = extractTagContent(xml, "id");
  const summary = extractTagContent(xml, "summary") || extractTagContent(xml, "content");
  const updated = extractTagContent(xml, "updated") || extractTagContent(xml, "published");

  // Try to extract image
  const imageUrl = extractAttr(xml, "media:content", "url") || extractAttr(xml, "media:thumbnail", "url");

  if (!title || !link) {
    return null;
  }

  return {
    title: decodeHtmlEntities(title.trim()),
    link: link.trim(),
    guid: id?.trim() || generateGuid(title, sourceUrl),
    summary: summary ? truncateSummary(stripHtml(decodeHtmlEntities(summary))) : null,
    imageUrl: imageUrl?.trim() || null,
    publishedAt: updated ? new Date(updated) : new Date(),
  };
}

/**
 * Extract content from an XML tag.
 */
function extractTagContent(xml: string, tagName: string): string | null {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tagName}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, "i");
  const cdataMatch = cdataRegex.exec(xml);
  if (cdataMatch) {
    return cdataMatch[1];
  }

  // Handle regular content
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = regex.exec(xml);
  return match ? match[1] : null;
}

/**
 * Extract an attribute value from an XML tag.
 */
function extractAttr(xml: string, tagName: string, attrName: string): string | null {
  // Handle attribute selectors like link[rel="alternate"]
  let tagPattern = tagName;
  let attrFilter: { name: string; value: string } | null = null;

  const selectorMatch = tagName.match(/^(\w+)\[(\w+)="([^"]+)"\]$/);
  if (selectorMatch) {
    tagPattern = selectorMatch[1];
    attrFilter = { name: selectorMatch[2], value: selectorMatch[3] };
  }

  const tagRegex = new RegExp(`<${tagPattern}([^>]*)(?:/>|>[^<]*</${tagPattern}>)`, "gi");
  let match;

  while ((match = tagRegex.exec(xml)) !== null) {
    const attrs = match[1];

    // Check filter if present
    if (attrFilter) {
      const filterRegex = new RegExp(`${attrFilter.name}\\s*=\\s*["']${attrFilter.value}["']`, "i");
      if (!filterRegex.test(attrs)) {
        continue;
      }
    }

    // Extract the requested attribute
    const attrRegex = new RegExp(`${attrName}\\s*=\\s*["']([^"']+)["']`, "i");
    const attrMatch = attrRegex.exec(attrs);
    if (attrMatch) {
      return attrMatch[1];
    }
  }

  return null;
}

/**
 * Extract image URL from HTML content.
 */
function extractImageFromContent(html: string | null): string | null {
  if (!html) return null;
  // First decode HTML entities so we can match <img> tags
  const decoded = decodeHtmlEntities(html);
  const imgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["']/i;
  const match = imgRegex.exec(decoded);
  return match ? match[1] : null;
}

/**
 * Generate a GUID from title and source URL.
 */
function generateGuid(title: string, sourceUrl: string): string {
  return `${sourceUrl}#${title}`;
}

/**
 * Decode HTML entities.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Strip HTML tags from text.
 */
function stripHtml(html: string): string {
  // Use a non-backtracking pattern for HTML tags
  return html.replace(/<[^<>]*>/g, "").trim();
}

/**
 * Truncate summary to reasonable length.
 */
function truncateSummary(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}

/**
 * Create a SHA-256 hash of a string for guid_hash.
 */
export async function hashGuid(guid: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(guid);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
