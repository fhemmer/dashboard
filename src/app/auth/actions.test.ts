/* eslint-disable sonarjs/no-hardcoded-passwords -- Test file contains form field names 'password', not actual credentials */
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock supabase client first (before imports that use it)
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn(() => Promise.resolve({ error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        signInWithPassword: mockSignInWithPassword,
        signUp: mockSignUp,
        signOut: mockSignOut,
      },
      from: vi.fn(() => ({
        update: mockUpdate.mockReturnValue({ eq: mockEq }),
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
      mockSignInWithPassword.mockResolvedValue({
        error: null,
        data: { user: { id: "user-123" } }
      });

      const formData = new FormData();
      formData.set("email", "test@example.com");
      formData.set("password", "testSecret123");

      await expect(signIn(formData)).rejects.toThrow("NEXT_REDIRECT:/");

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "testSecret123",
      });
      expect(mockUpdate).toHaveBeenCalledWith({ last_login: expect.any(String) });
      expect(mockEq).toHaveBeenCalledWith("id", "user-123");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
      expect(mockRedirect).toHaveBeenCalledWith("/");
    });

    it("redirects to login with error on failed sign in", async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: "Invalid credentials" },
        data: { user: null }
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
      formData.set("password", "testSecret123");

      await expect(signUp(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/login?message=Check%20your%20email%20to%20confirm%20your%20account."
      );

      expect(mockSignUp).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "testSecret123",
        options: {
          emailRedirectTo: "http://localhost:3000/auth/callback",
        },
      });
    });

    it("redirects to signup with error on failed sign up", async () => {
      mockSignUp.mockResolvedValue({
        error: { message: "Some unknown error" },
      });

      const formData = new FormData();
      formData.set("email", "test@example.com");
      formData.set("password", "testSecret123");

      await expect(signUp(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/signup?error=Some%20unknown%20error"
      );

      expect(mockRedirect).toHaveBeenCalledWith(
        "/signup?error=Some%20unknown%20error"
      );
    });

    it("shows friendly message for email confirmation errors", async () => {
      mockSignUp.mockResolvedValue({
        error: { message: "Error sending confirmation email" },
      });

      const formData = new FormData();
      formData.set("email", "test@example.com");
      formData.set("password", "testSecret123");

      await expect(signUp(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/signup?error=Unable%20to%20send%20confirmation%20email.%20Please%20try%20again%20later%20or%20contact%20support."
      );
    });

    it("shows friendly message for already registered email", async () => {
      mockSignUp.mockResolvedValue({
        error: { message: "User already registered" },
      });

      const formData = new FormData();
      formData.set("email", "test@example.com");
      formData.set("password", "testSecret123");

      await expect(signUp(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/signup?error=This%20email%20is%20already%20registered.%20Try%20logging%20in%20instead."
      );
    });

    it("shows friendly message for weak password", async () => {
      mockSignUp.mockResolvedValue({
        error: { message: "Password is too weak" },
      });

      const formData = new FormData();
      formData.set("email", "test@example.com");
      formData.set("password", "123");

      await expect(signUp(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/signup?error=Password%20is%20too%20weak.%20Use%20at%20least%206%20characters%20with%20a%20mix%20of%20letters%20and%20numbers."
      );
    });

    it("shows friendly message for invalid email", async () => {
      mockSignUp.mockResolvedValue({
        error: { message: "Invalid email address" },
      });

      const formData = new FormData();
      formData.set("email", "notanemail");
      formData.set("password", "testSecret123");

      await expect(signUp(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/signup?error=Please%20enter%20a%20valid%20email%20address."
      );
    });

    it("shows friendly message for rate limiting", async () => {
      mockSignUp.mockResolvedValue({
        error: { message: "Rate limit exceeded" },
      });

      const formData = new FormData();
      formData.set("email", "test@example.com");
      formData.set("password", "testSecret123");

      await expect(signUp(formData)).rejects.toThrow(
        "NEXT_REDIRECT:/signup?error=Too%20many%20signup%20attempts.%20Please%20wait%20a%20few%20minutes%20and%20try%20again."
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
