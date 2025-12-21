import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock supabase client first (before imports that use it)
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
        signOut: mockSignOut,
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

// Mock revalidatePath
const mockRevalidatePath = vi.fn();
vi.mock("next/cache", () => ({
  revalidatePath: (path: string, type: string) => mockRevalidatePath(path, type),
}));

// Mock env
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  },
}));

import { signIn, signOut, signUp } from "./actions";

describe("auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signIn", () => {
    it("redirects to home on successful sign in", async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null });

      const formData = new FormData();
      formData.set("email", "test@example.com");
      formData.set("password", "password123");

      await expect(signIn(formData)).rejects.toThrow("NEXT_REDIRECT:/");

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
      expect(mockRedirect).toHaveBeenCalledWith("/");
    });

    it("redirects to login with error on failed sign in", async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: "Invalid credentials" },
      });

      const formData = new FormData();
      formData.set("email", "test@example.com");
      formData.set("password", "wrongpassword");

      await expect(signIn(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/login?error=Invalid%20credentials"
      );

      expect(mockRedirect).toHaveBeenCalledWith(
        "/login?error=Invalid%20credentials"
      );
    });
  });

  describe("signUp", () => {
    it("redirects to login with message on successful sign up", async () => {
      mockSignUp.mockResolvedValue({ error: null });

      const formData = new FormData();
      formData.set("email", "test@example.com");
      formData.set("password", "password123");

      await expect(signUp(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/login?message=Check%20your%20email%20to%20confirm%20your%20account."
      );

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
        options: {
          emailRedirectTo: "http://localhost:3000/auth/callback",
        },
      });
    });

    it("redirects to signup with error on failed sign up", async () => {
      mockSignUp.mockResolvedValue({
        error: { message: "Email already exists" },
      });

      const formData = new FormData();
      formData.set("email", "test@example.com");
      formData.set("password", "password123");

      await expect(signUp(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/signup?error=Email%20already%20exists"
      );

      expect(mockRedirect).toHaveBeenCalledWith(
        "/signup?error=Email%20already%20exists"
      );
    });
  });

  describe("signOut", () => {
    it("signs out and redirects to login", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      await expect(signOut()).rejects.toThrow("NEXT_REDIRECT:/login");

      expect(mockSignOut).toHaveBeenCalled();
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
      expect(mockRedirect).toHaveBeenCalledWith("/login");
    });
  });
});
