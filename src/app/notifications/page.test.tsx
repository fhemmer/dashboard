import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock Supabase
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

// Mock notifications module
vi.mock("@/modules/notifications", async () => {
  const actual = await vi.importActual("@/modules/notifications");
  return {
    ...actual,
    getNotifications: vi.fn().mockResolvedValue({
      notifications: [
        {
          id: "1",
          userId: "user-1",
          type: "news",
          title: "Test Notification",
          message: "Test message",
          metadata: { type: "news", sourceId: "src-1", sourceName: "Test", itemCount: 1 },
          createdAt: new Date("2025-01-01T12:00:00Z"),
        },
      ],
      error: null,
    }),
  };
});

import { redirect } from "next/navigation";
import NotificationsPage from "./page";

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to login when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await NotificationsPage();

    expect(redirect).toHaveBeenCalledWith("/login");
  });

  it("renders page title", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const Page = await NotificationsPage();
    render(Page);

    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("renders back button", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const Page = await NotificationsPage();
    render(Page);

    const backLink = screen.getByRole("link", { name: "" });
    expect(backLink).toHaveAttribute("href", "/");
  });

  it("renders notification list", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const Page = await NotificationsPage();
    render(Page);

    expect(screen.getByText("Test Notification")).toBeInTheDocument();
  });
});
