import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CreditsInfo, CreditTransaction } from "@/lib/credits";
import type { Subscription } from "@/lib/subscription";

// Mock dependencies before imports
vi.mock("@/lib/credits", () => ({
  formatCredits: vi.fn((cents: number) => `$${(cents / 100).toFixed(2)}`),
  getCreditsInfo: vi.fn(),
  getCreditTransactions: vi.fn(),
}));

vi.mock("@/lib/subscription", () => ({
  getSubscription: vi.fn(),
  TIER_CREDITS: { free: 100, pro: 1500, pro_plus: 3500 },
  TIER_NAMES: { free: "Free", pro: "Pro", pro_plus: "Pro+" },
}));

// Must mock before importing the page
vi.mock("./components/manage-subscription-button", () => ({
  ManageSubscriptionButton: () => <button data-testid="manage-btn">Manage</button>,
}));

vi.mock("./components/transaction-history", () => ({
  TransactionHistory: ({ transactions }: { transactions: unknown[] }) => (
    <div data-testid="transaction-history">{transactions.length} transactions</div>
  ),
}));

import { getCreditsInfo, getCreditTransactions } from "@/lib/credits";
import { getSubscription } from "@/lib/subscription";
import BillingPage, { metadata } from "./page";

// Helper for creating mock subscription
function mockSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-id-123",
    userId: "user-123",
    stripeCustomerId: "cus_123",
    stripeSubscriptionId: "sub_123",
    tier: "pro",
    billingCycle: "monthly",
    status: "active",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Helper for creating mock credits info
function mockCreditsInfo(overrides: Partial<CreditsInfo> = {}): CreditsInfo {
  return {
    balanceCents: 100,
    balanceDollars: 1.0,
    isTrialActive: false,
    trialEndsAt: null,
    daysUntilTrialEnds: null,
    ...overrides,
  };
}

// Helper for creating mock transaction
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

describe("BillingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has correct metadata", () => {
    expect(metadata.title).toBe("Billing | Dashboard");
    expect(metadata.description).toBe("Manage your subscription and view usage");
  });

  it("renders billing page for free tier user", async () => {
    vi.mocked(getSubscription).mockResolvedValue(null);
    vi.mocked(getCreditsInfo).mockResolvedValue(mockCreditsInfo({ balanceCents: 50, balanceDollars: 0.5 }));
    vi.mocked(getCreditTransactions).mockResolvedValue([]);

    const page = await BillingPage();
    render(page);

    expect(screen.getByText("Billing & Usage")).toBeInTheDocument();
    expect(screen.getByText("Current Plan")).toBeInTheDocument();
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getByText("Free tier")).toBeInTheDocument();
    expect(screen.queryByTestId("manage-btn")).not.toBeInTheDocument();
  });

  it("renders billing page for pro tier user", async () => {
    vi.mocked(getSubscription).mockResolvedValue(mockSubscription());
    vi.mocked(getCreditsInfo).mockResolvedValue(mockCreditsInfo({ balanceCents: 1000, balanceDollars: 10.0 }));
    vi.mocked(getCreditTransactions).mockResolvedValue([]);

    const page = await BillingPage();
    render(page);

    expect(screen.getByText("Pro")).toBeInTheDocument();
    expect(screen.getByText("Active subscription")).toBeInTheDocument();
    expect(screen.getByTestId("manage-btn")).toBeInTheDocument();
  });

  it("renders trial status when user is in trial", async () => {
    vi.mocked(getSubscription).mockResolvedValue(mockSubscription({ status: "trialing" }));
    vi.mocked(getCreditsInfo).mockResolvedValue(
      mockCreditsInfo({
        balanceCents: 1000,
        balanceDollars: 10.0,
        isTrialActive: true,
        daysUntilTrialEnds: 5,
      })
    );
    vi.mocked(getCreditTransactions).mockResolvedValue([]);

    const page = await BillingPage();
    render(page);

    expect(screen.getByText("Trial ends in 5 days")).toBeInTheDocument();
    expect(screen.getByText("Trial Active")).toBeInTheDocument();
    expect(screen.getByText("5 days left")).toBeInTheDocument();
  });

  it("renders transaction history", async () => {
    vi.mocked(getSubscription).mockResolvedValue(null);
    vi.mocked(getCreditsInfo).mockResolvedValue(mockCreditsInfo());
    vi.mocked(getCreditTransactions).mockResolvedValue([
      mockTransaction({ id: "1", amountCents: 100, reason: "monthly_credit" }),
      mockTransaction({ id: "2", amountCents: -50, reason: "ai_usage" }),
    ]);

    const page = await BillingPage();
    render(page);

    expect(screen.getByTestId("transaction-history")).toHaveTextContent("2 transactions");
  });

  it("handles null credits info gracefully", async () => {
    vi.mocked(getSubscription).mockResolvedValue(null);
    vi.mocked(getCreditsInfo).mockResolvedValue(null);
    vi.mocked(getCreditTransactions).mockResolvedValue([]);

    const page = await BillingPage();
    render(page);

    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("shows Upgrade button for free tier", async () => {
    vi.mocked(getSubscription).mockResolvedValue(null);
    vi.mocked(getCreditsInfo).mockResolvedValue(mockCreditsInfo());
    vi.mocked(getCreditTransactions).mockResolvedValue([]);

    const page = await BillingPage();
    render(page);

    expect(screen.getByRole("link", { name: /upgrade/i })).toBeInTheDocument();
  });

  it("shows Change Plan button for paid tier", async () => {
    vi.mocked(getSubscription).mockResolvedValue(mockSubscription());
    vi.mocked(getCreditsInfo).mockResolvedValue(mockCreditsInfo({ balanceCents: 1500, balanceDollars: 15.0 }));
    vi.mocked(getCreditTransactions).mockResolvedValue([]);

    const page = await BillingPage();
    render(page);

    expect(screen.getByRole("link", { name: /change plan/i })).toBeInTheDocument();
  });
});
