import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Header } from "./header";

const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockSignOut = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
  }),
}));

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSignOut.mockResolvedValue({ error: null });
  });

  it("renders Sign In button when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText("Sign In")).toBeDefined();
    });
    expect(screen.getByPlaceholderText("Search...")).toBeDefined();
  });

  it("hides Sign In button when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "123", email: "test@example.com" } },
    });

    render(<Header />);

    await waitFor(() => {
      expect(screen.queryByText("Sign In")).toBeNull();
    });
    expect(screen.getByTitle("Sign Out")).toBeDefined();
  });

  it("handles sign out when clicking logout button", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "123", email: "test@example.com" } },
    });

    render(<Header />);

    await waitFor(() => {
      expect(screen.getByTitle("Sign Out")).toBeDefined();
    });

    const signOutButton = screen.getByTitle("Sign Out");
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it("updates user state when auth state changes", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    let authStateCallback: (event: string, session: unknown) => void;
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    render(<Header />);

    await waitFor(() => {
      expect(screen.getByText("Sign In")).toBeDefined();
    });

    // Simulate auth state change to logged in
    authStateCallback!("SIGNED_IN", {
      user: { id: "456", email: "new@example.com" },
    });

    await waitFor(() => {
      expect(screen.queryByText("Sign In")).toBeNull();
    });
  });

  it("handles auth state change with no session", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "123", email: "test@example.com" } },
    });

    let authStateCallback: (event: string, session: unknown) => void;
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return {
        data: { subscription: { unsubscribe: vi.fn() } },
      };
    });

    render(<Header />);

    await waitFor(() => {
      expect(screen.getByTitle("Sign Out")).toBeDefined();
    });

    // Simulate sign out event
    authStateCallback!("SIGNED_OUT", null);

    await waitFor(() => {
      expect(screen.getByText("Sign In")).toBeDefined();
    });
  });
});
