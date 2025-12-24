import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    })
  ),
}));

vi.mock("@/modules/news", () => ({
  NewsWidget: () => <div data-testid="news-widget">News Widget</div>,
}));

vi.mock("@/modules/github-prs", () => ({
  PRWidget: () => <div data-testid="pr-widget">PR Widget</div>,
}));

vi.mock("@/modules/expenditures", () => ({
  ExpendituresWidget: () => (
    <div data-testid="expenditures-widget">Expenditures Widget</div>
  ),
}));

vi.mock("@/components/landing", () => ({
  LandingPage: () => <div data-testid="landing-page">Landing Page</div>,
}));

describe("Home Page", () => {
  it("renders the dashboard with widgets when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
      error: null,
    });

    const Page = await Home();
    render(Page);

    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Your personal dashboard overview.")).toBeDefined();
    expect(screen.getByTestId("news-widget")).toBeDefined();
    expect(screen.getByTestId("pr-widget")).toBeDefined();
    expect(screen.getByTestId("expenditures-widget")).toBeDefined();
  });

  it("renders landing page when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const Page = await Home();
    render(Page);

    expect(screen.getByTestId("landing-page")).toBeDefined();
    expect(screen.queryByText("Dashboard")).toBeNull();
  });
});
