import { describe, expect, it } from "vitest";
import type {
    FetchPRsResult,
    GitHubAccount,
    GitHubAccountWithPRs,
    PRCategory,
    PRCategoryData,
    PullRequest,
} from "./types";

describe("github-prs types", () => {
  describe("GitHubAccount", () => {
    it("has correct shape", () => {
      const account: GitHubAccount = {
        id: "123",
        userId: "user-456",
        githubUserId: 789,
        githubUsername: "testuser",
        avatarUrl: "https://example.com/avatar.png",
        accountLabel: "Personal",
        createdAt: new Date("2023-01-01"),
      };

      expect(account.id).toBe("123");
      expect(account.userId).toBe("user-456");
      expect(account.githubUserId).toBe(789);
      expect(account.githubUsername).toBe("testuser");
      expect(account.avatarUrl).toBe("https://example.com/avatar.png");
      expect(account.accountLabel).toBe("Personal");
      expect(account.createdAt).toEqual(new Date("2023-01-01"));
    });

    it("allows null avatarUrl", () => {
      const account: GitHubAccount = {
        id: "123",
        userId: "user-456",
        githubUserId: 789,
        githubUsername: "testuser",
        avatarUrl: null,
        accountLabel: "Work",
        createdAt: new Date(),
      };

      expect(account.avatarUrl).toBeNull();
    });
  });

  describe("PullRequest", () => {
    it("has correct shape", () => {
      const pr: PullRequest = {
        id: 1,
        number: 42,
        title: "Add new feature",
        htmlUrl: "https://github.com/owner/repo/pull/42",
        state: "open",
        draft: false,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
        repository: {
          fullName: "owner/repo",
          htmlUrl: "https://github.com/owner/repo",
        },
        user: {
          login: "author",
          avatarUrl: "https://example.com/avatar.png",
        },
        labels: [{ name: "bug", color: "ff0000" }],
      };

      expect(pr.id).toBe(1);
      expect(pr.number).toBe(42);
      expect(pr.state).toBe("open");
      expect(pr.draft).toBe(false);
      expect(pr.repository.fullName).toBe("owner/repo");
      expect(pr.user.login).toBe("author");
      expect(pr.labels).toHaveLength(1);
    });

    it("supports closed state", () => {
      const pr: PullRequest = {
        id: 1,
        number: 1,
        title: "Closed PR",
        htmlUrl: "https://github.com/owner/repo/pull/1",
        state: "closed",
        draft: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        repository: { fullName: "owner/repo", htmlUrl: "https://github.com/owner/repo" },
        user: { login: "user", avatarUrl: "https://example.com" },
        labels: [],
      };

      expect(pr.state).toBe("closed");
      expect(pr.draft).toBe(true);
    });
  });

  describe("PRCategory", () => {
    it("supports all category types", () => {
      const categories: PRCategory[] = ["review-requested", "created", "all-open"];

      expect(categories).toContain("review-requested");
      expect(categories).toContain("created");
      expect(categories).toContain("all-open");
    });
  });

  describe("PRCategoryData", () => {
    it("has correct shape", () => {
      const categoryData: PRCategoryData = {
        category: "review-requested",
        label: "Waiting For My Review",
        items: [],
      };

      expect(categoryData.category).toBe("review-requested");
      expect(categoryData.label).toBe("Waiting For My Review");
      expect(categoryData.items).toEqual([]);
    });
  });

  describe("GitHubAccountWithPRs", () => {
    it("has correct shape", () => {
      const accountWithPRs: GitHubAccountWithPRs = {
        account: {
          id: "123",
          userId: "user-456",
          githubUserId: 789,
          githubUsername: "testuser",
          avatarUrl: null,
          accountLabel: "Personal",
          createdAt: new Date(),
        },
        categories: [
          { category: "review-requested", label: "Waiting For My Review", items: [] },
          { category: "created", label: "Created By Me", items: [] },
          { category: "all-open", label: "All Open", items: [] },
        ],
      };

      expect(accountWithPRs.account.id).toBe("123");
      expect(accountWithPRs.categories).toHaveLength(3);
      expect(accountWithPRs.error).toBeUndefined();
    });

    it("supports error field", () => {
      const accountWithError: GitHubAccountWithPRs = {
        account: {
          id: "123",
          userId: "user-456",
          githubUserId: 789,
          githubUsername: "testuser",
          avatarUrl: null,
          accountLabel: "Personal",
          createdAt: new Date(),
        },
        categories: [],
        error: "Failed to fetch PRs",
      };

      expect(accountWithError.error).toBe("Failed to fetch PRs");
    });
  });

  describe("FetchPRsResult", () => {
    it("has correct shape", () => {
      const result: FetchPRsResult = {
        accounts: [],
        errors: [{ accountId: "123", message: "Error message" }],
      };

      expect(result.accounts).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].accountId).toBe("123");
      expect(result.errors[0].message).toBe("Error message");
    });
  });
});
