"use server";

/**
 * Mail Module Server Actions
 * Server-side functions for managing mail accounts and operations
 */

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  AccountsResult,
  MailAccount,
  MailAccountInput,
  MailAccountSummary,
  MailSummary,
  UpdateResult,
} from "./types";
import { invalidateAllUserCaches, invalidateMessagesCache, invalidateSummaryCache } from "./lib/cache";
import { deleteToken, storeToken } from "./lib/token-manager";
import { getGmailUnreadCount } from "./lib/gmail-client";
import { getImapUnreadCount } from "./lib/imap-client";
import { getOutlookUnreadCount } from "./lib/outlook-client";

/**
 * Get all mail accounts for the current user
 */
export async function getMailAccounts(): Promise<AccountsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { accounts: [], error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("mail_account_settings")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching mail accounts:", error);
    return { accounts: [], error: error.message };
  }

  const accounts: MailAccount[] = (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    provider: row.provider as "outlook" | "gmail" | "imap",
    accountName: row.account_name,
    emailAddress: row.email_address,
    isEnabled: row.is_enabled,
    syncFrequencyMinutes: row.sync_frequency_minutes,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }));

  return { accounts };
}

/**
 * Create a new mail account
 */
export async function createMailAccount(
  input: MailAccountInput
): Promise<UpdateResult & { id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("mail_account_settings")
    .insert({
      user_id: user.id,
      provider: input.provider,
      account_name: input.accountName,
      email_address: input.emailAddress,
      is_enabled: input.isEnabled ?? true,
      sync_frequency_minutes: input.syncFrequencyMinutes ?? 5,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating mail account:", error);
    return { success: false, error: error.message };
  }

  // Invalidate caches
  await invalidateAllUserCaches(user.id);
  
  revalidatePath("/mail");
  revalidatePath("/mail/settings");
  revalidatePath("/");
  
  return { success: true, id: data.id };
}

/**
 * Update a mail account
 */
export async function updateMailAccount(
  id: string,
  input: Partial<MailAccountInput>
): Promise<UpdateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const updateData: Record<string, unknown> = {};
  if (input.accountName !== undefined) updateData.account_name = input.accountName;
  if (input.emailAddress !== undefined) updateData.email_address = input.emailAddress;
  if (input.isEnabled !== undefined) updateData.is_enabled = input.isEnabled;
  if (input.syncFrequencyMinutes !== undefined)
    updateData.sync_frequency_minutes = input.syncFrequencyMinutes;

  const { error } = await supabase
    .from("mail_account_settings")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating mail account:", error);
    return { success: false, error: error.message };
  }

  // Invalidate caches
  await invalidateSummaryCache(user.id);
  await invalidateMessagesCache(id);
  
  revalidatePath("/mail");
  revalidatePath("/mail/settings");
  revalidatePath("/");
  
  return { success: true };
}

/**
 * Delete a mail account and its tokens
 */
export async function deleteMailAccount(id: string): Promise<UpdateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Delete tokens first (cascade should handle this, but explicit is safer)
  await deleteToken(id);

  // Delete account
  const { error } = await supabase
    .from("mail_account_settings")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting mail account:", error);
    return { success: false, error: error.message };
  }

  // Invalidate caches
  await invalidateAllUserCaches(user.id);
  
  revalidatePath("/mail");
  revalidatePath("/mail/settings");
  revalidatePath("/");
  
  return { success: true };
}

/**
 * Get mail summary for all enabled accounts
 */
export async function getMailSummary(): Promise<MailSummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { accounts: [], totalUnread: 0, error: "Not authenticated" };
  }

  // Get all enabled accounts
  const { accounts, error } = await getMailAccounts();
  
  if (error) {
    return { accounts: [], totalUnread: 0, error };
  }

  const enabledAccounts = accounts.filter((a) => a.isEnabled);
  
  if (enabledAccounts.length === 0) {
    return { accounts: [], totalUnread: 0 };
  }

  // Fetch unread counts for each account
  const summaries: MailAccountSummary[] = await Promise.all(
    enabledAccounts.map(async (account) => {
      let unreadCount = 0;
      
      try {
        switch (account.provider) {
          case "outlook":
            unreadCount = await getOutlookUnreadCount(account.id);
            break;
          case "gmail":
            unreadCount = await getGmailUnreadCount(account.id);
            break;
          case "imap":
            unreadCount = await getImapUnreadCount(account.id);
            break;
        }
      } catch (error) {
        console.error(`Error fetching unread count for ${account.id}:`, error);
      }

      return {
        accountId: account.id,
        accountName: account.accountName,
        provider: account.provider,
        emailAddress: account.emailAddress,
        unreadCount,
        totalCount: 0, // Placeholder: total count fetching requires provider-specific implementation
        lastSyncedAt: new Date(),
      };
    })
  );

  const totalUnread = summaries.reduce((sum, s) => sum + s.unreadCount, 0);

  return { accounts: summaries, totalUnread };
}

/**
 * Store account credentials (for IMAP) or OAuth tokens
 */
export async function storeAccountCredentials(
  accountId: string,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: Date
): Promise<UpdateResult> {
  const result = await storeToken({
    accountId,
    accessToken,
    refreshToken: refreshToken ?? null,
    expiresAt: expiresAt ?? null,
  });

  if (result.success) {
    // Invalidate caches after storing new credentials
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (user) {
      await invalidateSummaryCache(user.id);
      await invalidateMessagesCache(accountId);
    }
    
    revalidatePath("/mail");
    revalidatePath("/");
  }

  return result;
}
