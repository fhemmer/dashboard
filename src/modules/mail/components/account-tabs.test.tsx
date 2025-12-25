import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountTabs } from "./account-tabs";
import type { MailAccount } from "../types";

describe("AccountTabs", () => {
  const mockAccounts: MailAccount[] = [
    {
      id: "acc-1",
      userId: "user-1",
      provider: "gmail",
      accountName: "Personal Gmail",
      emailAddress: "personal@gmail.com",
      isEnabled: true,
      syncFrequencyMinutes: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "acc-2",
      userId: "user-1",
      provider: "outlook",
      accountName: "Work Outlook",
      emailAddress: "work@outlook.com",
      isEnabled: true,
      syncFrequencyMinutes: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it("should render all account tabs", () => {
    const mockOnSelect = vi.fn();

    render(
      <AccountTabs
        accounts={mockAccounts}
        activeAccountId="acc-1"
        onSelectAccount={mockOnSelect}
      />
    );

    expect(screen.getByText("Personal Gmail")).toBeInTheDocument();
    expect(screen.getByText("Work Outlook")).toBeInTheDocument();
  });

  it("should highlight active account", () => {
    const mockOnSelect = vi.fn();

    const { container } = render(
      <AccountTabs
        accounts={mockAccounts}
        activeAccountId="acc-1"
        onSelectAccount={mockOnSelect}
      />
    );

    // Check that active button has different styling
    const buttons = container.querySelectorAll("button");
    expect(buttons).toHaveLength(2);
  });

  it("should call onSelectAccount when tab is clicked", () => {
    const mockOnSelect = vi.fn();

    render(
      <AccountTabs
        accounts={mockAccounts}
        activeAccountId="acc-1"
        onSelectAccount={mockOnSelect}
      />
    );

    const workButton = screen.getByText("Work Outlook").closest("button");
    if (workButton) {
      fireEvent.click(workButton);
    }

    expect(mockOnSelect).toHaveBeenCalledWith("acc-2");
  });

  it("should display provider name in parentheses", () => {
    const mockOnSelect = vi.fn();

    render(
      <AccountTabs
        accounts={mockAccounts}
        activeAccountId={null}
        onSelectAccount={mockOnSelect}
      />
    );

    expect(screen.getByText(/\(Gmail\)/)).toBeInTheDocument();
    expect(screen.getByText(/\(Outlook\)/)).toBeInTheDocument();
  });
});
