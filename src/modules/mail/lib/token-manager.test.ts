import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecryptedToken } from "../types";
import {
    deleteToken,
    getToken,
    isTokenExpired,
    storeToken,
} from "./token-manager";

// Mock dependencies
const mockEncrypt = vi.fn();
const mockDecrypt = vi.fn();
const mockFrom = vi.fn();
const mockCreateClient = vi.fn();

vi.mock("@/lib/crypto", () => ({
  encrypt: (value: string) => mockEncrypt(value),
  decrypt: (encrypted: string, iv: string, authTag: string) =>
    mockDecrypt(encrypted, iv, authTag),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

function createChainMock(finalResult: { data: unknown; error: unknown }) {
  const mock = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(finalResult),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve(finalResult)),
  };
  return mock;
}

describe("token-manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEncrypt.mockReturnValue({
      encrypted: "encrypted-value",
      iv: "test-iv",
      authTag: "test-auth-tag",
    });
    mockDecrypt.mockReturnValue("decrypted-value");
  });

  describe("storeToken", () => {
    it("should insert new token when no existing token", async () => {
      const chainMock = createChainMock({ data: null, error: null });
      const insertChainMock = createChainMock({ data: {}, error: null });

      mockFrom
        .mockReturnValueOnce(chainMock) // First call for select/single
        .mockReturnValueOnce(insertChainMock); // Second call for insert

      mockCreateClient.mockResolvedValue({ from: mockFrom });

      const result = await storeToken({
        accountId: "acc-1",
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: new Date("2025-01-01"),
      });

      expect(result.success).toBe(true);
      expect(mockEncrypt).toHaveBeenCalledWith("access-token");
      expect(mockEncrypt).toHaveBeenCalledWith("refresh-token");
    });

    it("should update existing token when one exists", async () => {
      const selectChainMock = createChainMock({
        data: { id: "token-123" },
        error: null,
      });
      const updateChainMock = createChainMock({ data: {}, error: null });

      mockFrom
        .mockReturnValueOnce(selectChainMock)
        .mockReturnValueOnce(updateChainMock);

      mockCreateClient.mockResolvedValue({ from: mockFrom });

      const result = await storeToken({
        accountId: "acc-1",
        accessToken: "new-access-token",
      });

      expect(result.success).toBe(true);
    });

    it("should handle insert error", async () => {
      const selectChainMock = createChainMock({ data: null, error: null });
      const insertChainMock = createChainMock({
        data: null,
        error: { message: "Insert failed" },
      });

      mockFrom
        .mockReturnValueOnce(selectChainMock)
        .mockReturnValueOnce(insertChainMock);

      mockCreateClient.mockResolvedValue({ from: mockFrom });

      const result = await storeToken({
        accountId: "acc-1",
        accessToken: "token",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Insert failed");
    });

    it("should handle update error", async () => {
      const selectChainMock = createChainMock({
        data: { id: "token-123" },
        error: null,
      });
      const updateChainMock = createChainMock({
        data: null,
        error: { message: "Update failed" },
      });

      mockFrom
        .mockReturnValueOnce(selectChainMock)
        .mockReturnValueOnce(updateChainMock);

      mockCreateClient.mockResolvedValue({ from: mockFrom });

      const result = await storeToken({
        accountId: "acc-1",
        accessToken: "token",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });

    it("should handle exception during token storage", async () => {
      mockCreateClient.mockRejectedValue(new Error("Connection error"));

      const result = await storeToken({
        accountId: "acc-1",
        accessToken: "token",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Connection error");
    });

    it("should handle token without refresh token", async () => {
      const selectChainMock = createChainMock({ data: null, error: null });
      const insertChainMock = createChainMock({ data: {}, error: null });

      mockFrom
        .mockReturnValueOnce(selectChainMock)
        .mockReturnValueOnce(insertChainMock);

      mockCreateClient.mockResolvedValue({ from: mockFrom });

      const result = await storeToken({
        accountId: "acc-1",
        accessToken: "access-only",
      });

      expect(result.success).toBe(true);
      expect(mockEncrypt).toHaveBeenCalledTimes(1); // Only access token
    });
  });

  describe("getToken", () => {
    it("should retrieve and decrypt token", async () => {
      const mockTokenData = {
        encrypted_access_token: "encrypted-access",
        iv: "access-iv",
        auth_tag: "access-auth",
        encrypted_refresh_token: "encrypted-refresh",
        refresh_token_iv: "refresh-iv",
        refresh_token_auth_tag: "refresh-auth",
        token_expires_at: "2025-01-01T00:00:00Z",
      };

      const chainMock = createChainMock({ data: mockTokenData, error: null });
      mockFrom.mockReturnValue(chainMock);
      mockCreateClient.mockResolvedValue({ from: mockFrom });
      mockDecrypt.mockReturnValueOnce("access-token").mockReturnValueOnce("refresh-token");

      const result = await getToken("acc-1");

      expect(result).not.toBeNull();
      expect(result?.accessToken).toBe("access-token");
      expect(result?.refreshToken).toBe("refresh-token");
      expect(result?.expiresAt).toEqual(new Date("2025-01-01T00:00:00Z"));
    });

    it("should return null when token not found", async () => {
      const chainMock = createChainMock({
        data: null,
        error: { message: "Not found" },
      });
      mockFrom.mockReturnValue(chainMock);
      mockCreateClient.mockResolvedValue({ from: mockFrom });

      const result = await getToken("nonexistent");

      expect(result).toBeNull();
    });

    it("should handle token without refresh token", async () => {
      const mockTokenData = {
        encrypted_access_token: "encrypted-access",
        iv: "access-iv",
        auth_tag: "access-auth",
        encrypted_refresh_token: null,
        refresh_token_iv: null,
        refresh_token_auth_tag: null,
        token_expires_at: null,
      };

      const chainMock = createChainMock({ data: mockTokenData, error: null });
      mockFrom.mockReturnValue(chainMock);
      mockCreateClient.mockResolvedValue({ from: mockFrom });

      const result = await getToken("acc-1");

      expect(result?.refreshToken).toBeNull();
      expect(result?.expiresAt).toBeNull();
    });

    it("should handle exception during token retrieval", async () => {
      mockCreateClient.mockRejectedValue(new Error("DB error"));

      const result = await getToken("acc-1");

      expect(result).toBeNull();
    });
  });

  describe("deleteToken", () => {
    it("should delete token successfully", async () => {
      const chainMock = createChainMock({ data: {}, error: null });
      mockFrom.mockReturnValue(chainMock);
      mockCreateClient.mockResolvedValue({ from: mockFrom });

      const result = await deleteToken("acc-1");

      expect(result.success).toBe(true);
    });

    it("should handle delete error", async () => {
      const chainMock = createChainMock({
        data: null,
        error: { message: "Delete failed" },
      });
      mockFrom.mockReturnValue(chainMock);
      mockCreateClient.mockResolvedValue({ from: mockFrom });

      const result = await deleteToken("acc-1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete failed");
    });

    it("should handle exception during deletion", async () => {
      mockCreateClient.mockRejectedValue(new Error("Connection lost"));

      const result = await deleteToken("acc-1");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Connection lost");
    });
  });

  describe("isTokenExpired", () => {
    it("should return false when token has no expiration", () => {
      const token: DecryptedToken = {
        accessToken: "token",
        refreshToken: null,
        expiresAt: null,
      };

      expect(isTokenExpired(token)).toBe(false);
    });

    it("should return false when token is not yet expired", () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1); // 1 hour from now

      const token: DecryptedToken = {
        accessToken: "token",
        refreshToken: null,
        expiresAt: futureDate,
      };

      expect(isTokenExpired(token)).toBe(false);
    });

    it("should return true when token is expired", () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1); // 1 hour ago

      const token: DecryptedToken = {
        accessToken: "token",
        refreshToken: null,
        expiresAt: pastDate,
      };

      expect(isTokenExpired(token)).toBe(true);
    });

    it("should return true when token expires within 5 minute buffer", () => {
      const nearFuture = new Date();
      nearFuture.setMinutes(nearFuture.getMinutes() + 3); // 3 minutes from now

      const token: DecryptedToken = {
        accessToken: "token",
        refreshToken: null,
        expiresAt: nearFuture,
      };

      expect(isTokenExpired(token)).toBe(true);
    });

    it("should return false when token expires more than 5 minutes from now", () => {
      const nearFuture = new Date();
      nearFuture.setMinutes(nearFuture.getMinutes() + 10); // 10 minutes from now

      const token: DecryptedToken = {
        accessToken: "token",
        refreshToken: null,
        expiresAt: nearFuture,
      };

      expect(isTokenExpired(token)).toBe(false);
    });
  });
});
