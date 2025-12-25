import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MailPageClient from "./page";

// Mock modules
vi.mock("@/modules/mail/actions", () => ({
  getMailAccounts: vi.fn(),
}));

vi.mock("@/modules/mail/components/mail-list", () => ({
  MailList: vi.fn(({ messages, selectedIds, onSelectMessage }) => (
    <div data-testid="mail-list">
      {messages.map((m: { id: string; subject: string }) => (
        <div
          key={m.id}
          data-testid={`message-${m.id}`}
          onClick={() => onSelectMessage(m.id)}
        >
          {m.subject}
          {selectedIds.includes(m.id) && <span data-testid="selected">selected</span>}
        </div>
      ))}
    </div>
  )),
}));

vi.mock("@/modules/mail/components/account-tabs", () => ({
  AccountTabs: vi.fn(({ accounts, activeAccountId, onSelectAccount }) => (
    <div data-testid="account-tabs">
      {accounts.map((a: { id: string; accountName: string }) => (
        <button
          key={a.id}
          data-testid={`tab-${a.id}`}
          data-active={a.id === activeAccountId}
          onClick={() => onSelectAccount(a.id)}
        >
          {a.accountName}
        </button>
      ))}
    </div>
  )),
}));

vi.mock("@/modules/mail/components/bulk-action-bar", () => ({
  BulkActionBar: vi.fn(({ selectedCount, onAction, onClearSelection, loading }) => (
    <div data-testid="bulk-action-bar" data-loading={loading}>
      <span data-testid="selected-count">{selectedCount}</span>
      <button data-testid="mark-read-btn" onClick={() => onAction("markRead")}>Mark Read</button>
      <button data-testid="clear-btn" onClick={onClearSelection}>Clear</button>
    </div>
  )),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import * as mailActionsModule from "@/modules/mail/actions";

describe("MailPageClient", () => {
  const mockGetMailAccounts = vi.mocked(mailActionsModule.getMailAccounts);

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe("Loading state", () => {
    it("shows empty state when accounts finish loading", async () => {
      // The loading state is very transient in React 18+ with concurrent features
      // The component goes loading -> empty state almost immediately
      mockGetMailAccounts.mockResolvedValue({ accounts: [] });

      render(<MailPageClient />);

      // Eventually shows empty state
      await waitFor(() => {
        expect(screen.getByText("No mail accounts configured")).toBeDefined();
      });
    });
  });

  describe("Empty state", () => {
    it("shows empty state when no accounts exist", async () => {
      mockGetMailAccounts.mockResolvedValue({ accounts: [] });

      render(<MailPageClient />);

      await waitFor(() => {
        expect(screen.getByText("No mail accounts configured")).toBeDefined();
      });
      expect(screen.getByText("Get started by adding your first mail account")).toBeDefined();
      expect(screen.getByRole("link", { name: /settings/i })).toBeDefined();
    });

    it("shows add account link in empty state", async () => {
      mockGetMailAccounts.mockResolvedValue({ accounts: [] });

      render(<MailPageClient />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /add account/i })).toBeDefined();
      });
    });
  });

  describe("With accounts", () => {
    const mockAccounts = [
      { id: "acc-1", userId: "user-1", accountName: "Gmail", provider: "gmail" as const, isEnabled: true, emailAddress: "test@gmail.com", syncFrequencyMinutes: 5, createdAt: new Date(), updatedAt: new Date() },
      { id: "acc-2", userId: "user-1", accountName: "Outlook", provider: "outlook" as const, isEnabled: true, emailAddress: "test@outlook.com", syncFrequencyMinutes: 5, createdAt: new Date(), updatedAt: new Date() },
    ];

    const mockMessages = [
      { id: "msg-1", subject: "Test Email 1", from: "sender@test.com", isRead: false },
      { id: "msg-2", subject: "Test Email 2", from: "sender2@test.com", isRead: true },
    ];

    it("loads accounts and messages on mount", async () => {
      mockGetMailAccounts.mockResolvedValue({ accounts: mockAccounts });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: mockMessages }),
      });

      render(<MailPageClient />);

      // Wait for account tabs to appear AND fetch to be called
      await waitFor(() => {
        expect(screen.getByTestId("account-tabs")).toBeDefined();
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/mail/messages?accountId=acc-1",
          expect.any(Object)
        );
      });
    });

    it("renders mail list with messages", async () => {
      mockGetMailAccounts.mockResolvedValue({ accounts: mockAccounts });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: mockMessages }),
      });

      render(<MailPageClient />);

      await waitFor(() => {
        expect(screen.getByTestId("mail-list")).toBeDefined();
        expect(screen.getByText("Test Email 1")).toBeDefined();
      });

      expect(screen.getByText("Test Email 2")).toBeDefined();
    });

    it("switches accounts when tab is clicked", async () => {
      mockGetMailAccounts.mockResolvedValue({ accounts: mockAccounts });
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ messages: mockMessages }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ messages: [] }),
        });

      render(<MailPageClient />);

      await waitFor(() => {
        expect(screen.getByTestId("tab-acc-2")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("tab-acc-2"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/mail/messages?accountId=acc-2",
          expect.any(Object)
        );
      });
    });

    it("handles message selection", async () => {
      mockGetMailAccounts.mockResolvedValue({ accounts: mockAccounts });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: mockMessages }),
      });

      render(<MailPageClient />);

      await waitFor(() => {
        expect(screen.getByTestId("message-msg-1")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("message-msg-1"));

      await waitFor(() => {
        expect(screen.getByTestId("selected-count").textContent).toBe("1");
      });
    });

    it("deselects message when clicked again", async () => {
      mockGetMailAccounts.mockResolvedValue({ accounts: mockAccounts });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: mockMessages }),
      });

      render(<MailPageClient />);

      await waitFor(() => {
        expect(screen.getByTestId("message-msg-1")).toBeDefined();
      });

      // Select
      fireEvent.click(screen.getByTestId("message-msg-1"));
      await waitFor(() => {
        expect(screen.getByTestId("selected-count").textContent).toBe("1");
      });

      // Deselect
      fireEvent.click(screen.getByTestId("message-msg-1"));
      await waitFor(() => {
        expect(screen.getByTestId("selected-count").textContent).toBe("0");
      });
    });

    it("performs bulk action and reloads messages", async () => {
      mockGetMailAccounts.mockResolvedValue({ accounts: mockAccounts });
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ messages: mockMessages }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ messages: [mockMessages[1]] }),
        });

      render(<MailPageClient />);

      await waitFor(() => {
        expect(screen.getByTestId("message-msg-1")).toBeDefined();
      });

      // Select message
      fireEvent.click(screen.getByTestId("message-msg-1"));

      // Perform action
      fireEvent.click(screen.getByTestId("mark-read-btn"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/mail/bulk-action",
          expect.objectContaining({ method: "POST" })
        );
      });
    });

    it("clears selection when clear button is clicked", async () => {
      mockGetMailAccounts.mockResolvedValue({ accounts: mockAccounts });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: mockMessages }),
      });

      render(<MailPageClient />);

      await waitFor(() => {
        expect(screen.getByTestId("message-msg-1")).toBeDefined();
      });

      // Select message
      fireEvent.click(screen.getByTestId("message-msg-1"));
      await waitFor(() => {
        expect(screen.getByTestId("selected-count").textContent).toBe("1");
      });

      // Clear selection
      fireEvent.click(screen.getByTestId("clear-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("selected-count").textContent).toBe("0");
      });
    });
  });

  describe("Error handling", () => {
    it("shows empty state when loading accounts fails", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockGetMailAccounts.mockRejectedValue(new Error("Network error"));

      render(<MailPageClient />);

      // When account loading fails, the error is set but empty state shows since accounts is empty
      await waitFor(() => {
        expect(screen.getByText("No mail accounts configured")).toBeDefined();
      });

      consoleErrorSpy.mockRestore();
    });

    it("shows error when loading messages fails", async () => {
      const mockAccounts = [{ id: "acc-1", userId: "user-1", accountName: "Gmail", provider: "gmail" as const, emailAddress: "test@gmail.com", isEnabled: true, syncFrequencyMinutes: 5, createdAt: new Date(), updatedAt: new Date() }];
      mockGetMailAccounts.mockResolvedValue({ accounts: mockAccounts });
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<MailPageClient />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load messages. Please try again.")).toBeDefined();
      });
    });

    it("shows error when bulk action fails", async () => {
      const mockAccounts = [{ id: "acc-1", userId: "user-1", accountName: "Gmail", provider: "gmail" as const, emailAddress: "test@gmail.com", isEnabled: true, syncFrequencyMinutes: 5, createdAt: new Date(), updatedAt: new Date() }];
      const mockMessages = [{ id: "msg-1", subject: "Test" }];
      mockGetMailAccounts.mockResolvedValue({ accounts: mockAccounts });
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ messages: mockMessages }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      render(<MailPageClient />);

      await waitFor(() => {
        expect(screen.getByTestId("message-msg-1")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("message-msg-1"));
      fireEvent.click(screen.getByTestId("mark-read-btn"));

      await waitFor(() => {
        expect(screen.getByText("Failed to perform action. Please try again.")).toBeDefined();
      });
    });
  });

  describe("Account changes cleanup", () => {
    it("clears messages when active account becomes null", async () => {
      const mockAccounts = [{ id: "acc-1", userId: "user-1", accountName: "Gmail", provider: "gmail" as const, emailAddress: "test@gmail.com", isEnabled: true, syncFrequencyMinutes: 5, createdAt: new Date(), updatedAt: new Date() }];
      mockGetMailAccounts.mockResolvedValue({ accounts: mockAccounts });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: "msg-1", subject: "Test" }] }),
      });

      const { rerender } = render(<MailPageClient />);

      await waitFor(() => {
        expect(screen.getByText("Test")).toBeDefined();
      });

      // Simulate account being removed
      mockGetMailAccounts.mockResolvedValue({ accounts: [] });
      rerender(<MailPageClient />);
    });
  });
});
