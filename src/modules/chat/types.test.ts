/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { formatMessageDate, truncateMessage } from "./types";

describe("chat types", () => {
  describe("formatMessageDate", () => {
    it("should return 'Just now' for dates less than 1 minute ago", () => {
      const now = new Date();
      expect(formatMessageDate(now)).toBe("Just now");
    });

    it("should return minutes ago for dates less than 1 hour ago", () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      expect(formatMessageDate(fiveMinutesAgo)).toBe("5m ago");
    });

    it("should return hours ago for dates less than 24 hours ago", () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
      expect(formatMessageDate(threeHoursAgo)).toBe("3h ago");
    });

    it("should return days ago for dates less than 7 days ago", () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      expect(formatMessageDate(twoDaysAgo)).toBe("2d ago");
    });

    it("should return formatted date for dates more than 7 days ago", () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const result = formatMessageDate(tenDaysAgo);
      expect(result).toBe(tenDaysAgo.toLocaleDateString());
    });

    it("should handle boundary at exactly 60 minutes", () => {
      const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);
      expect(formatMessageDate(sixtyMinutesAgo)).toBe("1h ago");
    });

    it("should handle boundary at exactly 24 hours", () => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      expect(formatMessageDate(twentyFourHoursAgo)).toBe("1d ago");
    });
  });

  describe("truncateMessage", () => {
    it("should return full content if shorter than maxLength", () => {
      expect(truncateMessage("Hello", 100)).toBe("Hello");
    });

    it("should truncate content longer than maxLength", () => {
      const longText = "a".repeat(150);
      const result = truncateMessage(longText, 100);
      expect(result.length).toBe(103); // 100 chars + "..."
      expect(result.endsWith("...")).toBe(true);
    });

    it("should use default maxLength of 100", () => {
      const longText = "a".repeat(150);
      const result = truncateMessage(longText);
      expect(result.length).toBe(103);
    });

    it("should handle content exactly at maxLength", () => {
      const exactText = "a".repeat(100);
      expect(truncateMessage(exactText, 100)).toBe(exactText);
    });

    it("should trim whitespace at truncation point", () => {
      const text = "Hello world     and more text after";
      const result = truncateMessage(text, 16);
      expect(result).toBe("Hello world...");
    });
  });
});
