import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ExpendituresWidget } from "./expenditures-widget";

vi.mock("../actions", () => ({
  isCurrentUserAdmin: vi.fn(),
  getExpenditures: vi.fn(),
}));

const { isCurrentUserAdmin, getExpenditures } = await import("../actions");

describe("ExpendituresWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-10"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns null when user is not admin", async () => {
    vi.mocked(isCurrentUserAdmin).mockResolvedValue(false);

    const Widget = await ExpendituresWidget();

    expect(Widget).toBeNull();
  });

  it("renders empty state when no sources", async () => {
    vi.mocked(isCurrentUserAdmin).mockResolvedValue(true);
    vi.mocked(getExpenditures).mockResolvedValue({ sources: [] });

    const Widget = await ExpendituresWidget();
    render(Widget!);

    expect(screen.getByText("Expenditures")).toBeDefined();
    expect(screen.getByText("No expenditure sources configured")).toBeDefined();
    expect(screen.getByRole("link", { name: "Add Source" })).toBeDefined();
  });

  it("renders error message when fetch fails", async () => {
    vi.mocked(isCurrentUserAdmin).mockResolvedValue(true);
    vi.mocked(getExpenditures).mockResolvedValue({
      sources: [],
      error: "Database connection failed",
    });

    const Widget = await ExpendituresWidget();
    render(Widget!);

    expect(screen.getByText("Database connection failed")).toBeDefined();
  });

  it("renders next expenditure and average monthly cost", async () => {
    vi.mocked(isCurrentUserAdmin).mockResolvedValue(true);
    vi.mocked(getExpenditures).mockResolvedValue({
      sources: [
        {
          id: "1",
          userId: "user-1",
          name: "AWS",
          baseCost: 100,
          billingCycle: "monthly" as const,
          billingDayOfMonth: 15,
          billingMonth: null,
          consumptionCost: 50,
          detailsUrl: "https://aws.amazon.com",
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          userId: "user-1",
          name: "GitHub",
          baseCost: 20,
          billingCycle: "monthly" as const,
          billingDayOfMonth: 1,
          billingMonth: null,
          consumptionCost: 0,
          detailsUrl: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const Widget = await ExpendituresWidget();
    render(Widget!);

    // Next expenditure should be AWS on Jan 15 with charge amount (since we're on Jan 10, AWS bills on 15th is soonest)
    expect(screen.getByText("Next expenditure:")).toBeDefined();
    expect(screen.getByText(/AWS, Jan 15 \(\$150\.00\)/)).toBeDefined();

    // Average monthly: AWS $150/mo + GitHub $20/mo = $170/mo
    expect(screen.getByText("Avg.exp./mo")).toBeDefined();
    expect(screen.getByText("$170.00")).toBeDefined();

    // Badge shows count of 2 expenditures
    expect(screen.getByText("2")).toBeDefined();
  });

  it("shows expenditure count badge", async () => {
    vi.mocked(isCurrentUserAdmin).mockResolvedValue(true);
    vi.mocked(getExpenditures).mockResolvedValue({
      sources: [
        {
          id: "1",
          userId: "user-1",
          name: "Service 1",
          baseCost: 10,
          billingCycle: "monthly" as const,
          billingDayOfMonth: 15,
          billingMonth: null,
          consumptionCost: 0,
          detailsUrl: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          userId: "user-1",
          name: "Service 2",
          baseCost: 20,
          billingCycle: "monthly" as const,
          billingDayOfMonth: 20,
          billingMonth: null,
          consumptionCost: 0,
          detailsUrl: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "3",
          userId: "user-1",
          name: "Service 3",
          baseCost: 30,
          billingCycle: "monthly" as const,
          billingDayOfMonth: 25,
          billingMonth: null,
          consumptionCost: 0,
          detailsUrl: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const Widget = await ExpendituresWidget();
    render(Widget!);

    // Badge shows count of 3 expenditures
    expect(screen.getByText("3")).toBeDefined();
  });

  it("finds earliest next expenditure among multiple sources", async () => {
    vi.mocked(isCurrentUserAdmin).mockResolvedValue(true);
    vi.mocked(getExpenditures).mockResolvedValue({
      sources: [
        {
          id: "1",
          userId: "user-1",
          name: "Azure",
          baseCost: 100,
          billingCycle: "monthly" as const,
          billingDayOfMonth: 25,
          billingMonth: null,
          consumptionCost: 0,
          detailsUrl: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          userId: "user-1",
          name: "GitHub",
          baseCost: 20,
          billingCycle: "monthly" as const,
          billingDayOfMonth: 15,
          billingMonth: null,
          consumptionCost: 0,
          detailsUrl: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const Widget = await ExpendituresWidget();
    render(Widget!);

    // GitHub bills on 15th, Azure on 25th, we're on Jan 10 - GitHub is next with charge
    expect(screen.getByText(/GitHub, Jan 15 \(\$20\.00\)/)).toBeDefined();
  });

  it("calculates average monthly cost including yearly subscriptions", async () => {
    vi.mocked(isCurrentUserAdmin).mockResolvedValue(true);
    vi.mocked(getExpenditures).mockResolvedValue({
      sources: [
        {
          id: "1",
          userId: "user-1",
          name: "Monthly Service",
          baseCost: 12,
          billingCycle: "monthly" as const,
          billingDayOfMonth: 15,
          billingMonth: null,
          consumptionCost: 0,
          detailsUrl: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          userId: "user-1",
          name: "Yearly Service",
          baseCost: 120,
          billingCycle: "yearly" as const,
          billingDayOfMonth: 1,
          billingMonth: 6,
          consumptionCost: 0,
          detailsUrl: null,
          notes: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    const Widget = await ExpendituresWidget();
    render(Widget!);

    // Monthly: $12/mo + Yearly: $120/12 = $10/mo → Total: $22/mo
    expect(screen.getByText("$22.00")).toBeDefined();
  });

  it("renders View All link", async () => {
    vi.mocked(isCurrentUserAdmin).mockResolvedValue(true);
    vi.mocked(getExpenditures).mockResolvedValue({ sources: [] });

    const Widget = await ExpendituresWidget();
    render(Widget!);

    expect(screen.getByRole("link", { name: "View All" })).toBeDefined();
  });
});
