import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Notification } from "../types";
import { NotificationItem } from "./notification-item";

describe("NotificationItem", () => {
  const mockDismiss = vi.fn();

  const baseNotification: Notification = {
    id: "notif-1",
    userId: "user-1",
    type: "news",
    title: "Test Notification",
    message: "This is a test message",
    metadata: { type: "news", sourceId: "src-1", sourceName: "Test", itemCount: 1 },
    createdAt: new Date("2025-01-01T12:00:00Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T13:00:00Z"));
  });

  it("renders notification title", () => {
    render(
      <NotificationItem notification={baseNotification} onDismiss={mockDismiss} />
    );

    expect(screen.getByText("Test Notification")).toBeInTheDocument();
  });

  it("renders notification message", () => {
    render(
      <NotificationItem notification={baseNotification} onDismiss={mockDismiss} />
    );

    expect(screen.getByText("This is a test message")).toBeInTheDocument();
  });

  it("renders time ago", () => {
    render(
      <NotificationItem notification={baseNotification} onDismiss={mockDismiss} />
    );

    expect(screen.getByText(/about 1 hour ago/i)).toBeInTheDocument();
  });

  it("handles notification without message", () => {
    const notification: Notification = {
      ...baseNotification,
      message: null,
    };

    render(
      <NotificationItem notification={notification} onDismiss={mockDismiss} />
    );

    expect(screen.getByText("Test Notification")).toBeInTheDocument();
    expect(screen.queryByText("This is a test message")).not.toBeInTheDocument();
  });

  it("calls onDismiss when dismiss button is clicked", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();

    render(
      <NotificationItem notification={baseNotification} onDismiss={mockDismiss} />
    );

    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    await user.click(dismissButton);

    expect(mockDismiss).toHaveBeenCalledWith("notif-1");
  });

  it("renders correct icon for news type", () => {
    render(
      <NotificationItem notification={baseNotification} onDismiss={mockDismiss} />
    );

    const item = screen.getByTestId("notification-item");
    expect(item.querySelector(".text-blue-500")).toBeInTheDocument();
  });

  it("renders correct icon for pr type", () => {
    const notification: Notification = {
      ...baseNotification,
      type: "pr",
    };

    render(
      <NotificationItem notification={notification} onDismiss={mockDismiss} />
    );

    const item = screen.getByTestId("notification-item");
    expect(item.querySelector(".text-green-500")).toBeInTheDocument();
  });

  it("renders correct icon for expenditure type", () => {
    const notification: Notification = {
      ...baseNotification,
      type: "expenditure",
    };

    render(
      <NotificationItem notification={notification} onDismiss={mockDismiss} />
    );

    const item = screen.getByTestId("notification-item");
    expect(item.querySelector(".text-orange-500")).toBeInTheDocument();
  });

  it("renders correct icon for system type", () => {
    const notification: Notification = {
      ...baseNotification,
      type: "system",
    };

    render(
      <NotificationItem notification={notification} onDismiss={mockDismiss} />
    );

    const item = screen.getByTestId("notification-item");
    expect(item.querySelector(".text-purple-500")).toBeInTheDocument();
  });
});
