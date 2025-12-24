import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the getProfile action
const mockGetProfile = vi.fn();
vi.mock("./actions", () => ({
  getProfile: () => mockGetProfile(),
  updateProfile: vi.fn(),
}));

// Mock news-sources module
const mockGetCurrentUserRole = vi.fn();
const mockGetSystemSettings = vi.fn();
vi.mock("@/modules/news-sources", () => ({
  getCurrentUserRole: () => mockGetCurrentUserRole(),
  getSystemSettings: () => mockGetSystemSettings(),
  AdminSettingsForm: ({ fetchIntervalMinutes, notificationRetentionDays }: { fetchIntervalMinutes: number; notificationRetentionDays: number }) => (
    <div data-testid="admin-settings-form">
      Fetch: {fetchIntervalMinutes}, Retention: {notificationRetentionDays}
    </div>
  ),
}));

// Mock supabase server
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

// Mock redirect to throw so we can catch it
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

import AccountPage from "./page";

describe("AccountPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "test@example.com" } },
    });
    mockGetProfile.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      role: "user",
      display_name: "Test User",
      theme: "default",
      font: "geist",
      updated_at: "2024-01-01T00:00:00Z",
    });
    mockGetCurrentUserRole.mockResolvedValue("user");
    mockGetSystemSettings.mockResolvedValue({
      fetchIntervalMinutes: 30,
      notificationRetentionDays: 30,
      lastFetchAt: null,
      error: null,
    });
  });

  it("renders account settings form correctly", async () => {
    const Page = await AccountPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    expect(screen.getByText("Account Settings")).toBeDefined();
    expect(screen.getByText("Manage your profile and preferences.")).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Display Name")).toBeDefined();
    expect(screen.getByLabelText("Theme")).toBeDefined();
    expect(screen.getByLabelText("Font")).toBeDefined();
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDefined();
  });

  it("displays error message when error param is present", async () => {
    const Page = await AccountPage({
      searchParams: Promise.resolve({ error: "Database error" }),
    });

    render(Page);

    expect(screen.getByText("Database error")).toBeDefined();
  });

  it("displays success message when success param is present", async () => {
    const Page = await AccountPage({
      searchParams: Promise.resolve({ success: "true" }),
    });

    render(Page);

    expect(screen.getByText("Settings saved successfully.")).toBeDefined();
  });

  it("prefills display name from profile", async () => {
    const Page = await AccountPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    const displayNameInput = screen.getByLabelText("Display Name") as HTMLInputElement;
    expect(displayNameInput.defaultValue).toBe("Test User");
  });

  it("shows email as disabled", async () => {
    const Page = await AccountPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    expect(emailInput.disabled).toBe(true);
  });

  it("shows default theme selected", async () => {
    const Page = await AccountPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    const themeSelect = screen.getByLabelText("Theme") as HTMLSelectElement;
    expect(themeSelect.value).toBe("default");
  });

  it("redirects to login when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(
      AccountPage({
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("handles null profile gracefully with empty display name", async () => {
    mockGetProfile.mockResolvedValue(null);

    const Page = await AccountPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    const displayNameInput = screen.getByLabelText("Display Name") as HTMLInputElement;
    expect(displayNameInput.defaultValue).toBe("");
  });

  it("handles null profile gracefully with default theme", async () => {
    mockGetProfile.mockResolvedValue(null);

    const Page = await AccountPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    const themeSelect = screen.getByLabelText("Theme") as HTMLSelectElement;
    expect(themeSelect.value).toBe("default");
  });

  it("handles profile with null display_name", async () => {
    mockGetProfile.mockResolvedValue({
      id: "user-123",
      email: "test@example.com",
      role: "user",
      display_name: null,
      theme: "default",
      font: "geist",
      updated_at: "2024-01-01T00:00:00Z",
    });

    const Page = await AccountPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    const displayNameInput = screen.getByLabelText("Display Name") as HTMLInputElement;
    expect(displayNameInput.defaultValue).toBe("");
  });

  it("shows default font selected", async () => {
    const Page = await AccountPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    const fontSelect = screen.getByLabelText("Font") as HTMLSelectElement;
    expect(fontSelect.value).toBe("geist");
  });

  it("handles null profile gracefully with default font", async () => {
    mockGetProfile.mockResolvedValue(null);

    const Page = await AccountPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    const fontSelect = screen.getByLabelText("Font") as HTMLSelectElement;
    expect(fontSelect.value).toBe("geist");
  });

  it("shows admin settings section for admin users", async () => {
    mockGetCurrentUserRole.mockResolvedValue("admin");

    const Page = await AccountPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    expect(screen.getByText("System Settings")).toBeDefined();
    expect(screen.getByTestId("admin-settings-form")).toBeDefined();
  });

  it("hides admin settings section for regular users", async () => {
    mockGetCurrentUserRole.mockResolvedValue("user");

    const Page = await AccountPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    expect(screen.queryByText("System Settings")).toBeNull();
    expect(screen.queryByTestId("admin-settings-form")).toBeNull();
  });

  it("hides admin settings section for news_manager", async () => {
    mockGetCurrentUserRole.mockResolvedValue("news_manager");

    const Page = await AccountPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    expect(screen.queryByText("System Settings")).toBeNull();
    expect(screen.queryByTestId("admin-settings-form")).toBeNull();
  });

  it("hides admin settings when system settings have error", async () => {
    mockGetCurrentUserRole.mockResolvedValue("admin");
    mockGetSystemSettings.mockResolvedValue({
      fetchIntervalMinutes: 30,
      notificationRetentionDays: 30,
      lastFetchAt: null,
      error: "Permission denied",
    });

    const Page = await AccountPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    expect(screen.queryByTestId("admin-settings-form")).toBeNull();
  });

  it("passes system settings to admin form", async () => {
    mockGetCurrentUserRole.mockResolvedValue("admin");
    mockGetSystemSettings.mockResolvedValue({
      fetchIntervalMinutes: 60,
      notificationRetentionDays: 14,
      lastFetchAt: null,
      error: null,
    });

    const Page = await AccountPage({
      searchParams: Promise.resolve({}),
    });

    render(Page);

    expect(screen.getByText("Fetch: 60, Retention: 14")).toBeDefined();
  });
});
