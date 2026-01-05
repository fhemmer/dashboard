import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TransactionHistory } from "./transaction-history";
import type { CreditTransaction } from "@/lib/credits";

// Helper to create a mock transaction
function mockTransaction(overrides: Partial<CreditTransaction> = {}): CreditTransaction {
  return {
    id: "tx-1",
    userId: "user-123",
    amountCents: 100,
    reason: "monthly_credit",
    referenceId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("TransactionHistory", () => {
  it("shows empty state when no transactions", () => {
    render(<TransactionHistory transactions={[]} />);
    
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
  });

  it("renders transactions with positive amounts in green", () => {
    const transactions: CreditTransaction[] = [
      mockTransaction({
        id: "1",
        amountCents: 1500,
        reason: "monthly_credit",
        createdAt: new Date("2024-01-01"),
      }),
    ];

    render(<TransactionHistory transactions={transactions} />);
    
    expect(screen.getByText("Monthly Credit")).toBeInTheDocument();
    expect(screen.getByText("+$15.00")).toHaveClass("text-green-600");
  });

  it("renders transactions with negative amounts in red", () => {
    const transactions: CreditTransaction[] = [
      mockTransaction({
        id: "2",
        amountCents: -50,
        reason: "ai_usage",
        createdAt: new Date("2024-01-01"),
      }),
    ];

    render(<TransactionHistory transactions={transactions} />);
    
    expect(screen.getByText("AI Usage")).toBeInTheDocument();
    // formatCredits outputs $-0.50 for negative values (the minus is part of the number)
    expect(screen.getByText("$-0.50")).toHaveClass("text-red-600");
  });

  it("renders all known reason labels", () => {
    const transactions: CreditTransaction[] = [
      mockTransaction({ id: "1", amountCents: 1000, reason: "trial_credit" }),
      mockTransaction({ id: "2", amountCents: 1500, reason: "monthly_credit" }),
      mockTransaction({ id: "3", amountCents: 500, reason: "subscription_upgrade" }),
      mockTransaction({ id: "4", amountCents: 100, reason: "subscription_canceled_free_credit" }),
      mockTransaction({ id: "5", amountCents: 100, reason: "trial_ended_free_credit" }),
      mockTransaction({ id: "6", amountCents: -25, reason: "ai_usage" }),
    ];

    render(<TransactionHistory transactions={transactions} />);
    
    expect(screen.getByText("Trial Credit")).toBeInTheDocument();
    expect(screen.getByText("Monthly Credit")).toBeInTheDocument();
    expect(screen.getByText("Plan Upgrade")).toBeInTheDocument();
    expect(screen.getByText("Subscription Ended")).toBeInTheDocument();
    expect(screen.getByText("Trial Ended")).toBeInTheDocument();
    expect(screen.getByText("AI Usage")).toBeInTheDocument();
  });

  it("renders unknown reason as-is", () => {
    const transactions: CreditTransaction[] = [
      mockTransaction({
        id: "1",
        amountCents: 100,
        reason: "custom_reason",
        createdAt: new Date("2024-01-01"),
      }),
    ];

    render(<TransactionHistory transactions={transactions} />);
    
    expect(screen.getByText("custom_reason")).toBeInTheDocument();
  });

  it("renders multiple transactions", () => {
    const transactions: CreditTransaction[] = [
      mockTransaction({ id: "1", amountCents: 1000, reason: "monthly_credit" }),
      mockTransaction({ id: "2", amountCents: -50, reason: "ai_usage" }),
      mockTransaction({ id: "3", amountCents: -25, reason: "ai_usage" }),
    ];

    render(<TransactionHistory transactions={transactions} />);
    
    // Positive amounts get + prefix, negative get the - as part of the value
    expect(screen.getByText(/\+\s*\$10\.00/)).toBeInTheDocument();
    expect(screen.getByText("$-0.50")).toBeInTheDocument();
    expect(screen.getByText("$-0.25")).toBeInTheDocument();
  });

  it("displays relative time for transactions", () => {
    const recentDate = new Date();
    recentDate.setMinutes(recentDate.getMinutes() - 5);
    
    const transactions: CreditTransaction[] = [
      mockTransaction({
        id: "1",
        amountCents: 100,
        reason: "ai_usage",
        createdAt: recentDate,
      }),
    ];

    render(<TransactionHistory transactions={transactions} />);
    
    // formatDistanceToNow should show something like "5 minutes ago"
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });
});
