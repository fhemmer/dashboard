import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation - redirect throws to stop execution
vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

// Mock supabase client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Mock expenditures module
vi.mock("@/modules/expenditures", () => ({
  getExpenditures: vi.fn(),
}));

// Mock child components
vi.mock(
  "../../modules/expenditures/components/add-expenditure-form",
  () => ({
    AddExpenditureForm: () => (
      <div data-testid="add-expenditure-form">Add Form</div>
    ),
  })
);

vi.mock("../../modules/expenditures/components/expenditure-item", () => ({
  ExpenditureItem: ({ source }: { source: { name: string } }) => (
    <div data-testid="expenditure-item">{source.name}</div>
  ),
}));

import { createClient } from "@/lib/supabase/server";
import { getExpenditures } from "@/modules/expenditures";
import { redirect } from "next/navigation";
import ExpendituresPage from "./page";

describe("ExpendituresPage", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirects to login when user is not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    await expect(ExpendituresPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("renders page with expenditure sources", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(getExpenditures).mockResolvedValue({
      sources: [
        {
          id: "1",
          userId: "user-123",
          name: "Netflix",
          baseCost: 15.99,
          billingCycle: "monthly",
          billingDayOfMonth: 1,
          billingMonth: null,
          consumptionCost: 0,
          detailsUrl: null,
          notes: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ],
      error: undefined,
    });

    const result = await ExpendituresPage();
    render(result);

    expect(screen.getByText("Expenditures")).toBeDefined();
    expect(screen.getByText("Netflix")).toBeDefined();
    expect(screen.getByTestId("add-expenditure-form")).toBeDefined();
  });

  it("renders empty state when no sources", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(getExpenditures).mockResolvedValue({
      sources: [],
      error: undefined,
    });

    const result = await ExpendituresPage();
    render(result);

    expect(screen.getByText("No expenditure sources")).toBeDefined();
    expect(
      screen.getByText(/Add your first subscription/)
    ).toBeDefined();
  });

  it("displays error message when fetch fails", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(getExpenditures).mockResolvedValue({
      sources: [],
      error: "Failed to load expenditures",
    });

    const result = await ExpendituresPage();
    render(result);

    expect(screen.getByText("Failed to load expenditures")).toBeDefined();
  });

  it("calculates and displays grand total", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(getExpenditures).mockResolvedValue({
      sources: [
        {
          id: "1",
          userId: "user-123",
          name: "Netflix",
          baseCost: 10.0,
          billingCycle: "monthly",
          billingDayOfMonth: 1,
          billingMonth: null,
          consumptionCost: 0,
          detailsUrl: null,
          notes: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
        {
          id: "2",
          userId: "user-123",
          name: "Spotify",
          baseCost: 9.99,
          billingCycle: "monthly",
          billingDayOfMonth: 1,
          billingMonth: null,
          consumptionCost: 0,
          detailsUrl: null,
          notes: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ],
      error: undefined,
    });

    const result = await ExpendituresPage();
    render(result);

    // Total should be $19.99
    expect(screen.getByText("$19.99")).toBeDefined();
    expect(screen.getByText("Est. Monthly Total")).toBeDefined();
  });

  it("calculates monthly total including yearly costs divided by 12", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    vi.mocked(getExpenditures).mockResolvedValue({
      sources: [
        {
          id: "1",
          userId: "user-123",
          name: "Monthly Service",
          baseCost: 10.0,
          billingCycle: "monthly",
          billingDayOfMonth: 1,
          billingMonth: null,
          consumptionCost: 0,
          detailsUrl: null,
          notes: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
        {
          id: "2",
          userId: "user-123",
          name: "Yearly Service",
          baseCost: 120.0,
          billingCycle: "yearly",
          billingDayOfMonth: 1,
          billingMonth: 6,
          consumptionCost: 0,
          detailsUrl: null,
          notes: null,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
      ],
      error: undefined,
    });

    const result = await ExpendituresPage();
    render(result);

    // Monthly: $10, Yearly: $120/12 = $10, Total: $20
    expect(screen.getByText("$20.00")).toBeDefined();
  });
});
