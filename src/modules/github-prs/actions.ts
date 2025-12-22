"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
    fetchAllOpenPRs,
    fetchCreatedPRs,
    fetchReviewRequestedPRs,
} from "./lib/github-client";
import type {
    FetchPRsResult,
    GitHubAccount,
    GitHubAccountWithPRs,
    PRCategoryData,
} from "./types";

export async function getGitHubAccounts(): Promise<GitHubAccount[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("github_accounts")
    .select("id, user_id, github_user_id, github_username, avatar_url, account_label, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching GitHub accounts:", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    githubUserId: row.github_user_id,
    githubUsername: row.github_username,
    avatarUrl: row.avatar_url,
    accountLabel: row.account_label,
    createdAt: new Date(row.created_at),
  }));
}

export async function getPullRequests(): Promise<FetchPRsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { accounts: [], errors: [] };
  }

  const { data: accountRows, error } = await supabase
    .from("github_accounts")
    .select("*")
    .eq("user_id", user.id);

  if (error) {
    console.error("Error fetching GitHub accounts:", error);
    return { accounts: [], errors: [{ accountId: "", message: error.message }] };
  }

  const accounts: GitHubAccountWithPRs[] = [];
  const errors: Array<{ accountId: string; message: string }> = [];

  for (const row of accountRows ?? []) {
    const token = row.access_token;

    if (!token) {
      errors.push({
        accountId: row.id,
        message: "Failed to retrieve access token",
      });
      continue;
    }

    try {
      const [reviewRequested, created, allOpen] = await Promise.all([
        fetchReviewRequestedPRs(row.github_username, token),
        fetchCreatedPRs(row.github_username, token),
        fetchAllOpenPRs(row.github_username, token),
      ]);

      const categories: PRCategoryData[] = [
        {
          category: "review-requested",
          label: "Waiting For My Review",
          items: reviewRequested,
        },
        {
          category: "created",
          label: "Created By Me",
          items: created,
        },
        {
          category: "all-open",
          label: "All Open",
          items: allOpen,
        },
      ];

      accounts.push({
        account: {
          id: row.id,
          userId: row.user_id,
          githubUserId: row.github_user_id,
          githubUsername: row.github_username,
          avatarUrl: row.avatar_url,
          accountLabel: row.account_label,
          createdAt: new Date(row.created_at),
        },
        categories,
      });
    } catch (err) {
      errors.push({
        accountId: row.id,
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return { accounts, errors };
}

export async function updateAccountLabel(
  accountId: string,
  label: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("github_accounts")
    .update({ account_label: label })
    .eq("id", accountId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/account/github");
  revalidatePath("/prs");
  return { success: true };
}

export async function disconnectGitHubAccount(
  accountId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Delete the account record (RLS ensures user can only delete their own)
  const { error: deleteError } = await supabase
    .from("github_accounts")
    .delete()
    .eq("id", accountId);

  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  revalidatePath("/account/github");
  revalidatePath("/prs");
  revalidatePath("/");
  return { success: true };
}
