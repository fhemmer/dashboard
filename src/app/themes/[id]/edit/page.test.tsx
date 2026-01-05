import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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

const mockGetThemeById = vi.fn();
vi.mock("@/app/themes/actions", () => ({
  getThemeById: (...args: unknown[]) => mockGetThemeById(...args),
}));

// Mock redirect/notFound
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
  notFound: () => mockNotFound(),
}));

// Mock edit client
vi.mock("./edit-client", () => ({
  EditThemeClient: ({ theme }: { theme: { name: string } }) => (
    <div data-testid="edit-client">{theme.name}</div>
  ),
}));

import EditThemePage, { generateMetadata } from "./page";

describe("EditThemePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateMetadata", () => {
    it("returns theme name in title when theme exists", async () => {
      mockGetThemeById.mockResolvedValue({
        id: "theme-123",
        name: "My Custom Theme",
      });

      const metadata = await generateMetadata({ params: Promise.resolve({ id: "theme-123" }) });

      expect(metadata.title).toBe("Edit My Custom Theme | Dashboard");
    });

    it("returns generic title when theme does not exist", async () => {
      mockGetThemeById.mockResolvedValue(null);

      const metadata = await generateMetadata({ params: Promise.resolve({ id: "theme-123" }) });

      expect(metadata.title).toBe("Edit Theme | Dashboard");
    });
  });

  it("redirects to login when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    await expect(EditThemePage({ params: Promise.resolve({ id: "theme-123" }) })).rejects.toThrow(
      "NEXT_REDIRECT:/login"
    );
  });

  it("returns not found when theme does not exist", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockGetThemeById.mockResolvedValue(null);

    await expect(EditThemePage({ params: Promise.resolve({ id: "theme-123" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND"
    );
  });

  it("renders edit client when theme exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockGetThemeById.mockResolvedValue({
      id: "theme-123",
      name: "My Theme",
      light_variables: {},
      dark_variables: {},
      is_active: false,
    });

    const page = await EditThemePage({ params: Promise.resolve({ id: "theme-123" }) });
    render(page);

    expect(screen.getByTestId("edit-client")).toHaveTextContent("My Theme");
  });
});
