import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUser = { id: "user-123" };
const mockAccounts = [
  {
    id: "acc-1",
    user_id: "user-123",
    github_user_id: 12345,
    github_username: "testuser",
    avatar_url: "https://example.com/avatar.png",
    account_label: "Personal",
    access_token: "token123",
    created_at: "2023-01-01T00:00:00Z",
  },
];

const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data: mockAccounts, error: null }),
        single: vi.fn().mockResolvedValue({ data: mockAccounts[0], error: null }),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("./lib/github-client", () => ({
  fetchReviewRequestedPRs: vi.fn().mockResolvedValue([]),
  fetchCreatedPRs: vi.fn().mockResolvedValue([]),
  fetchAllOpenPRs: vi.fn().mockResolvedValue([]),
}));

describe("github-prs actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
  });

  describe("getGitHubAccounts", () => {
    it("returns accounts for authenticated user", async () => {
      const { getGitHubAccounts } = await import("./actions");
      const result = await getGitHubAccounts();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("acc-1");
      expect(result[0].githubUsername).toBe("testuser");
    });

    it("returns empty array when not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

      const { getGitHubAccounts } = await import("./actions");
      const result = await getGitHubAccounts();

      expect(result).toEqual([]);
    });

    it("returns empty array on error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: null, error: { message: "Error" } }),
          })),
        })),
      });

      const { getGitHubAccounts } = await import("./actions");
      const result = await getGitHubAccounts();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("getPullRequests", () => {
    it("returns PR data for authenticated user", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: mockAccounts, error: null }),
        })),
      });

      const { getPullRequests } = await import("./actions");
      const result = await getPullRequests();

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].categories).toHaveLength(3);
    });

    it("returns empty when not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });

      const { getPullRequests } = await import("./actions");
      const result = await getPullRequests();

      expect(result.accounts).toEqual([]);
      expect(result.errors).toEqual([]);
    });

    it("returns error when database query fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: "DB Error" } }),
        })),
      });

      const { getPullRequests } = await import("./actions");
      const result = await getPullRequests();

      expect(result.accounts).toEqual([]);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe("DB Error");
      consoleSpy.mockRestore();
    });

    it("handles missing token gracefully", async () => {
      const accountWithNoToken = { ...mockAccounts[0], access_token: null };
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: [accountWithNoToken], error: null }),
        })),
      });

      const { getPullRequests } = await import("./actions");
      const result = await getPullRequests();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe("Failed to retrieve access token");
    });

    it("handles PR fetch failure gracefully", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: mockAccounts, error: null }),
        })),
      });

      const { fetchReviewRequestedPRs } = await import("./lib/github-client");
      vi.mocked(fetchReviewRequestedPRs).mockRejectedValueOnce(new Error("API rate limit"));

      const { getPullRequests } = await import("./actions");
      const result = await getPullRequests();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe("API rate limit");
      expect(result.errors[0].accountId).toBe("acc-1");
    });
  });

  describe("updateAccountLabel", () => {
    it("updates account label successfully", async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      const { updateAccountLabel } = await import("./actions");
      const result = await updateAccountLabel("acc-1", "Work");

      expect(result.success).toBe(true);
    });

    it("returns error on failure", async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: { message: "Update failed" } }),
        })),
      });

      const { updateAccountLabel } = await import("./actions");
      const result = await updateAccountLabel("acc-1", "Work");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });
  });

  describe("disconnectGitHubAccount", () => {
    it("disconnects account successfully", async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      const { disconnectGitHubAccount } = await import("./actions");
      const result = await disconnectGitHubAccount("acc-1");

      expect(result.success).toBe(true);
    });

    it("returns error when delete fails", async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
        })),
      });

      const { disconnectGitHubAccount } = await import("./actions");
      const result = await disconnectGitHubAccount("acc-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete failed");
    });
  });
});
