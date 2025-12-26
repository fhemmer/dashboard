/**
 * Token Manager
 * Handles encrypted storage and retrieval of OAuth tokens and IMAP credentials
 */

import { decrypt, encrypt } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/server";
import type { DecryptedToken, TokenInput } from "../types";

/**
 * Store encrypted tokens for a mail account
 * Each token (access and refresh) gets its own unique IV and auth_tag for AES-256-GCM security
 */
export async function storeToken(input: TokenInput): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Encrypt access token
    const accessTokenEncrypted = encrypt(input.accessToken);

    // Encrypt refresh token if provided (with its own IV and auth_tag)
    let refreshTokenEncrypted: { encrypted: string; iv: string; authTag: string } | null = null;
    if (input.refreshToken) {
      refreshTokenEncrypted = encrypt(input.refreshToken);
    }

    // Check if token already exists for this account
    const { data: existing } = await supabase
      .from("mail_oauth_tokens")
      .select("id")
      .eq("account_id", input.accountId)
      .single();

    if (existing) {
      // Update existing token
      const { error } = await supabase
        .from("mail_oauth_tokens")
        .update({
          encrypted_access_token: accessTokenEncrypted.encrypted,
          encrypted_refresh_token: refreshTokenEncrypted?.encrypted ?? null,
          token_expires_at: input.expiresAt?.toISOString() ?? null,
          iv: accessTokenEncrypted.iv,
          auth_tag: accessTokenEncrypted.authTag,
          refresh_token_iv: refreshTokenEncrypted?.iv ?? null,
          refresh_token_auth_tag: refreshTokenEncrypted?.authTag ?? null,
        })
        .eq("id", existing.id);

      if (error) {
        console.error("Error updating token:", error);
        return { success: false, error: error.message };
      }
    } else {
      // Insert new token
      const { error } = await supabase
        .from("mail_oauth_tokens")
        .insert({
          account_id: input.accountId,
          encrypted_access_token: accessTokenEncrypted.encrypted,
          encrypted_refresh_token: refreshTokenEncrypted?.encrypted ?? null,
          token_expires_at: input.expiresAt?.toISOString() ?? null,
          iv: accessTokenEncrypted.iv,
          auth_tag: accessTokenEncrypted.authTag,
          refresh_token_iv: refreshTokenEncrypted?.iv ?? null,
          refresh_token_auth_tag: refreshTokenEncrypted?.authTag ?? null,
        });

      if (error) {
        console.error("Error inserting token:", error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error storing token:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Retrieve and decrypt tokens for a mail account
 */
export async function getToken(accountId: string): Promise<DecryptedToken | null> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("mail_oauth_tokens")
      .select("*")
      .eq("account_id", accountId)
      .single();

    if (error || !data) {
      // PGRST116 = "no rows returned" - expected when token doesn't exist yet
      // Only log actual errors, not expected "no token" cases
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching token:", error);
      }
      return null;
    }

    // Decrypt access token
    const accessToken = decrypt(
      data.encrypted_access_token,
      data.iv,
      data.auth_tag
    );

    // Decrypt refresh token if present (using its own IV and auth_tag)
    let refreshToken: string | null = null;
    if (data.encrypted_refresh_token && data.refresh_token_iv && data.refresh_token_auth_tag) {
      refreshToken = decrypt(
        data.encrypted_refresh_token,
        data.refresh_token_iv,
        data.refresh_token_auth_tag
      );
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: data.token_expires_at ? new Date(data.token_expires_at) : null,
    };
  } catch (error) {
    console.error("Error retrieving token:", error);
    return null;
  }
}

/**
 * Delete tokens for a mail account
 */
export async function deleteToken(accountId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("mail_oauth_tokens")
      .delete()
      .eq("account_id", accountId);

    if (error) {
      console.error("Error deleting token:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting token:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(token: DecryptedToken): boolean {
  if (!token.expiresAt) {
    return false; // No expiration set (e.g., IMAP credentials)
  }

  // Consider token expired if it expires in less than 5 minutes
  const now = new Date();
  const expiryBuffer = new Date(token.expiresAt.getTime() - 5 * 60 * 1000);

  return now >= expiryBuffer;
}
