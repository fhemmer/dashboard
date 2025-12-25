import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DecryptedToken, TokenInput } from "../types";
import { deleteToken, getToken, isTokenExpired, storeToken } from "./token-manager";

// Mock crypto module
const mockEncrypt = vi.fn();
const mockDecrypt = vi.fn();

vi.mock("@/lib/crypto", () => ({
  encrypt: (value: string) => mockEncrypt(value),
  decrypt: (encrypted: string, iv: string, authTag: string) => mockDecrypt(encrypted, iv, authTag),
}));

// Mock Supabase
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpdate = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  update: mockUpdate,
  insert: mockInsert,
  delete: mockDelete,
}));

mockSelect.mockReturnValue({ eq: mockEq });
mockEq.mockReturnValue({ single: mockSingle });
mockUpdate.mockReturnValue({ eq: mockEq });
mockInsert.mockReturnValue({ error: null });
mockDelete.mockReturnValue({ eq: mockEq });

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

describe("token-manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockEncrypt.mockImplementation((value: string) => ({
      encrypted: `encrypted_${value}`,
      iv: "test-iv",
      authTag: "test-auth-tag",
    }));

    mockDecrypt.mockImplementation((encrypted: string) =>
      encrypted.replace("encrypted_", "")
    );

    // Reset Supabase mock chain
    mockFrom.mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      insert: mockInsert,
      delete: mockDelete,
    });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mockInsert.mockResolvedValue({ error: null });
    mockDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  });

  describe("storeToken", () => {
    it("should insert new token when none exists", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });
      mockInsert.mockResolvedValue({ error: null });

      const input: TokenInput = {
        accountId: "acc-123",
        accessToken: "access-token-value",
        refreshToken: "refresh-token-value",
        expiresAt: new Date("2025-01-01"),
      };

      const result = await storeToken(input);

      expect(result.success).toBe(true);
      expect(mockEncrypt).toHaveBeenCalledWith("access-token-value");
      expect(mockEncrypt).toHaveBeenCalledWith("refresh-token-value");
      expect(mockFrom).toHaveBeenCalledWith("mail_oauth_tokens");
    });

    it("should update existing token", async () => {
      mockSingle.mockResolvedValue({ data: { id: "existing-id" }, error: null });
      const mockEqForUpdate = vi.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockEqForUpdate });

      const input: TokenInput = {
        accountId: "acc-123",
        accessToken: "new-access-token",
      };

      const result = await storeToken(input);

      expect(result.success).toBe(true);
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockEqForUpdate).toHaveBeenCalledWith("id", "existing-id");
    });

    it("should handle token without refresh token", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });
      mockInsert.mockResolvedValue({ error: null });

      const input: TokenInput = {
        accountId: "acc-123",
        accessToken: "access-token-only",
      };

      const result = await storeToken(input);

      expect(result.success).toBe(true);
      expect(mockEncrypt).toHaveBeenCalledTimes(1);
      expect(mockEncrypt).toHaveBeenCalledWith("access-token-only");
    });

    it("should return error when insert fails", async () => {
      mockSingle.mockResolvedValue({ data: null, error: null });
      mockInsert.mockResolvedValue({ error: { message: "Insert failed" } });

      const result = await storeToken({
        accountId: "acc-123",
        accessToken: "token",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Insert failed");
    });

    it("should return error when update fails", async () => {
      mockSingle.mockResolvedValue({ data: { id: "existing-id" }, error: null });
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "Update failed" } }),
      });

      const result = await storeToken({
        accountId: "acc-123",
        accessToken: "token",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Update failed");
    });

    it("should handle exceptions", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Database connection error");
      });

      const result = await storeToken({
        accountId: "acc-123",
        accessToken: "token",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Error: Database connection error");
    });
  });

  describe("getToken", () => {
    it("should retrieve and decrypt token", async () => {
      const mockData = {
        encrypted_access_token: "encrypted_access-token",
        encrypted_refresh_token: "encrypted_refresh-token",
        token_expires_at: "2025-01-01T00:00:00.000Z",
        iv: "access-iv",
        auth_tag: "access-auth-tag",
        refresh_token_iv: "refresh-iv",
        refresh_token_auth_tag: "refresh-auth-tag",
      };
      mockSingle.mockResolvedValue({ data: mockData, error: null });

      const result = await getToken("acc-123");

      expect(result).not.toBeNull();
      expect(mockDecrypt).toHaveBeenCalledWith(
        "encrypted_access-token",
        "access-iv",
        "access-auth-tag"
      );
      expect(mockDecrypt).toHaveBeenCalledWith(
        "encrypted_refresh-token",
        "refresh-iv",
        "refresh-auth-tag"
      );
    });

    it("should return null when no token exists", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

      const result = await getToken("acc-123");

      expect(result).toBeNull();
    });

    it("should handle token without refresh token", async () => {
      const mockData = {
        encrypted_access_token: "encrypted_access-token",
        encrypted_refresh_token: null,
        token_expires_at: null,
        iv: "access-iv",
        auth_tag: "access-auth-tag",
        refresh_token_iv: null,
        refresh_token_auth_tag: null,
      };
      mockSingle.mockResolvedValue({ data: mockData, error: null });

      const result = await getToken("acc-123");

      expect(result).not.toBeNull();
      expect(result?.refreshToken).toBeNull();
      expect(result?.expiresAt).toBeNull();
      expect(mockDecrypt).toHaveBeenCalledTimes(1);
    });

    it("should handle exceptions", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Database error");
      });

      const result = await getToken("acc-123");

      expect(result).toBeNull();
    });
  });

  describe("deleteToken", () => {
    it("should delete token successfully", async () => {
      const mockEqForDelete = vi.fn().mockResolvedValue({ error: null });
      mockDelete.mockReturnValue({ eq: mockEqForDelete });

      const result = await deleteToken("acc-123");

      expect(result.success).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("mail_oauth_tokens");
      expect(mockEqForDelete).toHaveBeenCalledWith("account_id", "acc-123");
    });

    it("should return error when delete fails", async () => {
      mockDelete.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: "Delete failed" } }),
      });

      const result = await deleteToken("acc-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Delete failed");
    });

    it("should handle exceptions", async () => {
      mockFrom.mockImplementation(() => {
        throw new Error("Database error");
      });

      const result = await deleteToken("acc-123");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Error: Database error");
    });
  });

  describe("isTokenExpired", () => {
    it("should return false when no expiration is set", () => {
      const token: DecryptedToken = {
        accessToken: "token",
        refreshToken: null,
        expiresAt: null,
      };

      expect(isTokenExpired(token)).toBe(false);
    });

    it("should return false when token is not expired", () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const token: DecryptedToken = {
        accessToken: "token",
        refreshToken: null,
        expiresAt: futureDate,
      };

      expect(isTokenExpired(token)).toBe(false);
    });

    it("should return true when token is expired", () => {
      const pastDate = new Date(Date.now() - 60 * 1000); // 1 minute ago
      const token: DecryptedToken = {
        accessToken: "token",
        refreshToken: null,
        expiresAt: pastDate,
      };

      expect(isTokenExpired(token)).toBe(true);
    });

    it("should return true when token expires within 5 minutes", () => {
      const soonDate = new Date(Date.now() + 4 * 60 * 1000); // 4 minutes from now
      const token: DecryptedToken = {
        accessToken: "token",
        refreshToken: null,
        expiresAt: soonDate,
      };

      expect(isTokenExpired(token)).toBe(true);
    });

    it("should return false when token expires in more than 5 minutes", () => {
      const laterDate = new Date(Date.now() + 6 * 60 * 1000); // 6 minutes from now
      const token: DecryptedToken = {
        accessToken: "token",
        refreshToken: null,
        expiresAt: laterDate,
      };

      expect(isTokenExpired(token)).toBe(false);
    });
  });
});
