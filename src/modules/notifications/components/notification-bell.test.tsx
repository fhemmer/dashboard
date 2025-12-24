import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "../types";
import { NotificationBell } from "./notification-bell";

describe("NotificationBell", () => {
  const mockDismiss = vi.fn();
  const mockDismissAll = vi.fn();

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
      message: null,
      metadata: { type: "system" },
      createdAt: new Date("2025-01-01T11:00:00Z"),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders bell icon", () => {
    render(
      <NotificationBell
        notifications={[]}
        count={0}
        onDismiss={mockDismiss}
        onDismissAll={mockDismissAll}
      />
    );

    expect(screen.getByRole("button", { name: /0 notifications/i })).toBeInTheDocument();
  });

  it("shows count badge when count > 0", () => {
    render(
      <NotificationBell
        notifications={mockNotifications}
        count={5}
        onDismiss={mockDismiss}
        onDismissAll={mockDismissAll}
      />
    );

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("shows 99+ when count exceeds 99", () => {
    render(
      <NotificationBell
        notifications={mockNotifications}
        count={150}
        onDismiss={mockDismiss}
        onDismissAll={mockDismissAll}
      />
    );

    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("does not show badge when count is 0", () => {
    render(
      <NotificationBell
        notifications={[]}
        count={0}
        onDismiss={mockDismiss}
        onDismissAll={mockDismissAll}
      />
    );

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("opens dropdown when clicked", async () => {
    const user = userEvent.setup();

    render(
      <NotificationBell
        notifications={mockNotifications}
        count={2}
        onDismiss={mockDismiss}
        onDismissAll={mockDismissAll}
      />
    );

    await user.click(screen.getByRole("button", { name: /2 notifications/i }));

    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("News Update")).toBeInTheDocument();
    expect(screen.getByText("System Alert")).toBeInTheDocument();
  });

  it("shows empty state when no notifications", async () => {
    const user = userEvent.setup();

    render(
      <NotificationBell
        notifications={[]}
        count={0}
        onDismiss={mockDismiss}
        onDismissAll={mockDismissAll}
      />
    );

    await user.click(screen.getByRole("button", { name: /0 notifications/i }));

    expect(screen.getByText("No notifications")).toBeInTheDocument();
  });

  it("shows Clear all button when there are notifications", async () => {
    const user = userEvent.setup();

    render(
      <NotificationBell
        notifications={mockNotifications}
        count={2}
        onDismiss={mockDismiss}
        onDismissAll={mockDismissAll}
      />
    );

    await user.click(screen.getByRole("button", { name: /2 notifications/i }));

    expect(screen.getByRole("button", { name: /clear all/i })).toBeInTheDocument();
  });

  it("calls onDismissAll when Clear all is clicked", async () => {
    const user = userEvent.setup();

    render(
      <NotificationBell
        notifications={mockNotifications}
        count={2}
        onDismiss={mockDismiss}
        onDismissAll={mockDismissAll}
      />
    );

    await user.click(screen.getByRole("button", { name: /2 notifications/i }));
    await user.click(screen.getByRole("button", { name: /clear all/i }));

    expect(mockDismissAll).toHaveBeenCalled();
  });

  it("shows View all link when count exceeds 10", async () => {
    const user = userEvent.setup();

    render(
      <NotificationBell
        notifications={mockNotifications}
        count={15}
        onDismiss={mockDismiss}
        onDismissAll={mockDismissAll}
      />
    );

    await user.click(screen.getByRole("button", { name: /15 notifications/i }));

    expect(screen.getByRole("menuitem", { name: /view all 15 notifications/i })).toBeInTheDocument();
  });

  it("does not show View all link when count is 10 or less", async () => {
    const user = userEvent.setup();

    render(
      <NotificationBell
        notifications={mockNotifications}
        count={2}
        onDismiss={mockDismiss}
        onDismissAll={mockDismissAll}
      />
    );

    await user.click(screen.getByRole("button", { name: /2 notifications/i }));

    expect(screen.queryByRole("menuitem", { name: /view all/i })).not.toBeInTheDocument();
  });
});
