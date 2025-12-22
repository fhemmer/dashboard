import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    fetchAllOpenPRs,
    fetchCreatedPRs,
    fetchGitHubUser,
    fetchReviewRequestedPRs,
} from "./github-client";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("github-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPRItem = {
    id: 1,
    number: 42,
    title: "Test PR",
    html_url: "https://github.com/owner/repo/pull/42",
    state: "open",
    draft: false,
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-02T00:00:00Z",
    repository_url: "https://api.github.com/repos/owner/repo",
    user: {
      login: "testuser",
      avatar_url: "https://example.com/avatar.png",
    },
    labels: [{ name: "bug", color: "ff0000" }],
  };

  const mockRepoResponse = {
    full_name: "owner/repo",
    html_url: "https://github.com/owner/repo",
  };

  describe("fetchReviewRequestedPRs", () => {
    it("fetches PRs with review-requested query", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              total_count: 1,
              incomplete_results: false,
              items: [mockPRItem],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRepoResponse),
        });

      const result = await fetchReviewRequestedPRs("testuser", "token123");

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toContain("review-requested%3Atestuser");
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Test PR");
      expect(result[0].repository.fullName).toBe("owner/repo");
    });

    it("throws error on API failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized",
      });

      await expect(fetchReviewRequestedPRs("testuser", "token123")).rejects.toThrow(
        "GitHub API error: Unauthorized"
      );
    });
  });

  describe("fetchCreatedPRs", () => {
    it("fetches PRs with author query", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              total_count: 1,
              incomplete_results: false,
              items: [mockPRItem],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRepoResponse),
        });

      const result = await fetchCreatedPRs("testuser", "token123");

      expect(mockFetch.mock.calls[0][0]).toContain("author%3Atestuser");
      expect(result).toHaveLength(1);
    });
  });

  describe("fetchAllOpenPRs", () => {
    it("fetches PRs with involves query", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              total_count: 1,
              incomplete_results: false,
              items: [mockPRItem],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRepoResponse),
        });

      const result = await fetchAllOpenPRs("testuser", "token123");

      expect(mockFetch.mock.calls[0][0]).toContain("involves%3Atestuser");
      expect(result).toHaveLength(1);
    });

    it("deduplicates repo fetches", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              total_count: 2,
              incomplete_results: false,
              items: [
                mockPRItem,
                { ...mockPRItem, id: 2, number: 43 }, // Same repo
              ],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRepoResponse),
        });

      const result = await fetchAllOpenPRs("testuser", "token123");

      // Should only fetch repo once despite 2 PRs
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it("handles repo fetch failure gracefully", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              total_count: 1,
              incomplete_results: false,
              items: [mockPRItem],
            }),
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: "Not Found",
        });

      const result = await fetchAllOpenPRs("testuser", "token123");

      // Should fallback to extracting from URL
      expect(result).toHaveLength(1);
      expect(result[0].repository.fullName).toBe("owner/repo");
    });
  });

  describe("fetchGitHubUser", () => {
    it("fetches user profile", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 12345,
            login: "testuser",
            avatar_url: "https://example.com/avatar.png",
          }),
      });

      const result = await fetchGitHubUser("token123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/user",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer token123",
          }),
        })
      );
      expect(result.id).toBe(12345);
      expect(result.login).toBe("testuser");
    });

    it("throws error on failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized",
      });

      await expect(fetchGitHubUser("invalid-token")).rejects.toThrow(
        "Failed to fetch GitHub user: Unauthorized"
      );
    });
  });
});
