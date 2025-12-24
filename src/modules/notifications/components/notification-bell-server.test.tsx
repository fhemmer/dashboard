import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock supabase client
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

// Mock actions
const mockGetNotifications = vi.fn();
const mockGetUnreadCount = vi.fn();
vi.mock("@/modules/notifications", async () => {
  const actual = await vi.importActual("@/modules/notifications");
  return {
    ...actual,
    getNotifications: () => mockGetNotifications(),
    getUnreadCount: () => mockGetUnreadCount(),
    NotificationBellWrapper: ({ initialNotifications, initialCount }: { initialNotifications: unknown[]; initialCount: number }) => (
      <div data-testid="notification-bell-wrapper">
        <span data-testid="count">{initialCount}</span>
        <span data-testid="notifications">{initialNotifications.length}</span>
      </div>
    ),
  };
});

// Import after mocks
import { NotificationBellServer } from "./notification-bell-server";

describe("NotificationBellServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNotifications.mockResolvedValue({ notifications: [], error: null });
    mockGetUnreadCount.mockResolvedValue({ count: 0, error: null });
  });

  it("returns null when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await NotificationBellServer();

    expect(result).toBeNull();
  });

  it("renders NotificationBellWrapper for authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockGetNotifications.mockResolvedValue({
      notifications: [{ id: "1", title: "Test" }],
      error: null,
    });
    mockGetUnreadCount.mockResolvedValue({ count: 5, error: null });

    const result = await NotificationBellServer();
    render(<>{result}</>);

    expect(screen.getByTestId("notification-bell-wrapper")).toBeInTheDocument();
    expect(screen.getByTestId("count")).toHaveTextContent("5");
    expect(screen.getByTestId("notifications")).toHaveTextContent("1");
  });

  it("passes fetched notifications to wrapper", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockGetNotifications.mockResolvedValue({
      notifications: [
        { id: "1", title: "First" },
        { id: "2", title: "Second" },
      ],
      error: null,
    });
    mockGetUnreadCount.mockResolvedValue({ count: 2, error: null });

    const result = await NotificationBellServer();
    render(<>{result}</>);

    expect(screen.getByTestId("notifications")).toHaveTextContent("2");
  });
});
