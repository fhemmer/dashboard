import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountCard } from "./account-card";
import type { MailAccount } from "../types";

describe("AccountCard", () => {
  const mockAccount: MailAccount = {
    id: "acc-1",
    userId: "user-1",
    provider: "gmail",
    accountName: "Personal Gmail",
    emailAddress: "test@gmail.com",
    isEnabled: true,
    syncFrequencyMinutes: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should render account details", () => {
    render(<AccountCard account={mockAccount} />);

    expect(screen.getByText("Personal Gmail")).toBeInTheDocument();
    expect(screen.getByText("test@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("Gmail")).toBeInTheDocument();
    expect(screen.getByText(/Sync every 5 minutes/)).toBeInTheDocument();
  });

  it("should show Enabled badge when account is enabled", () => {
    render(<AccountCard account={mockAccount} />);

    expect(screen.getByText("Enabled")).toBeInTheDocument();
  });

  it("should show Disabled badge when account is disabled", () => {
    const disabledAccount = { ...mockAccount, isEnabled: false };
    render(<AccountCard account={disabledAccount} />);

    expect(screen.getByText("Disabled")).toBeInTheDocument();
  });

  it("should call onEdit when Edit button is clicked", () => {
    const mockOnEdit = vi.fn();

    render(<AccountCard account={mockAccount} onEdit={mockOnEdit} />);

    fireEvent.click(screen.getByText("Edit"));
    expect(mockOnEdit).toHaveBeenCalledWith(mockAccount);
  });

  it("should call onDelete when Delete button is clicked", () => {
    const mockOnDelete = vi.fn();

    render(<AccountCard account={mockAccount} onDelete={mockOnDelete} />);

    fireEvent.click(screen.getByText("Delete"));
    expect(mockOnDelete).toHaveBeenCalledWith(mockAccount);
  });

  it("should call onToggle when Enable/Disable button is clicked", () => {
    const mockOnToggle = vi.fn();

    render(<AccountCard account={mockAccount} onToggle={mockOnToggle} />);

    fireEvent.click(screen.getByText("Disable"));
    expect(mockOnToggle).toHaveBeenCalledWith(mockAccount);
  });

  it("should show Enable button when account is disabled", () => {
    const mockOnToggle = vi.fn();
    const disabledAccount = { ...mockAccount, isEnabled: false };

    render(<AccountCard account={disabledAccount} onToggle={mockOnToggle} />);

    expect(screen.getByText("Enable")).toBeInTheDocument();
  });
});
