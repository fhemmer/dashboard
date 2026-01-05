import type { ThemeVariables } from "@/lib/theme-utils";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Helper to create valid ThemeVariables mock (28 variables)
const mockThemeVars = (): ThemeVariables => ({
  background: "0 0% 100%",
  foreground: "0 0% 3.9%",
  card: "0 0% 100%",
  "card-foreground": "0 0% 3.9%",
  popover: "0 0% 100%",
  "popover-foreground": "0 0% 3.9%",
  primary: "0 0% 9%",
  "primary-foreground": "0 0% 98%",
  secondary: "0 0% 96.1%",
  "secondary-foreground": "0 0% 9%",
  muted: "0 0% 96.1%",
  "muted-foreground": "0 0% 45.1%",
  accent: "0 0% 96.1%",
  "accent-foreground": "0 0% 9%",
  destructive: "0 84.2% 60.2%",
  border: "0 0% 89.8%",
  input: "0 0% 89.8%",
  ring: "0 0% 3.9%",
  "chart-1": "12 76% 61%",
  "chart-2": "173 58% 39%",
  "chart-3": "197 37% 24%",
  "chart-4": "43 74% 66%",
  "chart-5": "27 87% 67%",
  sidebar: "0 0% 98%",
  "sidebar-foreground": "240 5.3% 26.1%",
  "sidebar-primary": "240 5.9% 10%",
  "sidebar-primary-foreground": "0 0% 98%",
  "sidebar-accent": "240 4.8% 95.9%",
  "sidebar-accent-foreground": "240 5.9% 10%",
  "sidebar-border": "220 13% 91%",
  "sidebar-ring": "217.2 91.2% 59.8%",
});

// Mock dependencies
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

vi.mock("./actions", () => ({
  getUserThemes: vi.fn(),
}));

// Mock redirect to throw
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

// Mock components
vi.mock("@/modules/themes/components/theme-list", () => ({
  ThemeList: ({ themes }: { themes: unknown[] }) => (
    <div data-testid="theme-list">{themes.length} themes</div>
  ),
}));

import { getUserThemes } from "./actions";
import ThemesPage, { metadata } from "./page";

describe("ThemesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has correct metadata", () => {
    expect(metadata.title).toBe("Custom Themes | Dashboard");
    expect(metadata.description).toBe("Create and manage custom themes for your dashboard");
  });

  it("redirects to login when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(ThemesPage()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("renders themes page for authenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    vi.mocked(getUserThemes).mockResolvedValue([
      {
        id: "theme-1",
        user_id: "user-123",
        name: "My Theme",
        light_variables: mockThemeVars(),
        dark_variables: mockThemeVars(),
        is_active: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
    ]);

    const page = await ThemesPage();
    render(page);

    expect(screen.getByText("Custom Themes")).toBeInTheDocument();
    expect(screen.getByText("Create and manage personalized themes for your dashboard")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /new theme/i })).toBeInTheDocument();
    expect(screen.getByTestId("theme-list")).toHaveTextContent("1 themes");
  });

  it("renders empty state when user has no themes", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    vi.mocked(getUserThemes).mockResolvedValue([]);

    const page = await ThemesPage();
    render(page);

    expect(screen.getByTestId("theme-list")).toHaveTextContent("0 themes");
  });
});
