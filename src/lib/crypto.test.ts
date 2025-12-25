import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { decrypt, encrypt, generateEncryptionKey } from "./crypto";

describe("crypto", () => {
  const originalEnv = process.env.MAIL_ENCRYPTION_KEY;

  beforeEach(() => {
    // Set a valid 64-character hex key for testing
    process.env.MAIL_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterEach(() => {
    process.env.MAIL_ENCRYPTION_KEY = originalEnv;
  });

  describe("encrypt", () => {
    it("should encrypt a plaintext string", () => {
      const plaintext = "my secret token";
      const result = encrypt(plaintext);

      expect(result).toHaveProperty("encrypted");
      expect(result).toHaveProperty("iv");
      expect(result).toHaveProperty("authTag");
      expect(result.encrypted).toBeTruthy();
      expect(result.iv).toBeTruthy();
      expect(result.authTag).toBeTruthy();
    });

    it("should produce different ciphertexts for the same plaintext", () => {
      const plaintext = "my secret token";
      const result1 = encrypt(plaintext);
      const result2 = encrypt(plaintext);

      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
    });

    it("should throw error when MAIL_ENCRYPTION_KEY is not set", () => {
      delete process.env.MAIL_ENCRYPTION_KEY;

      expect(() => encrypt("test")).toThrow("MAIL_ENCRYPTION_KEY environment variable is not set");
    });

    it("should throw error when MAIL_ENCRYPTION_KEY is invalid length", () => {
      process.env.MAIL_ENCRYPTION_KEY = "tooshort";

      expect(() => encrypt("test")).toThrow("MAIL_ENCRYPTION_KEY must be a valid 64-character hexadecimal string");
    });
  });

  describe("decrypt", () => {
    it("should decrypt an encrypted string", () => {
      const plaintext = "my secret token";
      const { encrypted, iv, authTag } = encrypt(plaintext);
      const decrypted = decrypt(encrypted, iv, authTag);

      expect(decrypted).toBe(plaintext);
    });

    it("should decrypt various types of content", () => {
      const testCases = [
        "simple text",
        "email@example.com",
        JSON.stringify({ key: "value", nested: { data: 123 } }),
        "special chars: !@#$%^&*()",
        "",
      ];

      for (const testCase of testCases) {
        const { encrypted, iv, authTag } = encrypt(testCase);
        const decrypted = decrypt(encrypted, iv, authTag);
        expect(decrypted).toBe(testCase);
      }
    });

    it("should throw error when decrypting with wrong auth tag", () => {
      const plaintext = "my secret token";
      const { encrypted, iv } = encrypt(plaintext);
      const wrongAuthTag = "0".repeat(32); // Invalid auth tag

      expect(() => decrypt(encrypted, iv, wrongAuthTag)).toThrow();
    });

    it("should throw error when decrypting with wrong IV", () => {
      const plaintext = "my secret token";
      const { encrypted, authTag } = encrypt(plaintext);
      const wrongIv = "0".repeat(32); // Wrong IV

      expect(() => decrypt(encrypted, wrongIv, authTag)).toThrow();
    });

    it("should throw error when MAIL_ENCRYPTION_KEY is not set", () => {
      const { encrypted, iv, authTag } = encrypt("test");
      delete process.env.MAIL_ENCRYPTION_KEY;

      expect(() => decrypt(encrypted, iv, authTag)).toThrow("MAIL_ENCRYPTION_KEY environment variable is not set");
    });
  });

  describe("generateEncryptionKey", () => {
    it("should generate a 64-character hex string", () => {
      const key = generateEncryptionKey();

      expect(key).toHaveLength(64);
      expect(key).toMatch(/^[0-9a-f]{64}$/);
    });

    it("should generate different keys each time", () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });

    it("generated key should work for encryption/decryption", () => {
      const newKey = generateEncryptionKey();
      process.env.MAIL_ENCRYPTION_KEY = newKey;

      const plaintext = "test with generated key";
      const { encrypted, iv, authTag } = encrypt(plaintext);
      const decrypted = decrypt(encrypted, iv, authTag);

      expect(decrypted).toBe(plaintext);
    });
  });
});
