import { describe, expect, it } from "vitest";
import type {
    FetchPRsResult,
    GitHubAccount,
    GitHubAccountWithPRs,
    PRCategory,
    PRCategoryData,
    PullRequest,
} from "./index";
import {
    disconnectGitHubAccount,
    getGitHubAccounts,
    getPullRequests,
    PRItem,
    PRTree,
    PRWidget,
    updateAccountLabel,
} from "./index";

describe("github-prs index exports", () => {
  it("exports actions", () => {
    expect(disconnectGitHubAccount).toBeDefined();
    expect(getGitHubAccounts).toBeDefined();
    expect(getPullRequests).toBeDefined();
    expect(updateAccountLabel).toBeDefined();
  });

  it("exports components", () => {
    expect(PRItem).toBeDefined();
    expect(PRTree).toBeDefined();
    expect(PRWidget).toBeDefined();
  });

  it("exports types", () => {
    // Type-only exports are verified at compile time
    // This test verifies the barrel file structure
    const account: GitHubAccount = {
      id: "1",
      userId: "user-1",
      githubUserId: 123,
      githubUsername: "test",
      avatarUrl: null,
      accountLabel: "Test",
      createdAt: new Date(),
    };
    expect(account).toBeDefined();

    const pr: PullRequest = {
      id: 1,
      number: 1,
      title: "Test",
      htmlUrl: "https://github.com",
      state: "open",
      draft: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      repository: { fullName: "test/repo", htmlUrl: "https://github.com/test/repo" },
      user: { login: "user", avatarUrl: "https://example.com" },
      labels: [],
    };
    expect(pr).toBeDefined();

    const category: PRCategory = "review-requested";
    expect(category).toBeDefined();

    const categoryData: PRCategoryData = {
      category: "created",
      label: "Created By Me",
      items: [],
    };
    expect(categoryData).toBeDefined();

    const accountWithPRs: GitHubAccountWithPRs = {
      account,
      categories: [categoryData],
    };
    expect(accountWithPRs).toBeDefined();

    const result: FetchPRsResult = {
      accounts: [accountWithPRs],
      errors: [],
    };
    expect(result).toBeDefined();
  });
});
