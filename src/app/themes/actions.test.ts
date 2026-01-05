import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ThemeVariables } from "@/lib/theme-utils";

// Mock dependencies using vi.hoisted
const {
  mockGetUser,
  _mockSelect,
  _mockInsert,
  _mockUpdate,
  _mockDelete,
  mockEq,
  _mockNeq,
  mockSingle,
  mockMaybeSingle,
  mockOrder,
  mockFrom,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  _mockSelect: vi.fn(),
  _mockInsert: vi.fn(),
  _mockUpdate: vi.fn(),
  _mockDelete: vi.fn(),
  mockEq: vi.fn(),
  _mockNeq: vi.fn(),
  mockSingle: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockOrder: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    })
  ),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
    createTheme,
    deleteTheme,
    getActiveCustomTheme,
    getThemeById,
    getUserThemes,
    setActiveTheme,
    updateTheme,
} from "./actions";

// Helper to create mock ThemeVariables
function mockThemeVars(): ThemeVariables {
  return {
    background: "oklch(1 0 0)",
    foreground: "oklch(0 0 0)",
    primary: "oklch(0.5 0.2 250)",
    "primary-foreground": "oklch(1 0 0)",
    secondary: "oklch(0.9 0 0)",
    "secondary-foreground": "oklch(0 0 0)",
    accent: "oklch(0.9 0 0)",
    "accent-foreground": "oklch(0 0 0)",
    muted: "oklch(0.9 0 0)",
    "muted-foreground": "oklch(0.4 0 0)",
    destructive: "oklch(0.5 0.3 30)",
    border: "oklch(0.9 0 0)",
    input: "oklch(0.9 0 0)",
    ring: "oklch(0.5 0.2 250)",
    card: "oklch(1 0 0)",
    "card-foreground": "oklch(0 0 0)",
    popover: "oklch(1 0 0)",
    "popover-foreground": "oklch(0 0 0)",
    sidebar: "oklch(0.95 0 0)",
    "sidebar-foreground": "oklch(0 0 0)",
    "sidebar-primary": "oklch(0.5 0.2 250)",
    "sidebar-primary-foreground": "oklch(1 0 0)",
    "sidebar-accent": "oklch(0.9 0 0)",
    "sidebar-accent-foreground": "oklch(0 0 0)",
    "sidebar-border": "oklch(0.9 0 0)",
    "sidebar-ring": "oklch(0.5 0.2 250)",
    "chart-1": "oklch(0.5 0.2 200)",
    "chart-2": "oklch(0.5 0.2 100)",
    "chart-3": "oklch(0.5 0.2 300)",
    "chart-4": "oklch(0.5 0.2 50)",
    "chart-5": "oklch(0.5 0.2 150)",
  };
}

