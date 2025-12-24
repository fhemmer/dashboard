import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    applyTheme,
    getServerSnapshot,
    getSnapshot,
    getStoredTheme,
    getSystemTheme,
    Header,
    subscribe,
} from "./header";
import { SidebarProvider } from "./ui/sidebar";

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

// Wrapper component that provides SidebarProvider context
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true}>
      {children}
    </SidebarProvider>
  );
}

describe("Header", () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mockSignOut.mockResolvedValue({ error: null });

    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.getItem.mockReturnValue(null);

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    document.documentElement.classList.remove("dark");
  });

  it("renders Sign In button when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    render(<Header />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText("Sign In")).toBeDefined();
    });
    expect(screen.getByPlaceholderText("Search...")).toBeDefined();
  });

  it("hides Sign In button when authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "123", email: "test@example.com" } },
    });

    render(<Header />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.queryByText("Sign In")).toBeNull();
    });
    expect(screen.getByTitle("Sign Out")).toBeDefined();
  });

  it("handles sign out when clicking logout button", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "123", email: "test@example.com" } },
    });

    render(<Header />, { wrapper: TestWrapper });

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

    render(<Header />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText("Sign In")).toBeDefined();
    });

    // Simulate auth state change to logged in
    act(() => {
      authStateCallback!("SIGNED_IN", {
        user: { id: "456", email: "new@example.com" },
      });
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

    render(<Header />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByTitle("Sign Out")).toBeDefined();
    });

    // Simulate sign out event
    act(() => {
      authStateCallback!("SIGNED_OUT", null);
    });

    await waitFor(() => {
      expect(screen.getByText("Sign In")).toBeDefined();
    });
  });

  it("renders theme toggle button", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    render(<Header />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByLabelText("Toggle theme")).toBeDefined();
    });
  });

  it("toggles theme from dark to light when clicked", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    localStorageMock.getItem.mockReturnValue("dark");

    render(<Header />, { wrapper: TestWrapper });

    const themeButton = screen.getByLabelText("Toggle theme");
    fireEvent.click(themeButton);

    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "light");
  });

  it("toggles theme from light to dark when clicked", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    localStorageMock.getItem.mockReturnValue("light");

    render(<Header />, { wrapper: TestWrapper });

    const themeButton = screen.getByLabelText("Toggle theme");
    fireEvent.click(themeButton);

    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "dark");
  });

  it("applies theme from useSyncExternalStore", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    localStorageMock.getItem.mockReturnValue("dark");

    render(<Header />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("applies light theme from localStorage", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    localStorageMock.getItem.mockReturnValue("light");

    render(<Header />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  it("defaults to dark theme when no stored preference", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    localStorageMock.getItem.mockReturnValue(null);

    render(<Header />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  it("renders notification bell when passed as prop", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    render(
      <Header notificationBell={<button data-testid="custom-bell">Bell</button>} />,
      { wrapper: TestWrapper }
    );

    expect(screen.getByTestId("custom-bell")).toBeDefined();
  });
});

describe("Theme utility functions", () => {
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });
    localStorageMock.getItem.mockReturnValue(null);

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    document.documentElement.classList.remove("dark");
  });

  describe("getStoredTheme", () => {
    it("returns stored theme from localStorage", () => {
      localStorageMock.getItem.mockReturnValue("light");
      expect(getStoredTheme()).toBe("light");
    });

    it("returns null when no theme stored", () => {
      localStorageMock.getItem.mockReturnValue(null);
      expect(getStoredTheme()).toBeNull();
    });
  });

  describe("getSystemTheme", () => {
    it("returns dark when system prefers dark", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation(() => ({ matches: true })),
      });
      expect(getSystemTheme()).toBe("dark");
    });

    it("returns light when system prefers light", () => {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation(() => ({ matches: false })),
      });
      expect(getSystemTheme()).toBe("light");
    });
  });

  describe("applyTheme", () => {
    it("adds dark class for dark theme", () => {
      document.documentElement.classList.remove("dark");
      applyTheme("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("removes dark class for light theme", () => {
      document.documentElement.classList.add("dark");
      applyTheme("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("getSnapshot", () => {
    it("returns stored theme when available", () => {
      localStorageMock.getItem.mockReturnValue("light");
      expect(getSnapshot()).toBe("light");
    });

    it("falls back to system theme when no stored theme", () => {
      localStorageMock.getItem.mockReturnValue(null);
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation(() => ({ matches: true })),
      });
      expect(getSnapshot()).toBe("dark");
    });
  });

  describe("getServerSnapshot", () => {
    it("always returns dark for SSR", () => {
      expect(getServerSnapshot()).toBe("dark");
    });
  });

  describe("subscribe", () => {
    it("adds and removes event listeners", () => {
      const callback = vi.fn();
      const mockAddEventListener = vi.fn();
      const mockRemoveEventListener = vi.fn();

      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          addEventListener: mockAddEventListener,
          removeEventListener: mockRemoveEventListener,
        })),
      });

      const windowAddEventListener = vi.spyOn(window, "addEventListener");
      const windowRemoveEventListener = vi.spyOn(window, "removeEventListener");

      const unsubscribe = subscribe(callback);

      expect(mockAddEventListener).toHaveBeenCalledWith("change", expect.any(Function));
      expect(windowAddEventListener).toHaveBeenCalledWith("storage", expect.any(Function));

      unsubscribe();

      expect(mockRemoveEventListener).toHaveBeenCalledWith("change", expect.any(Function));
      expect(windowRemoveEventListener).toHaveBeenCalledWith("storage", expect.any(Function));

      windowAddEventListener.mockRestore();
      windowRemoveEventListener.mockRestore();
    });
  });
});
