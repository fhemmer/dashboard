import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    getWidgetSettings,
    resetWidgetSettings,
    updateWidgetOrder,
    updateWidgetVisibility,
} from "./actions.dashboard";

const mockUser = { id: "user-123", email: "test@example.com" };

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  rpc: vi.fn(),
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("getWidgetSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await getWidgetSettings();

    expect(result.error).toBe("Not authenticated");
    expect(result.settings.widgets).toHaveLength(0);
    expect(result.isAdmin).toBe(false);
  });

  it("returns default settings for new user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockSupabase.rpc.mockResolvedValue({ data: false });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: "PGRST116" } }),
    });

    const result = await getWidgetSettings();

    expect(result.error).toBeUndefined();
    expect(result.isAdmin).toBe(false);
    // Non-admin gets 4 widgets (pull-requests, news, timers, mail - no expenditures)
    expect(result.settings.widgets).toHaveLength(4);
    expect(result.settings.widgets.every((w) => w.enabled)).toBe(true);
  });

  it("returns all widgets for admin user", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockSupabase.rpc.mockResolvedValue({ data: true });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { widget_settings: null }, error: null }),
    });

    const result = await getWidgetSettings();

    expect(result.isAdmin).toBe(true);
    expect(result.settings.widgets).toHaveLength(5);
  });

  it("merges stored settings with available widgets", async () => {
    const storedSettings = {
      widgets: [
        { id: "pull-requests", enabled: false, order: 1 },
        { id: "news", enabled: true, order: 0 },
      ],
    };

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockSupabase.rpc.mockResolvedValue({ data: true });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { widget_settings: storedSettings },
        error: null,
      }),
    });

    const result = await getWidgetSettings();

    expect(result.settings.widgets).toHaveLength(5);
    const prWidget = result.settings.widgets.find((w) => w.id === "pull-requests");
    expect(prWidget?.enabled).toBe(false);
  });
});

describe("updateWidgetVisibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await updateWidgetVisibility("news", false);

    expect(result.error).toBe("Not authenticated");
  });

  it("updates widget visibility successfully", async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockSupabase.rpc.mockResolvedValue({ data: false });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        single: vi.fn().mockResolvedValue({ data: { widget_settings: null }, error: null }),
      })),
      update: mockUpdate,
    });
    mockUpdate.mockReturnValue({ eq: mockEq });

    const result = await updateWidgetVisibility("news", false);

    expect(result.error).toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("returns error when update fails", async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: { message: "Update failed" } });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockSupabase.rpc.mockResolvedValue({ data: false });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        single: vi.fn().mockResolvedValue({ data: { widget_settings: null }, error: null }),
      })),
      update: mockUpdate,
    });
    mockUpdate.mockReturnValue({ eq: mockEq });

    const result = await updateWidgetVisibility("news", false);

    expect(result.error).toBe("Update failed");
  });
});

describe("updateWidgetOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await updateWidgetOrder(["news", "pull-requests"]);

    expect(result.error).toBe("Not authenticated");
  });

  it("updates widget order successfully", async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockSupabase.rpc.mockResolvedValue({ data: false });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(() => ({
        single: vi.fn().mockResolvedValue({ data: { widget_settings: null }, error: null }),
      })),
      update: mockUpdate,
    });
    mockUpdate.mockReturnValue({ eq: mockEq });

    const result = await updateWidgetOrder(["news", "pull-requests"]);

    expect(result.error).toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });
});

describe("resetWidgetSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await resetWidgetSettings();

    expect(result.error).toBe("Not authenticated");
  });

  it("resets settings successfully", async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: null });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockSupabase.from.mockReturnValue({
      update: mockUpdate,
    });
    mockUpdate.mockReturnValue({ eq: mockEq });

    const result = await resetWidgetSettings();

    expect(result.error).toBeUndefined();
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("returns error when reset fails", async () => {
    const mockUpdate = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockResolvedValue({ error: { message: "Reset failed" } });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockSupabase.from.mockReturnValue({
      update: mockUpdate,
    });
    mockUpdate.mockReturnValue({ eq: mockEq });

    const result = await resetWidgetSettings();

    expect(result.error).toBe("Reset failed");
  });
});
