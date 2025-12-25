import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createMailAccount,
    deleteMailAccount,
    getMailAccounts,
    getMailSummary,
    storeAccountCredentials,
    updateMailAccount,
} from "./actions";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("./lib/cache", () => ({
  invalidateAllUserCaches: vi.fn(),
  invalidateSummaryCache: vi.fn(),
  invalidateMessagesCache: vi.fn(),
}));

vi.mock("./lib/token-manager", () => ({
  storeToken: vi.fn(),
  deleteToken: vi.fn(),
}));

vi.mock("./lib/gmail-client", () => ({
  getGmailUnreadCount: vi.fn(),
}));

vi.mock("./lib/imap-client", () => ({
  getImapUnreadCount: vi.fn(),
}));

vi.mock("./lib/outlook-client", () => ({
  getOutlookUnreadCount: vi.fn(),
}));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}));

function createChainMock(finalResult: { data: unknown; error: unknown }) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockImplementation(function(this: typeof mock) { return this; }),
    order: vi.fn().mockResolvedValue(finalResult),
    single: vi.fn().mockResolvedValue(finalResult),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    // Make the mock thenable so await works on it
    then: vi.fn((resolve) => resolve(finalResult)),
  };
  return mock;
}

describe("mail actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });
  });

  describe("getMailAccounts", () => {
    it("should return error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await getMailAccounts();

      expect(result.accounts).toEqual([]);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return mail accounts for authenticated user", async () => {
      const mockAccounts = [
        {
          id: "acc-1",
          user_id: "user-123",
          provider: "gmail",
          account_name: "Personal Gmail",
          email_address: "test@gmail.com",
          is_enabled: true,
          sync_frequency_minutes: 5,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockFrom.mockReturnValue(
        createChainMock({ data: mockAccounts, error: null })
      );

      const result = await getMailAccounts();

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].provider).toBe("gmail");
      expect(result.error).toBeUndefined();
    });

    it("should return error when database query fails", async () => {
      mockFrom.mockReturnValue(
        createChainMock({ data: null, error: { message: "DB error" } })
      );

      const result = await getMailAccounts();

      expect(result.accounts).toEqual([]);
      expect(result.error).toBe("DB error");
    });
  });

  describe("createMailAccount", () => {
    it("should return error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await createMailAccount({
        provider: "gmail",
        accountName: "Test",
        emailAddress: "test@gmail.com",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should create mail account successfully", async () => {
      const mockData = { id: "new-acc-id" };
      mockFrom.mockReturnValue(
        createChainMock({ data: mockData, error: null })
      );

      const result = await createMailAccount({
        provider: "gmail",
        accountName: "Personal Gmail",
        emailAddress: "test@gmail.com",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe("new-acc-id");
    });

    it("should return error when database insert fails", async () => {
      mockFrom.mockReturnValue(
        createChainMock({ data: null, error: { message: "Insert failed" } })
      );

      const result = await createMailAccount({
        provider: "gmail",
        accountName: "Test",
        emailAddress: "test@gmail.com",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Insert failed");
    });
  });

  describe("updateMailAccount", () => {
    it("should return error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await updateMailAccount("acc-1", {
        accountName: "Updated Name",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should update mail account successfully", async () => {
      mockFrom.mockReturnValue(createChainMock({ data: {}, error: null }));

      const result = await updateMailAccount("acc-1", {
        accountName: "Updated Name",
        isEnabled: false,
      });

      expect(result.success).toBe(true);
    });

    it("should return error when database update fails", async () => {
      mockFrom.mockReturnValue(
        createChainMock({ data: null, error: { message: "Update failed" } })
      );

      const result = await updateMailAccount("acc-1", {
        accountName: "Updated",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });
  });

  describe("deleteMailAccount", () => {
    it("should return error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await deleteMailAccount("acc-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("should delete mail account successfully", async () => {
      mockFrom.mockReturnValue(createChainMock({ data: {}, error: null }));

      const result = await deleteMailAccount("acc-1");

      expect(result.success).toBe(true);
    });

    it("should return error when database delete fails", async () => {
      mockFrom.mockReturnValue(
        createChainMock({ data: null, error: { message: "Delete failed" } })
      );

      const result = await deleteMailAccount("acc-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete failed");
    });
  });

  describe("getMailSummary", () => {
    it("should return error when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

      const result = await getMailSummary();

      expect(result.accounts).toEqual([]);
      expect(result.totalUnread).toBe(0);
      expect(result.error).toBe("Not authenticated");
    });

    it("should return empty summary when no accounts", async () => {
      mockFrom.mockReturnValue(createChainMock({ data: [], error: null }));

      const result = await getMailSummary();

      expect(result.accounts).toEqual([]);
      expect(result.totalUnread).toBe(0);
    });

    it("should return error when getMailAccounts fails", async () => {
      mockFrom.mockReturnValue(
        createChainMock({ data: null, error: { message: "DB error" } })
      );

      const result = await getMailSummary();

      expect(result.accounts).toEqual([]);
      expect(result.totalUnread).toBe(0);
      expect(result.error).toBe("DB error");
    });

    it("should fetch unread counts for enabled outlook accounts", async () => {
      const mockAccounts = [
        {
          id: "acc-1",
          user_id: "user-123",
          provider: "outlook",
          account_name: "Work Outlook",
          email_address: "test@outlook.com",
          is_enabled: true,
          sync_frequency_minutes: 5,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockFrom.mockReturnValue(
        createChainMock({ data: mockAccounts, error: null })
      );

      const { getOutlookUnreadCount } = await import("./lib/outlook-client");
      vi.mocked(getOutlookUnreadCount).mockResolvedValue(5);

      const result = await getMailSummary();

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].unreadCount).toBe(5);
      expect(result.totalUnread).toBe(5);
    });

    it("should fetch unread counts for enabled gmail accounts", async () => {
      const mockAccounts = [
        {
          id: "acc-2",
          user_id: "user-123",
          provider: "gmail",
          account_name: "Personal Gmail",
          email_address: "test@gmail.com",
          is_enabled: true,
          sync_frequency_minutes: 5,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockFrom.mockReturnValue(
        createChainMock({ data: mockAccounts, error: null })
      );

      const { getGmailUnreadCount } = await import("./lib/gmail-client");
      vi.mocked(getGmailUnreadCount).mockResolvedValue(10);

      const result = await getMailSummary();

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].unreadCount).toBe(10);
      expect(result.totalUnread).toBe(10);
    });

    it("should fetch unread counts for enabled imap accounts", async () => {
      const mockAccounts = [
        {
          id: "acc-3",
          user_id: "user-123",
          provider: "imap",
          account_name: "Custom IMAP",
          email_address: "test@custom.com",
          is_enabled: true,
          sync_frequency_minutes: 5,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockFrom.mockReturnValue(
        createChainMock({ data: mockAccounts, error: null })
      );

      const { getImapUnreadCount } = await import("./lib/imap-client");
      vi.mocked(getImapUnreadCount).mockResolvedValue(3);

      const result = await getMailSummary();

      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].unreadCount).toBe(3);
      expect(result.totalUnread).toBe(3);
    });

    it("should handle errors when fetching unread counts", async () => {
      const mockAccounts = [
        {
          id: "acc-1",
          user_id: "user-123",
          provider: "outlook",
          account_name: "Work Outlook",
          email_address: "test@outlook.com",
          is_enabled: true,
          sync_frequency_minutes: 5,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockFrom.mockReturnValue(
        createChainMock({ data: mockAccounts, error: null })
      );

      const { getOutlookUnreadCount } = await import("./lib/outlook-client");
      vi.mocked(getOutlookUnreadCount).mockRejectedValue(new Error("API error"));

      const result = await getMailSummary();

      // Should handle error gracefully and return 0 unread
      expect(result.accounts).toHaveLength(1);
      expect(result.accounts[0].unreadCount).toBe(0);
      expect(result.totalUnread).toBe(0);
    });

    it("should skip disabled accounts", async () => {
      const mockAccounts = [
        {
          id: "acc-1",
          user_id: "user-123",
          provider: "gmail",
          account_name: "Disabled Account",
          email_address: "test@gmail.com",
          is_enabled: false,
          sync_frequency_minutes: 5,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockFrom.mockReturnValue(
        createChainMock({ data: mockAccounts, error: null })
      );

      const result = await getMailSummary();

      expect(result.accounts).toEqual([]);
      expect(result.totalUnread).toBe(0);
    });

    it("should aggregate unread counts from multiple accounts", async () => {
      const mockAccounts = [
        {
          id: "acc-1",
          user_id: "user-123",
          provider: "outlook",
          account_name: "Work",
          email_address: "work@outlook.com",
          is_enabled: true,
          sync_frequency_minutes: 5,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "acc-2",
          user_id: "user-123",
          provider: "gmail",
          account_name: "Personal",
          email_address: "personal@gmail.com",
          is_enabled: true,
          sync_frequency_minutes: 5,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockFrom.mockReturnValue(
        createChainMock({ data: mockAccounts, error: null })
      );

      const { getOutlookUnreadCount } = await import("./lib/outlook-client");
      const { getGmailUnreadCount } = await import("./lib/gmail-client");
      vi.mocked(getOutlookUnreadCount).mockResolvedValue(5);
      vi.mocked(getGmailUnreadCount).mockResolvedValue(10);

      const result = await getMailSummary();

      expect(result.accounts).toHaveLength(2);
      expect(result.totalUnread).toBe(15);
    });
  });

  describe("storeAccountCredentials", () => {
    it("should store credentials successfully", async () => {
      const { storeToken } = await import("./lib/token-manager");
      vi.mocked(storeToken).mockResolvedValue({ success: true });

      const result = await storeAccountCredentials(
        "acc-1",
        "access-token",
        "refresh-token"
      );

      expect(result.success).toBe(true);
    });

    it("should store credentials with expiry date", async () => {
      const { storeToken } = await import("./lib/token-manager");
      vi.mocked(storeToken).mockResolvedValue({ success: true });
      const expiresAt = new Date("2025-01-01");

      const result = await storeAccountCredentials(
        "acc-1",
        "access-token",
        "refresh-token",
        expiresAt
      );

      expect(result.success).toBe(true);
      expect(storeToken).toHaveBeenCalledWith({
        accountId: "acc-1",
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt,
      });
    });

    it("should return error when storeToken fails", async () => {
      const { storeToken } = await import("./lib/token-manager");
      vi.mocked(storeToken).mockResolvedValue({ success: false, error: "Storage failed" });

      const result = await storeAccountCredentials(
        "acc-1",
        "access-token"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Storage failed");
    });
  });
});
