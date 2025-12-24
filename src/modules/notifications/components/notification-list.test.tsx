import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "../types";
import { NotificationList } from "./notification-list";

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

describe("NotificationList", () => {
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

  it("renders list of notifications", () => {
    render(<NotificationList initialNotifications={mockNotifications} />);

    expect(screen.getByText("News Update")).toBeInTheDocument();
    expect(screen.getByText("System Alert")).toBeInTheDocument();
  });

  it("shows notification count", () => {
    render(<NotificationList initialNotifications={mockNotifications} />);

    expect(screen.getByText("2 notifications")).toBeInTheDocument();
  });

  it("shows singular notification text for 1 notification", () => {
    render(<NotificationList initialNotifications={[mockNotifications[0]]} />);

    expect(screen.getByText("1 notification")).toBeInTheDocument();
  });

  it("shows empty state when no notifications", () => {
    render(<NotificationList initialNotifications={[]} />);

    expect(screen.getByText("All caught up!")).toBeInTheDocument();
    expect(screen.getByText("You have no notifications at the moment.")).toBeInTheDocument();
  });

  it("shows Back to Dashboard link in empty state", () => {
    render(<NotificationList initialNotifications={[]} />);

    const link = screen.getByRole("link", { name: /back to dashboard/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("shows Clear all button", () => {
    render(<NotificationList initialNotifications={mockNotifications} />);

    expect(screen.getByRole("button", { name: /clear all/i })).toBeInTheDocument();
  });

  it("has dismiss buttons for each notification", () => {
    render(<NotificationList initialNotifications={mockNotifications} />);

    const dismissButtons = screen.getAllByRole("button", { name: /dismiss/i });
    expect(dismissButtons).toHaveLength(2);
  });

  it("calls dismissNotification when dismiss button clicked", async () => {
    const user = userEvent.setup();
    render(<NotificationList initialNotifications={mockNotifications} />);

    const dismissButtons = screen.getAllByRole("button", { name: /dismiss/i });
    await user.click(dismissButtons[0]);

    expect(mockDismissNotification).toHaveBeenCalledWith("1");
  });

  it("calls dismissAllNotifications when Clear all clicked", async () => {
    const user = userEvent.setup();
    render(<NotificationList initialNotifications={mockNotifications} />);

    const clearAllButton = screen.getByRole("button", { name: /clear all/i });
    await user.click(clearAllButton);

    expect(mockDismissAllNotifications).toHaveBeenCalled();
  });

  it("refreshes router after dismiss", async () => {
    const user = userEvent.setup();
    render(<NotificationList initialNotifications={mockNotifications} />);

    const dismissButtons = screen.getAllByRole("button", { name: /dismiss/i });
    await user.click(dismissButtons[0]);

    await vi.waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("refreshes router after dismiss all", async () => {
    const user = userEvent.setup();
    render(<NotificationList initialNotifications={mockNotifications} />);

    const clearAllButton = screen.getByRole("button", { name: /clear all/i });
    await user.click(clearAllButton);

    await vi.waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
