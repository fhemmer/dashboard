import { describe, expect, it } from "vitest";
import {
  formatMailAddress,
  getMailAccountCacheKey,
  getMailMessagesCacheKey,
  getMailSummaryCacheKey,
  getProviderColor,
  getProviderDisplayName,
  type MailAddress,
} from "./types";

describe("mail types", () => {
  describe("formatMailAddress", () => {
    it("should format address with name", () => {
      const address: MailAddress = {
        name: "John Doe",
        email: "john@example.com",
      };

      expect(formatMailAddress(address)).toBe("John Doe <john@example.com>");
    });

    it("should format address without name", () => {
      const address: MailAddress = {
        email: "john@example.com",
      };

      expect(formatMailAddress(address)).toBe("john@example.com");
    });

    it("should handle empty name", () => {
      const address: MailAddress = {
        name: "",
        email: "john@example.com",
      };

      expect(formatMailAddress(address)).toBe("john@example.com");
    });
  });

  describe("getProviderDisplayName", () => {
    it("should return display name for outlook", () => {
      expect(getProviderDisplayName("outlook")).toBe("Outlook");
    });

    it("should return display name for gmail", () => {
      expect(getProviderDisplayName("gmail")).toBe("Gmail");
    });

    it("should return display name for imap", () => {
      expect(getProviderDisplayName("imap")).toBe("IMAP");
    });
  });

  describe("getProviderColor", () => {
    it("should return color for outlook", () => {
      expect(getProviderColor("outlook")).toBe("blue");
    });

    it("should return color for gmail", () => {
      expect(getProviderColor("gmail")).toBe("red");
    });

    it("should return color for imap", () => {
      expect(getProviderColor("imap")).toBe("gray");
    });
  });

  describe("cache key helpers", () => {
    it("should generate mail summary cache key", () => {
      const userId = "user-123";
      expect(getMailSummaryCacheKey(userId)).toBe("mail:summary:user-123");
    });

    it("should generate mail messages cache key with default folder", () => {
      const accountId = "account-456";
      expect(getMailMessagesCacheKey(accountId)).toBe(
        "mail:messages:account-456:inbox"
      );
    });

    it("should generate mail messages cache key with custom folder", () => {
      const accountId = "account-456";
      expect(getMailMessagesCacheKey(accountId, "sent")).toBe(
        "mail:messages:account-456:sent"
      );
    });

    it("should generate mail account cache key", () => {
      const accountId = "account-789";
      expect(getMailAccountCacheKey(accountId)).toBe(
        "mail:account:account-789"
      );
    });
  });
});
