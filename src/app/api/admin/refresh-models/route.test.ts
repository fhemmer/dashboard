import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({ data, status: init?.status || 200 })),
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/openrouter/models", () => ({
  refreshModelsCache: vi.fn(),
}));

import { refreshModelsCache } from "@/lib/openrouter/models";
import { createClient } from "@/lib/supabase/server";

const mockRefreshModelsCache = vi.mocked(refreshModelsCache);
const mockCreateClient = vi.mocked(createClient);

function createMockSupabaseClient(options: {
  user: { id: string } | null;
  profile?: { role: string } | null;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: options.user } }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: options.profile ?? null }),
        }),
      }),
    }),
  };
}

describe("POST /api/admin/refresh-models", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({ user: null }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    await POST();

    expect(NextResponse.json).toHaveBeenCalledWith({ error: "Unauthorized" }, { status: 401 });
  });

  it("returns 403 when user is not admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: { id: "user-1" },
        profile: { role: "user" },
      }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    await POST();

    expect(NextResponse.json).toHaveBeenCalledWith({ error: "Forbidden" }, { status: 403 });
  });

  it("refreshes cache and returns models count when admin", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: { id: "admin-1" },
        profile: { role: "admin" },
      }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    mockRefreshModelsCache.mockResolvedValue([
      {
        id: "model-1",
        name: "Model 1",
        description: "Test model 1",
        contextLength: 128000,
        inputModalities: ["text"],
        outputModalities: ["text"],
        providerId: "test",
        isFree: false,
        inputPricePerMillion: 1,
        outputPricePerMillion: 2,
        reasoningPricePerMillion: 0,
        supportsTools: true,
      },
      {
        id: "model-2:free",
        name: "Model 2",
        description: "Test model 2",
        contextLength: 128000,
        inputModalities: ["text"],
        outputModalities: ["text"],
        providerId: "test",
        isFree: true,
        inputPricePerMillion: 0,
        outputPricePerMillion: 0,
        reasoningPricePerMillion: 0,
        supportsTools: true,
      },
    ]);

    await POST();

    expect(mockRefreshModelsCache).toHaveBeenCalled();
    expect(NextResponse.json).toHaveBeenCalledWith({
      success: true,
      modelsCount: 2,
      freeModels: [{ id: "model-2:free", isFree: true }],
    });
  });

  it("returns 500 when cache refresh fails", async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: { id: "admin-1" },
        profile: { role: "admin" },
      }) as unknown as Awaited<ReturnType<typeof createClient>>
    );

    mockRefreshModelsCache.mockRejectedValue(new Error("API error"));

    await POST();

    expect(NextResponse.json).toHaveBeenCalledWith({ error: "Failed to refresh cache" }, { status: 500 });
  });
});
