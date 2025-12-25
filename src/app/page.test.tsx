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

vi.mock("@/app/actions.dashboard", () => ({
  getWidgetSettings: vi.fn(() =>
    Promise.resolve({
      settings: {
        widgets: [
          { id: "pull-requests", enabled: true, order: 0 },
          { id: "news", enabled: true, order: 1 },
          { id: "expenditures", enabled: true, order: 2 },
        ],
      },
      isAdmin: true,
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

vi.mock("@/modules/timers", () => ({
  TimerWidget: () => <div data-testid="timer-widget">Timer Widget</div>,
}));

vi.mock("@/modules/mail/components/mail-widget", () => ({
  MailWidget: () => <div data-testid="mail-widget">Mail Widget</div>,
}));

vi.mock("@/components/landing", () => ({
  LandingPage: () => <div data-testid="landing-page">Landing Page</div>,
}));

vi.mock("@/components/dashboard-config-sheet", () => ({
  DashboardConfigSheet: () => (
    <div data-testid="dashboard-config-sheet">Config Sheet</div>
  ),
}));

vi.mock("@/components/dashboard-grid", () => ({
  DashboardGrid: ({
    widgetComponents,
  }: {
    widgetComponents: Record<string, React.ReactNode>;
  }) => (
    <div data-testid="dashboard-grid">
      {Object.entries(widgetComponents).map(([id, component]) => (
        <div key={id}>{component}</div>
      ))}
    </div>
  ),
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
    expect(screen.getByTestId("dashboard-config-sheet")).toBeDefined();
    expect(screen.getByTestId("dashboard-grid")).toBeDefined();
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
