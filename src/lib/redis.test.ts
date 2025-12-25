import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  getRedisClient,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
} from "./redis";

// Mock @upstash/redis with a class-style mock
const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();
const mockScan = vi.fn();

vi.mock("@upstash/redis", () => {
  return {
    Redis: class MockRedis {
      get = mockGet;
      set = mockSet;
      del = mockDel;
      scan = mockScan;
    },
  };
});

describe("redis", () => {
  const originalEnv = {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = "https://test-redis.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = originalEnv.url;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalEnv.token;
  });

  describe("getRedisClient", () => {
    it("should return null when credentials are not configured", () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const client = getRedisClient();
      expect(client).toBeNull();
    });

    it("should return null when URL is missing", () => {
      delete process.env.UPSTASH_REDIS_REST_URL;

      const client = getRedisClient();
      expect(client).toBeNull();
    });

    it("should return null when token is missing", () => {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const client = getRedisClient();
      expect(client).toBeNull();
    });

    it("should return a Redis client when credentials are configured", () => {
      const client = getRedisClient();
      expect(client).not.toBeNull();
    });
  });

  describe("getCache", () => {
    it("should return null when Redis client is unavailable", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;

      const result = await getCache("test-key");
      expect(result).toBeNull();
    });

    it("should return cached value when available", async () => {
      const mockValue = { data: "test" };
      mockGet.mockResolvedValue(mockValue);

      const result = await getCache<typeof mockValue>("test-key");
      expect(result).toEqual(mockValue);
    });

    it("should return null when Redis get throws error", async () => {
      mockGet.mockRejectedValue(new Error("Redis error"));

      const result = await getCache("test-key");
      expect(result).toBeNull();
    });
  });

  describe("setCache", () => {
    it("should return false when Redis client is unavailable", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;

      const result = await setCache("test-key", "test-value");
      expect(result).toBe(false);
    });

    it("should set cache value with default TTL", async () => {
      mockSet.mockResolvedValue(undefined);

      const result = await setCache("test-key", "test-value");

      expect(result).toBe(true);
      expect(mockSet).toHaveBeenCalledWith("test-key", "test-value", { ex: 300 });
    });

    it("should set cache value with custom TTL", async () => {
      mockSet.mockResolvedValue(undefined);

      const result = await setCache("test-key", "test-value", 600);

      expect(result).toBe(true);
      expect(mockSet).toHaveBeenCalledWith("test-key", "test-value", { ex: 600 });
    });

    it("should return false when Redis set throws error", async () => {
      mockSet.mockRejectedValue(new Error("Redis error"));

      const result = await setCache("test-key", "test-value");
      expect(result).toBe(false);
    });
  });

  describe("deleteCache", () => {
    it("should return false when Redis client is unavailable", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;

      const result = await deleteCache("test-key");
      expect(result).toBe(false);
    });

    it("should delete cache key", async () => {
      mockDel.mockResolvedValue(1);

      const result = await deleteCache("test-key");

      expect(result).toBe(true);
      expect(mockDel).toHaveBeenCalledWith("test-key");
    });

    it("should return false when Redis delete throws error", async () => {
      mockDel.mockRejectedValue(new Error("Redis error"));

      const result = await deleteCache("test-key");
      expect(result).toBe(false);
    });
  });

  describe("deleteCachePattern", () => {
    it("should return 0 when Redis client is unavailable", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;

      const result = await deleteCachePattern("test:*");
      expect(result).toBe(0);
    });

    it("should delete multiple keys matching pattern using SCAN", async () => {
      // First call returns keys, second call returns cursor 0 (done)
      mockScan
        .mockResolvedValueOnce(["0", ["test:1", "test:2", "test:3"]])
        .mockResolvedValueOnce(["0", []]);
      mockDel.mockResolvedValue(3);

      const result = await deleteCachePattern("test:*");

      expect(result).toBe(3);
      expect(mockDel).toHaveBeenCalledWith("test:1", "test:2", "test:3");
    });

    it("should return 0 when no keys match pattern", async () => {
      mockScan.mockResolvedValue(["0", []]);

      const result = await deleteCachePattern("test:*");

      expect(result).toBe(0);
      expect(mockDel).not.toHaveBeenCalled();
    });

    it("should return 0 when Redis throws error", async () => {
      mockScan.mockRejectedValue(new Error("Redis error"));

      const result = await deleteCachePattern("test:*");
      expect(result).toBe(0);
    });

    it("should handle multiple SCAN iterations", async () => {
      // First scan returns some keys and non-zero cursor, second scan returns more keys and zero cursor
      mockScan
        .mockResolvedValueOnce(["42", ["test:1", "test:2"]])
        .mockResolvedValueOnce(["0", ["test:3"]]);
      mockDel.mockResolvedValue(2).mockResolvedValue(1);

      const result = await deleteCachePattern("test:*");

      expect(result).toBe(3);
      expect(mockScan).toHaveBeenCalledTimes(2);
      expect(mockDel).toHaveBeenCalledTimes(2);
    });
  });
});
