import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "../types";
import { NotificationBellWrapper } from "./notification-bell-wrapper";

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock actions
const mockDismissNotification = vi.fn();
const mockDismissAllNotifications = vi.fn();
vi.mock("../actions", () => ({
  dismissNotification: (id: string) => mockDismissNotification(id),
  dismissAllNotifications: () => mockDismissAllNotifications(),
}));

describe("NotificationBellWrapper", () => {
  const mockNotifications: Notification[] = [
    {
      id: "1",
      userId: "user-1",
      type: "news",
      title: "News Update",
      message: "New articles available",
      metadata: { type: "news", sourceId: "src-1", sourceName: "Test", itemCount: 3 },
      createdAt: new Date("2025-01-01T12:00:00Z"),
    },
    {
      id: "2",
      userId: "user-1",
      type: "system",
      title: "System Alert",
      message: "Maintenance scheduled",
      metadata: { type: "system" },
      createdAt: new Date("2025-01-01T11:00:00Z"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockDismissNotification.mockResolvedValue({ success: true, error: null });
    mockDismissAllNotifications.mockResolvedValue({ success: true, error: null });
  });

  it("renders NotificationBell with count", () => {
    render(
      <NotificationBellWrapper
        initialNotifications={mockNotifications}
        initialCount={5}
      />
    );

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders NotificationBell with notifications", async () => {
    const user = userEvent.setup();
    render(
      <NotificationBellWrapper
        initialNotifications={mockNotifications}
        initialCount={2}
      />
    );

    // Open dropdown
    const bell = screen.getByRole("button");
    await user.click(bell);

    expect(screen.getByText("News Update")).toBeInTheDocument();
    expect(screen.getByText("System Alert")).toBeInTheDocument();
  });

  it("calls dismissNotification when dismiss button clicked", async () => {
    const user = userEvent.setup();
    render(
      <NotificationBellWrapper
        initialNotifications={mockNotifications}
        initialCount={2}
      />
    );

    // Open dropdown
    const bell = screen.getByRole("button");
    await user.click(bell);

    // Click dismiss on first notification
    const dismissButtons = screen.getAllByRole("button", { name: /dismiss/i });
    await user.click(dismissButtons[0]);

    expect(mockDismissNotification).toHaveBeenCalledWith("1");
  });

  it("calls dismissAllNotifications when Clear all clicked", async () => {
    const user = userEvent.setup();
    render(
      <NotificationBellWrapper
        initialNotifications={mockNotifications}
        initialCount={2}
      />
    );

    // Open dropdown
    const bell = screen.getByRole("button");
    await user.click(bell);

    // Click Clear all
    const clearAllButton = screen.getByRole("button", { name: /clear all/i });
    await user.click(clearAllButton);

    expect(mockDismissAllNotifications).toHaveBeenCalled();
  });

  it("refreshes router after dismiss", async () => {
    const user = userEvent.setup();
    render(
      <NotificationBellWrapper
        initialNotifications={mockNotifications}
        initialCount={2}
      />
    );

    // Open dropdown
    const bell = screen.getByRole("button");
    await user.click(bell);

    // Click dismiss
    const dismissButtons = screen.getAllByRole("button", { name: /dismiss/i });
    await user.click(dismissButtons[0]);

    // Wait for async operations
    await vi.waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("refreshes router after dismiss all", async () => {
    const user = userEvent.setup();
    render(
      <NotificationBellWrapper
        initialNotifications={mockNotifications}
        initialCount={2}
      />
    );

    // Open dropdown
    const bell = screen.getByRole("button");
    await user.click(bell);

    // Click Clear all
    const clearAllButton = screen.getByRole("button", { name: /clear all/i });
    await user.click(clearAllButton);

    // Wait for async operations
    await vi.waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
