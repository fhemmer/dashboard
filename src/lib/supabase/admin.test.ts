import { describe, expect, it, vi } from "vitest";

// Mock createClient from supabase-js
const mockCreateClient = vi.fn(() => ({
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

vi.mock("../env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_PROJECT_URL: "https://test.supabase.co",
  },
  getServerEnv: () => ({
    SUPABASE_SECRET_SERVICE_ROLE_KEY: "test-service-role-key",
  }),
}));

describe("supabaseAdmin", () => {
  it("creates admin client with correct configuration", async () => {
    // Import after mocks are set up
    const { supabaseAdmin } = await import("./admin");

    expect(mockCreateClient).toHaveBeenCalledWith(
      "https://test.supabase.co",
      "test-service-role-key",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
    expect(supabaseAdmin).toBeDefined();
  });
});
