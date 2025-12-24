import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";
import * as envModule from "@/lib/env";
import * as adminModule from "@/lib/supabase/admin";
import * as fetcherModule from "@/lib/news-fetcher";

// Mock modules
vi.mock("@/lib/env", () => ({
  getServerEnv: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("@/lib/news-fetcher", () => ({
  fetchNews: vi.fn(),
}));

describe("fetch-news route", () => {
  const mockGetServerEnv = vi.mocked(envModule.getServerEnv);
  const mockGetSupabaseAdmin = vi.mocked(adminModule.getSupabaseAdmin);
  const mockFetchNews = vi.mocked(fetcherModule.fetchNews);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should return health check status", async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ status: "ok", endpoint: "fetch-news" });
    });
  });

  describe("POST", () => {
    it("should return 500 when CRON_SECRET is not configured", async () => {
      mockGetServerEnv.mockReturnValue({
        SUPABASE_SECRET_SERVICE_ROLE_KEY: "test-key",
        CRON_SECRET: undefined,
      });

      const request = new Request("http://localhost/api/cron/fetch-news", {
        method: "POST",
        headers: {
          authorization: "Bearer some-token",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("CRON_SECRET not configured");
    });

    it("should return 401 when authorization header is missing", async () => {
      mockGetServerEnv.mockReturnValue({
        SUPABASE_SECRET_SERVICE_ROLE_KEY: "test-key",
        CRON_SECRET: "valid-secret",
      });

      const request = new Request("http://localhost/api/cron/fetch-news", {
        method: "POST",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 when authorization header is invalid", async () => {
      mockGetServerEnv.mockReturnValue({
        SUPABASE_SECRET_SERVICE_ROLE_KEY: "test-key",
        CRON_SECRET: "valid-secret",
      });

      const request = new Request("http://localhost/api/cron/fetch-news", {
        method: "POST",
        headers: {
          authorization: "Bearer wrong-secret",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should run fetcher and return success result", async () => {
      mockGetServerEnv.mockReturnValue({
        SUPABASE_SECRET_SERVICE_ROLE_KEY: "test-key",
        CRON_SECRET: "valid-secret",
      });

      const mockSupabase = {} as ReturnType<typeof adminModule.getSupabaseAdmin>;
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      mockFetchNews.mockResolvedValue({
        success: true,
        sourcesProcessed: 5,
        totalNewItems: 10,
        notificationsCreated: 20,
        notificationsDeleted: 5,
        errors: [],
        durationMs: 1500,
      });

      const request = new Request("http://localhost/api/cron/fetch-news", {
        method: "POST",
        headers: {
          authorization: "Bearer valid-secret",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        sourcesProcessed: 5,
        totalNewItems: 10,
        notificationsCreated: 20,
        notificationsDeleted: 5,
        errors: [],
        durationMs: 1500,
      });

      expect(mockFetchNews).toHaveBeenCalledWith(mockSupabase);
    });

    it("should return 500 when fetcher fails", async () => {
      mockGetServerEnv.mockReturnValue({
        SUPABASE_SECRET_SERVICE_ROLE_KEY: "test-key",
        CRON_SECRET: "valid-secret",
      });

      const mockSupabase = {} as ReturnType<typeof adminModule.getSupabaseAdmin>;
      mockGetSupabaseAdmin.mockReturnValue(mockSupabase);

      mockFetchNews.mockResolvedValue({
        success: false,
        sourcesProcessed: 3,
        totalNewItems: 5,
        notificationsCreated: 0,
        notificationsDeleted: 0,
        errors: ["Feed 1: HTTP 500", "Feed 2: Parse error"],
        durationMs: 2000,
      });

      const request = new Request("http://localhost/api/cron/fetch-news", {
        method: "POST",
        headers: {
          authorization: "Bearer valid-secret",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.errors).toHaveLength(2);
    });

    it("should handle unexpected errors", async () => {
      mockGetServerEnv.mockReturnValue({
        SUPABASE_SECRET_SERVICE_ROLE_KEY: "test-key",
        CRON_SECRET: "valid-secret",
      });

      mockGetSupabaseAdmin.mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      const request = new Request("http://localhost/api/cron/fetch-news", {
        method: "POST",
        headers: {
          authorization: "Bearer valid-secret",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database connection failed");
    });

    it("should handle non-Error thrown values", async () => {
      mockGetServerEnv.mockReturnValue({
        SUPABASE_SECRET_SERVICE_ROLE_KEY: "test-key",
        CRON_SECRET: "valid-secret",
      });

      mockGetSupabaseAdmin.mockImplementation(() => {
        throw "String error";
      });

      const request = new Request("http://localhost/api/cron/fetch-news", {
        method: "POST",
        headers: {
          authorization: "Bearer valid-secret",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Unknown error");
    });
  });
});
