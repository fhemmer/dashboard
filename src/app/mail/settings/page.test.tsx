import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MailSettingsPage from "./page";

// Mock modules
vi.mock("@/modules/mail/actions", () => ({
  getMailAccounts: vi.fn(),
  createMailAccount: vi.fn(),
  updateMailAccount: vi.fn(),
  deleteMailAccount: vi.fn(),
}));

vi.mock("@/modules/mail/components/account-card", () => ({
  AccountCard: vi.fn(({ account, onToggle, onDelete }) => (
    <div data-testid={`account-card-${account.id}`}>
      <span>{account.accountName}</span>
      <button data-testid={`toggle-${account.id}`} onClick={() => onToggle(account)}>
        Toggle
      </button>
      <button data-testid={`delete-${account.id}`} onClick={() => onDelete(account)}>
        Delete
      </button>
    </div>
  )),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import * as mailActionsModule from "@/modules/mail/actions";

describe("MailSettingsPage", () => {
  const mockGetMailAccounts = vi.mocked(mailActionsModule.getMailAccounts);
  const mockCreateMailAccount = vi.mocked(mailActionsModule.createMailAccount);
  const mockUpdateMailAccount = vi.mocked(mailActionsModule.updateMailAccount);
  const mockDeleteMailAccount = vi.mocked(mailActionsModule.deleteMailAccount);

  const mockAccounts = [
    { id: "acc-1", userId: "user-1", accountName: "Gmail", provider: "gmail" as const, isEnabled: true, emailAddress: "test@gmail.com", syncFrequencyMinutes: 5, createdAt: new Date(), updatedAt: new Date() },
    { id: "acc-2", userId: "user-1", accountName: "Outlook", provider: "outlook" as const, isEnabled: false, emailAddress: "test@outlook.com", syncFrequencyMinutes: 5, createdAt: new Date(), updatedAt: new Date() },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMailAccounts.mockResolvedValue({ accounts: mockAccounts });
  });

  describe("Initial render", () => {
    it("renders page title and back button", async () => {
      render(<MailSettingsPage />);

      expect(screen.getByText("Mail Settings")).toBeDefined();
      expect(screen.getByRole("link", { name: /back/i })).toHaveAttribute("href", "/mail");
    });

    it("shows loading state initially", () => {
      mockGetMailAccounts.mockImplementation(() => new Promise(() => {}));

      render(<MailSettingsPage />);

      expect(screen.getByText("Loading accounts...")).toBeDefined();
    });

    it("renders account cards after loading", async () => {
      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("account-card-acc-1")).toBeDefined();
        expect(screen.getByTestId("account-card-acc-2")).toBeDefined();
      });
    });

    it("shows empty state when no accounts exist", async () => {
      mockGetMailAccounts.mockResolvedValue({ accounts: [] });

      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/no accounts configured/i)).toBeDefined();
      });
    });
  });

  describe("Add account form", () => {
    it("toggles add account form when button is clicked", async () => {
      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add account/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /add account/i }));

      expect(screen.getByText("Add Mail Account")).toBeDefined();
      expect(screen.getByLabelText(/provider/i)).toBeDefined();
      expect(screen.getByLabelText(/account name/i)).toBeDefined();
      expect(screen.getByLabelText(/email address/i)).toBeDefined();
    });

    it("closes form when cancel is clicked", async () => {
      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add account/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /add account/i }));
      expect(screen.getByText("Add Mail Account")).toBeDefined();

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(screen.queryByText("Add Mail Account")).toBeNull();
    });

    it("shows error when required fields are empty", async () => {
      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add account/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /add account/i }));
      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText("Please fill in all required fields")).toBeDefined();
      });
    });

    it("creates account with form data", async () => {
      mockCreateMailAccount.mockResolvedValue({ success: true });

      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add account/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /add account/i }));

      fireEvent.change(screen.getByLabelText(/account name/i), {
        target: { value: "New Account" },
      });
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: "new@email.com" },
      });

      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(mockCreateMailAccount).toHaveBeenCalledWith({
          provider: "gmail",
          accountName: "New Account",
          emailAddress: "new@email.com",
          syncFrequencyMinutes: 5,
        });
      });
    });

    it("shows error when account creation fails", async () => {
      mockCreateMailAccount.mockResolvedValue({ success: false, error: "Creation failed" });

      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add account/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /add account/i }));

      fireEvent.change(screen.getByLabelText(/account name/i), {
        target: { value: "New Account" },
      });
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: "new@email.com" },
      });

      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText("Creation failed")).toBeDefined();
      });
    });

    it("closes form and reloads accounts after successful creation", async () => {
      mockCreateMailAccount.mockResolvedValue({ success: true });

      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add account/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /add account/i }));

      fireEvent.change(screen.getByLabelText(/account name/i), {
        target: { value: "New Account" },
      });
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: "new@email.com" },
      });

      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(screen.queryByText("Add Mail Account")).toBeNull();
      });

      // Should have called getMailAccounts again to reload
      expect(mockGetMailAccounts).toHaveBeenCalledTimes(2);
    });

    it("changes provider when selected", async () => {
      mockCreateMailAccount.mockResolvedValue({ success: true });

      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add account/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /add account/i }));

      // Change provider to outlook
      const providerSelect = screen.getByLabelText(/provider/i);
      fireEvent.click(providerSelect);

      await waitFor(() => {
        expect(screen.getByRole("option", { name: /outlook/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole("option", { name: /outlook/i }));

      fireEvent.change(screen.getByLabelText(/account name/i), {
        target: { value: "Outlook Account" },
      });
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: "test@outlook.com" },
      });

      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(mockCreateMailAccount).toHaveBeenCalledWith(
          expect.objectContaining({ provider: "outlook" })
        );
      });
    });

    it("changes sync frequency when input is modified", async () => {
      mockCreateMailAccount.mockResolvedValue({ success: true });

      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add account/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /add account/i }));

      fireEvent.change(screen.getByLabelText(/account name/i), {
        target: { value: "New Account" },
      });
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: "new@email.com" },
      });
      fireEvent.change(screen.getByLabelText(/sync frequency/i), {
        target: { value: "15" },
      });

      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(mockCreateMailAccount).toHaveBeenCalledWith(
          expect.objectContaining({ syncFrequencyMinutes: 15 })
        );
      });
    });
  });

  describe("Toggle account", () => {
    it("toggles account enabled state", async () => {
      mockUpdateMailAccount.mockResolvedValue({ success: true });

      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("toggle-acc-1")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("toggle-acc-1"));

      await waitFor(() => {
        expect(mockUpdateMailAccount).toHaveBeenCalledWith("acc-1", {
          isEnabled: false,
        });
      });
    });

    it("shows error when toggle fails", async () => {
      mockUpdateMailAccount.mockResolvedValue({ success: false, error: "Update failed" });

      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("toggle-acc-1")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("toggle-acc-1"));

      await waitFor(() => {
        expect(screen.getByText("Update failed")).toBeDefined();
      });
    });
  });

  describe("Delete account", () => {
    it("opens delete confirmation dialog", async () => {
      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("delete-acc-1")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("delete-acc-1"));

      await waitFor(() => {
        expect(screen.getByText("Delete Account")).toBeDefined();
        expect(screen.getByText(/are you sure you want to delete/i)).toBeDefined();
      });
    });

    it("closes dialog when cancel is clicked", async () => {
      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("delete-acc-1")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("delete-acc-1"));

      await waitFor(() => {
        expect(screen.getByText("Delete Account")).toBeDefined();
      });

      // Find the Cancel button in the dialog context
      const cancelButtons = screen.getAllByRole("button", { name: /cancel/i });
      fireEvent.click(cancelButtons[0]);

      await waitFor(() => {
        expect(screen.queryByText("Delete Account")).toBeNull();
      });
    });

    it("deletes account when confirmed", async () => {
      mockDeleteMailAccount.mockResolvedValue({ success: true });

      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("delete-acc-1")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("delete-acc-1"));

      await waitFor(() => {
        expect(screen.getByText("Delete Account")).toBeDefined();
      });

      // Find the destructive Delete button
      const deleteButtons = screen.getAllByRole("button", { name: /^delete$/i });
      fireEvent.click(deleteButtons[deleteButtons.length - 1]);

      await waitFor(() => {
        expect(mockDeleteMailAccount).toHaveBeenCalledWith("acc-1");
      });
    });

    it("shows error when delete fails", async () => {
      mockDeleteMailAccount.mockResolvedValue({ success: false, error: "Delete failed" });

      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("delete-acc-1")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("delete-acc-1"));

      await waitFor(() => {
        expect(screen.getByText("Delete Account")).toBeDefined();
      });

      const deleteButtons = screen.getAllByRole("button", { name: /^delete$/i });
      fireEvent.click(deleteButtons[deleteButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText("Delete failed")).toBeDefined();
      });
    });
  });

  describe("Error handling", () => {
    it("shows error when loading accounts fails", async () => {
      mockGetMailAccounts.mockRejectedValue(new Error("Network error"));

      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText("Failed to load mail accounts. Please try again.")).toBeDefined();
      });
    });

    it("shows default error message when account creation returns no error message", async () => {
      mockCreateMailAccount.mockResolvedValue({ success: false });

      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /add account/i })).toBeDefined();
      });

      fireEvent.click(screen.getByRole("button", { name: /add account/i }));

      fireEvent.change(screen.getByLabelText(/account name/i), {
        target: { value: "New Account" },
      });
      fireEvent.change(screen.getByLabelText(/email address/i), {
        target: { value: "new@email.com" },
      });

      fireEvent.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText("Failed to create account")).toBeDefined();
      });
    });

    it("shows default error message when toggle returns no error message", async () => {
      mockUpdateMailAccount.mockResolvedValue({ success: false });

      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("toggle-acc-1")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("toggle-acc-1"));

      await waitFor(() => {
        expect(screen.getByText("Failed to update account")).toBeDefined();
      });
    });

    it("shows default error message when delete returns no error message", async () => {
      mockDeleteMailAccount.mockResolvedValue({ success: false });

      render(<MailSettingsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("delete-acc-1")).toBeDefined();
      });

      fireEvent.click(screen.getByTestId("delete-acc-1"));

      await waitFor(() => {
        expect(screen.getByText("Delete Account")).toBeDefined();
      });

      const deleteButtons = screen.getAllByRole("button", { name: /^delete$/i });
      fireEvent.click(deleteButtons[deleteButtons.length - 1]);

      await waitFor(() => {
        expect(screen.getByText("Failed to delete account")).toBeDefined();
      });
    });
  });
});
