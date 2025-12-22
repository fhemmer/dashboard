import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock supabase client first (before imports that use it)
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: vi.fn(() => ({
        select: mockSelect,
        update: mockUpdate,
      })),
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

// Mock revalidatePath
const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type: string) => mockRevalidatePath(path, type),
}));

import { getProfile, updateProfile, updateSidebarWidth } from "./actions";

describe("account actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ eq: mockEq });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  describe("getProfile", () => {
    it("returns null when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getProfile();

      expect(result).toBeNull();
    });

    it("returns profile when user is authenticated", async () => {
      const mockProfile = {
        id: "user-123",
        email: "test@example.com",
        role: "user",
        display_name: "Test User",
        theme: "default",
        updated_at: "2024-01-01T00:00:00Z",
      };

      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockSingle.mockResolvedValue({ data: mockProfile });

      const result = await getProfile();

      expect(result).toEqual(mockProfile);
    });
  });

  describe("updateProfile", () => {
    it("redirects to login when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const formData = new FormData();
      formData.set("displayName", "Test User");
      formData.set("theme", "default");

      await expect(updateProfile(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/login"
      );
    });

    it("updates profile and redirects with success", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockEq.mockResolvedValue({ error: null });

      const formData = new FormData();
      formData.set("displayName", "Test User");
      formData.set("theme", "default");
      formData.set("font", "geist");

      await expect(updateProfile(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/account?success=true"
      );

      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("redirects with error when update fails", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockEq.mockResolvedValue({ error: { message: "Database error" } });

      const formData = new FormData();
      formData.set("displayName", "Test User");
      formData.set("theme", "default");
      formData.set("font", "geist");

      await expect(updateProfile(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/account?error=Database%20error"
      );
    });

    it("handles empty displayName by setting null", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockEq.mockResolvedValue({ error: null });

      const formData = new FormData();
      formData.set("displayName", "");
      formData.set("theme", "default");
      formData.set("font", "geist");

      await expect(updateProfile(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/account?success=true"
      );
    });

    it("defaults theme to 'default' when not provided", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockEq.mockResolvedValue({ error: null });

      const formData = new FormData();
      formData.set("displayName", "Test User");
      formData.set("theme", "");
      formData.set("font", "geist");

      await expect(updateProfile(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/account?success=true"
      );
    });

    it("defaults font to 'geist' when not provided", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockEq.mockResolvedValue({ error: null });

      const formData = new FormData();
      formData.set("displayName", "Test User");
      formData.set("theme", "default");
      formData.set("font", "");

      await expect(updateProfile(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/account?success=true"
      );
    });
  });

  describe("updateSidebarWidth", () => {
    it("returns error when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await updateSidebarWidth(300);

      expect(result).toEqual({ error: "Not authenticated" });
    });

    it("updates sidebar width successfully", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockEq.mockResolvedValue({ error: null });

      const result = await updateSidebarWidth(300);

      expect(result).toEqual({});
    });

    it("clamps width to minimum", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockEq.mockResolvedValue({ error: null });

      const result = await updateSidebarWidth(100);

      expect(result).toEqual({});
    });

    it("clamps width to maximum", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockEq.mockResolvedValue({ error: null });

      const result = await updateSidebarWidth(500);

      expect(result).toEqual({});
    });

    it("returns error when update fails", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockEq.mockResolvedValue({ error: { message: "Database error" } });

      const result = await updateSidebarWidth(300);

      expect(result).toEqual({ error: "Database error" });
    });
  });
});
