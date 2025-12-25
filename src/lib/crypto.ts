import crypto from "crypto";

/**
 * AES-256-GCM encryption/decryption utilities for secure token storage
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits

/**
 * Get the encryption key from environment variables
 */
function getEncryptionKey(): Buffer {
  const key = process.env.MAIL_ENCRYPTION_KEY;
  
  if (!key) {
    throw new Error("MAIL_ENCRYPTION_KEY environment variable is not set");
  }

  // Validate that the key is a valid 64-character hexadecimal string (32 bytes)
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("MAIL_ENCRYPTION_KEY must be a valid 64-character hexadecimal string");
  }

  return Buffer.from(key, "hex");
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns an object with encrypted data, IV, and auth tag
 */
export function encrypt(plaintext: string): {
  encrypted: string;
  iv: string;
  authTag: string;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Decrypt a string using AES-256-GCM
 * Requires encrypted data, IV, and auth tag
 */
export function decrypt(
  encrypted: string,
  iv: string,
  authTag: string
): string {
  const key = getEncryptionKey();
  const ivBuffer = Buffer.from(iv, "hex");
  const authTagBuffer = Buffer.from(authTag, "hex");
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

/**
 * Generate a random 32-byte encryption key (for initial setup)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}
