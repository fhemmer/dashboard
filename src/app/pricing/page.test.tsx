import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { Subscription } from "@/lib/subscription";

// Mock subscription
vi.mock("@/lib/subscription", () => ({
  getSubscription: vi.fn(),
  TIER_CREDITS: { free: 100, pro: 1500, pro_plus: 3500 },
  TIER_NAMES: { free: "Free", pro: "Pro", pro_plus: "Pro+" },
  TIER_PRICING: { free: 0, pro: 10, pro_plus: 20 },
}));

// Mock the pricing card component
vi.mock("./components/pricing-card", () => ({
  PricingCard: ({ tier, name, isCurrentPlan, isPopular }: { tier: string; name: string; isCurrentPlan: boolean; isPopular?: boolean }) => (
    <div data-testid={`pricing-card-${tier}`}>
      <span>{name}</span>
      {isCurrentPlan && <span data-testid="current-plan">Current</span>}
      {isPopular && <span data-testid="popular">Popular</span>}
    </div>
  ),
}));

import PricingPage, { metadata } from "./page";
import { getSubscription } from "@/lib/subscription";

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

describe("PricingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has correct metadata", () => {
    expect(metadata.title).toBe("Pricing | Dashboard");
    expect(metadata.description).toBe("Choose the plan that fits your needs");
  });

  it("renders pricing page with all tiers", async () => {
    vi.mocked(getSubscription).mockResolvedValue(null);

    const page = await PricingPage();
    render(page);

    expect(screen.getByText("Choose Your Plan")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-card-free")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-card-pro")).toBeInTheDocument();
    expect(screen.getByTestId("pricing-card-pro_plus")).toBeInTheDocument();
  });

  it("marks free tier as current for unauthenticated users", async () => {
    vi.mocked(getSubscription).mockResolvedValue(null);

    const page = await PricingPage();
    render(page);

    const freeCard = screen.getByTestId("pricing-card-free");
    expect(freeCard).toContainElement(screen.getByTestId("current-plan"));
  });

  it("marks pro tier as current when user has pro subscription", async () => {
    vi.mocked(getSubscription).mockResolvedValue(mockSubscription({ tier: "pro" }));

    const page = await PricingPage();
    render(page);

    const proCard = screen.getByTestId("pricing-card-pro");
    expect(proCard).toContainElement(screen.getByTestId("current-plan"));
  });

  it("marks pro+ tier as current when user has pro_plus subscription", async () => {
    vi.mocked(getSubscription).mockResolvedValue(mockSubscription({ tier: "pro_plus" }));

    const page = await PricingPage();
    render(page);

    const proPlusCard = screen.getByTestId("pricing-card-pro_plus");
    expect(proPlusCard).toContainElement(screen.getByTestId("current-plan"));
  });

  it("marks pro tier as popular", async () => {
    vi.mocked(getSubscription).mockResolvedValue(null);

    const page = await PricingPage();
    render(page);

    const proCard = screen.getByTestId("pricing-card-pro");
    expect(proCard).toContainElement(screen.getByTestId("popular"));
  });

  it("renders disclaimer text", async () => {
    vi.mocked(getSubscription).mockResolvedValue(null);

    const page = await PricingPage();
    render(page);

    expect(screen.getByText(/All plans include access to free AI models/)).toBeInTheDocument();
    expect(screen.getByText(/Prices are in USD and charged monthly/)).toBeInTheDocument();
  });
});