describe("themes actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default chain - the complex chain pattern is hard to mock, so we setup nested returns
    const createChain = () => {
      const chain: Record<string, unknown> = {};
      chain.select = vi.fn().mockReturnValue(chain);
      chain.insert = vi.fn().mockReturnValue(chain);
      chain.update = vi.fn().mockReturnValue(chain);
      chain.delete = vi.fn().mockReturnValue(chain);
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.neq = vi.fn().mockReturnValue(chain);
      chain.single = mockSingle;
      chain.maybeSingle = mockMaybeSingle;
      chain.order = mockOrder;
      return chain;
    };

    mockFrom.mockImplementation(() => createChain());
    mockOrder.mockReturnValue({ data: [], error: null });
    mockSingle.mockReturnValue({ data: null, error: null });
    mockMaybeSingle.mockReturnValue({ data: null, error: null });
  });

  describe("getUserThemes", () => {
    it("returns empty array when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getUserThemes();

      expect(result).toEqual([]);
    });

    it("returns empty array on database error", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockOrder.mockReturnValue({ data: null, error: { message: "DB error" } });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await getUserThemes();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith("Error fetching user themes:", expect.any(Object));
      consoleSpy.mockRestore();
    });

    it("returns themes for authenticated user", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockOrder.mockReturnValue({
        data: [
          {
            id: "theme-1",
            user_id: "user-123",
            name: "Test Theme",
            light_variables: { primary: "#000" },
            dark_variables: { primary: "#fff" },
            is_active: true,
            created_at: "2024-01-01",
            updated_at: "2024-01-01",
          },
        ],
        error: null,
      });

      const result = await getUserThemes();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Test Theme");
    });
  });

  describe("getThemeById", () => {
    it("returns null when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getThemeById("theme-123");

      expect(result).toBeNull();
    });

    it("returns null when theme not found", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockSingle.mockReturnValue({ data: null, error: { message: "Not found" } });

      const result = await getThemeById("theme-123");

      expect(result).toBeNull();
    });

    it("returns theme when found", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockSingle.mockReturnValue({
        data: {
          id: "theme-123",
          user_id: "user-123",
          name: "Test Theme",
          light_variables: {},
          dark_variables: {},
          is_active: false,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        error: null,
      });

      const result = await getThemeById("theme-123");

      expect(result?.id).toBe("theme-123");
    });
  });

  describe("getActiveCustomTheme", () => {
    it("returns null when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await getActiveCustomTheme();

      expect(result).toBeNull();
    });

    it("returns null on database error", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockMaybeSingle.mockReturnValue({ data: null, error: { message: "DB error" } });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await getActiveCustomTheme();

      expect(result).toBeNull();
      consoleSpy.mockRestore();
    });

    it("returns null when no active theme", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockMaybeSingle.mockReturnValue({ data: null, error: null });

      const result = await getActiveCustomTheme();

      expect(result).toBeNull();
    });

    it("returns active theme when found", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockMaybeSingle.mockReturnValue({
        data: {
          id: "theme-123",
          user_id: "user-123",
          name: "Active Theme",
          light_variables: {},
          dark_variables: {},
          is_active: true,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        error: null,
      });

      const result = await getActiveCustomTheme();

      expect(result?.name).toBe("Active Theme");
    });
  });

  describe("createTheme", () => {
    it("returns error when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await createTheme("Test", mockThemeVars(), mockThemeVars());

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("returns error when checking for duplicate fails", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockMaybeSingle.mockReturnValue({ data: null, error: { message: "DB error" } });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await createTheme("Test", mockThemeVars(), mockThemeVars());

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to check for existing theme");
      consoleSpy.mockRestore();
    });

    it("returns error when theme name already exists", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockMaybeSingle.mockReturnValue({ data: { id: "existing-theme" }, error: null });

      const result = await createTheme("Test", mockThemeVars(), mockThemeVars());

      expect(result.success).toBe(false);
      expect(result.error).toBe("A theme with this name already exists");
    });

    it("returns error when insert fails", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockMaybeSingle.mockReturnValue({ data: null, error: null });
      mockSingle.mockReturnValue({ data: null, error: { message: "Insert failed" } });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await createTheme("Test", mockThemeVars(), mockThemeVars());

      expect(result.success).toBe(false);
      expect(result.error).toBe("Insert failed");
      consoleSpy.mockRestore();
    });

    it("creates theme successfully", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockMaybeSingle.mockReturnValue({ data: null, error: null });
      mockSingle.mockReturnValue({
        data: {
          id: "new-theme",
          user_id: "user-123",
          name: "Test",
          light_variables: {},
          dark_variables: {},
          is_active: false,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        error: null,
      });

      const result = await createTheme("Test", mockThemeVars(), mockThemeVars());

      expect(result.success).toBe(true);
      expect(result.theme?.id).toBe("new-theme");
    });
  });

  describe("updateTheme", () => {
    it("returns error when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await updateTheme("theme-123", "New Name", mockThemeVars(), mockThemeVars());

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("returns error when checking for duplicate name fails", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockMaybeSingle.mockReturnValue({ data: null, error: { message: "DB error" } });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await updateTheme("theme-123", "New Name", mockThemeVars(), mockThemeVars());

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to check for duplicate theme name");
      consoleSpy.mockRestore();
    });

    it("returns error when duplicate name exists", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockMaybeSingle.mockReturnValue({ data: { id: "other-theme" }, error: null });

      const result = await updateTheme("theme-123", "Duplicate Name", mockThemeVars(), mockThemeVars());

      expect(result.success).toBe(false);
      expect(result.error).toBe("A theme with this name already exists");
    });

    it("returns error when update fails", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockMaybeSingle.mockReturnValue({ data: null, error: null });
      mockSingle.mockReturnValue({ data: null, error: { message: "Update failed" } });

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await updateTheme("theme-123", "New Name", mockThemeVars(), mockThemeVars());

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
      consoleSpy.mockRestore();
    });

    it("updates theme without name change", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockSingle.mockReturnValue({
        data: {
          id: "theme-123",
          user_id: "user-123",
          name: "Unchanged",
          light_variables: mockThemeVars(),
          dark_variables: mockThemeVars(),
          is_active: false,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        error: null,
      });

      const result = await updateTheme("theme-123", undefined, mockThemeVars(), mockThemeVars());

      expect(result.success).toBe(true);
    });

    it("updates theme with name change", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockMaybeSingle.mockReturnValue({ data: null, error: null });
      mockSingle.mockReturnValue({
        data: {
          id: "theme-123",
          user_id: "user-123",
          name: "New Name",
          light_variables: mockThemeVars(),
          dark_variables: mockThemeVars(),
          is_active: false,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        error: null,
      });

      const result = await updateTheme("theme-123", "New Name", mockThemeVars(), mockThemeVars());

      expect(result.success).toBe(true);
      expect(result.theme?.name).toBe("New Name");
    });
  });

  describe("deleteTheme", () => {
    it("returns error when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await deleteTheme("theme-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("returns error when delete fails", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      
      // Setup chain to return error on delete
      const deleteChain: Record<string, unknown> = {};
      deleteChain.eq = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: { message: "Delete failed" } }) });
      mockFrom.mockImplementation((table: string) => {
        if (table === "user_themes") {
          return { delete: vi.fn().mockReturnValue(deleteChain) };
        }
        return {};
      });
      
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await deleteTheme("theme-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete failed");
      consoleSpy.mockRestore();
    });

    it("deletes theme successfully", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockEq.mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) });

      const result = await deleteTheme("theme-123");

      expect(result.success).toBe(true);
    });
  });

  describe("setActiveTheme", () => {
    it("returns error when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      const result = await setActiveTheme("theme-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Not authenticated");
    });

    it("deactivates all themes when id is null", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockEq.mockReturnValue({ error: null });

      const result = await setActiveTheme(null);

      expect(result.success).toBe(true);
    });

    it("returns error when deactivating themes fails", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      
      // Setup chain to return error on update (deactivation)
      const updateChain: Record<string, unknown> = {};
      updateChain.eq = vi.fn().mockReturnValue({ error: { message: "Deactivate failed" } });
      mockFrom.mockImplementation((table: string) => {
        if (table === "user_themes") {
          return { update: vi.fn().mockReturnValue(updateChain) };
        }
        return {};
      });
      
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await setActiveTheme(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Deactivate failed");
      consoleSpy.mockRestore();
    });

    it("returns error when activating theme fails", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      
      // Setup chain to return error on update with select (activation)
      const updateChain: Record<string, unknown> = {};
      updateChain.eq = vi.fn().mockReturnValue(updateChain);
      updateChain.select = vi.fn().mockReturnValue({ single: vi.fn().mockReturnValue({ data: null, error: { message: "Activate failed" } }) });
      mockFrom.mockImplementation((table: string) => {
        if (table === "user_themes") {
          return { update: vi.fn().mockReturnValue(updateChain) };
        }
        return {};
      });
      
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const result = await setActiveTheme("theme-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Activate failed");
      consoleSpy.mockRestore();
    });

    it("activates theme successfully", async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
      mockSingle.mockReturnValue({
        data: {
          id: "theme-123",
          user_id: "user-123",
          name: "Active Theme",
          light_variables: {},
          dark_variables: {},
          is_active: true,
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
        error: null,
      });

      const result = await setActiveTheme("theme-123");

      expect(result.success).toBe(true);
      expect(result.theme?.is_active).toBe(true);
    });
  });
});
