import { describe, expect, it, vi } from "vitest";

// Mock createClient from supabase-js
const mockFrom = vi.fn().mockReturnThis();
const mockCreateClient = vi.fn(() => ({
  from: mockFrom,
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
  it("creates admin client lazily when from() is called", async () => {
    // Import after mocks are set up
    const { supabaseAdmin } = await import("./admin");

    // Client not created yet (lazy)
    expect(mockCreateClient).not.toHaveBeenCalled();

    // Trigger lazy initialization by calling from()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Testing with non-existent table
    (supabaseAdmin as any).from("test_table");

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
    expect(mockFrom).toHaveBeenCalledWith("test_table");
  });

  it("getSupabaseAdmin returns the same instance", async () => {
    const { getSupabaseAdmin } = await import("./admin");

    const client1 = getSupabaseAdmin();
    const client2 = getSupabaseAdmin();

    expect(client1).toBe(client2);
  });
});
