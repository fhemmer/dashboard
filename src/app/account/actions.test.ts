/* eslint-disable sonarjs/no-hardcoded-passwords -- Test file contains form field names 'password', not actual credentials */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock supabase client first (before imports that use it)
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockGetUser = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
        signInWithPassword: mockSignInWithPassword,
        updateUser: mockUpdateUser,
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

import { changePassword, getProfile, updateProfile, updateSidebarWidth } from "./actions";

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

  describe("changePassword", () => {
    it("redirects to login when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const formData = new FormData();
      formData.set("currentPassword", "oldPassword123");
      formData.set("newPassword", "newPassword123");
      formData.set("confirmNewPassword", "newPassword123");

      await expect(changePassword(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/login"
      );
    });

    it("redirects with error when new passwords do not match", async () => {
      mockGetUser.mockResolvedValue({ 
        data: { user: { id: "user-123", email: "test@example.com" } } 
      });

      const formData = new FormData();
      formData.set("currentPassword", "oldPassword123");
      formData.set("newPassword", "newPassword123");
      formData.set("confirmNewPassword", "differentPassword");

      await expect(changePassword(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/account?error=New%20passwords%20do%20not%20match."
      );

      expect(mockSignInWithPassword).not.toHaveBeenCalled();
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it("redirects with error when current password is incorrect", async () => {
      mockGetUser.mockResolvedValue({ 
        data: { user: { id: "user-123", email: "test@example.com" } } 
      });
      mockSignInWithPassword.mockResolvedValue({ 
        error: { message: "Invalid credentials" } 
      });

      const formData = new FormData();
      formData.set("currentPassword", "wrongPassword");
      formData.set("newPassword", "newPassword123");
      formData.set("confirmNewPassword", "newPassword123");

      await expect(changePassword(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/account?error=Current%20password%20is%20incorrect."
      );

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "wrongPassword",
      });
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });

    it("changes password successfully and redirects with success", async () => {
      mockGetUser.mockResolvedValue({ 
        data: { user: { id: "user-123", email: "test@example.com" } } 
      });
      mockSignInWithPassword.mockResolvedValue({ error: null });
      mockUpdateUser.mockResolvedValue({ error: null });

      const formData = new FormData();
      formData.set("currentPassword", "oldPassword123");
      formData.set("newPassword", "newPassword123");
      formData.set("confirmNewPassword", "newPassword123");

      await expect(changePassword(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/account?success=true"
      );

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "oldPassword123",
      });
      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: "newPassword123",
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("redirects with error when password update fails", async () => {
      mockGetUser.mockResolvedValue({ 
        data: { user: { id: "user-123", email: "test@example.com" } } 
      });
      mockSignInWithPassword.mockResolvedValue({ error: null });
      mockUpdateUser.mockResolvedValue({ 
        error: { message: "Password update failed" } 
      });

      const formData = new FormData();
      formData.set("currentPassword", "oldPassword123");
      formData.set("newPassword", "newPassword123");
      formData.set("confirmNewPassword", "newPassword123");

      await expect(changePassword(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/account?error=Password%20update%20failed"
      );

      expect(mockUpdateUser).toHaveBeenCalledWith({
        password: "newPassword123",
      });
    });

    it("redirects with error when user email is not found", async () => {
      mockGetUser.mockResolvedValue({ 
        data: { user: { id: "user-123", email: null } } 
      });

      const formData = new FormData();
      formData.set("currentPassword", "oldPassword123");
      formData.set("newPassword", "newPassword123");
      formData.set("confirmNewPassword", "newPassword123");

      await expect(changePassword(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/account?error=User%20email%20not%20found."
      );

      expect(mockSignInWithPassword).not.toHaveBeenCalled();
      expect(mockUpdateUser).not.toHaveBeenCalled();
    });
  });
});
