/**
 * Credit Management
 * Functions for managing user AI usage credits
 */

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ============================================================================
// Types
// ============================================================================

export interface UserCredits {
  id: string;
  userId: string;
  creditsCents: number;
  trialEndsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amountCents: number;
  reason: string;
  referenceId: string | null;
  createdAt: Date;
}

export interface CreditsInfo {
  balanceCents: number;
  balanceDollars: number;
  isTrialActive: boolean;
  trialEndsAt: Date | null;
  daysUntilTrialEnds: number | null;
}

// ============================================================================
// Server Functions (require auth)
// ============================================================================

/**
 * Get current user's credit balance
 */
export async function getCreditsBalance(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { data } = await supabase
    .from("user_credits")
    .select("credits_cents")
    .eq("user_id", user.id)
    .single();

  return data?.credits_cents ?? 0;
}

/**
 * Check if current user's trial is still active
 */
export async function isTrialActive(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("user_credits")
    .select("trial_ends_at")
    .eq("user_id", user.id)
    .single();

  if (!data?.trial_ends_at) return false;
  return new Date(data.trial_ends_at) > new Date();
}

/**
 * Check if current user can use paid models
 * Returns true if they have credits > 0
 */
export async function canUsePaidModels(): Promise<boolean> {
  const credits = await getCreditsBalance();
  return credits > 0;
}

/**
 * Get full credits info for the current user
 */
export async function getCreditsInfo(): Promise<CreditsInfo | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("user_credits")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!data) return null;

  const trialEndsAt = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
  const now = new Date();
  const isTrialActive = trialEndsAt !== null && trialEndsAt > now;
  
  let daysUntilTrialEnds: number | null = null;
  if (trialEndsAt && isTrialActive) {
    daysUntilTrialEnds = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    balanceCents: data.credits_cents,
    balanceDollars: data.credits_cents / 100,
    isTrialActive,
    trialEndsAt,
    daysUntilTrialEnds,
  };
}

/**
 * Get credit transaction history for current user
 */
export async function getCreditTransactions(limit = 20): Promise<CreditTransaction[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("credit_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    amountCents: row.amount_cents,
    reason: row.reason,
    referenceId: row.reference_id,
    createdAt: new Date(row.created_at),
  }));
}

// ============================================================================
// Admin Functions (bypass RLS - for server actions and webhooks)
// ============================================================================

/**
 * Get credits by user ID (admin)
 */
export async function getCreditsBalanceByUserId(userId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("user_credits")
    .select("credits_cents")
    .eq("user_id", userId)
    .single();

  return data?.credits_cents ?? 0;
}

/**
 * Check if user can use paid models (admin)
 */
export async function canUsePaidModelsByUserId(userId: string): Promise<boolean> {
  const credits = await getCreditsBalanceByUserId(userId);
  return credits > 0;
}

/**
 * Deduct credits from a user (admin)
 * @param userId - User ID
 * @param amountCents - Amount in cents to deduct
 * @param reason - Reason for deduction (e.g., 'ai_usage')
 * @param referenceId - Optional reference to chat message or agent run
 * @returns true if successful
 */
export async function deductCredits(
  userId: string,
  amountCents: number,
  reason: string,
  referenceId?: string
): Promise<boolean> {
  if (amountCents <= 0) return true; // No-op for zero or negative

  // Round to nearest cent
  const roundedAmount = Math.round(amountCents);

  // Use the database function to deduct credits atomically
  const { error } = await supabaseAdmin.rpc("deduct_credits", {
    target_user_id: userId,
    amount: roundedAmount,
    usage_reason: reason,
    ref_id: referenceId,
  });

  if (error) {
    console.error("Error deducting credits:", error);
    return false;
  }

  return true;
}

/**
 * Add credits to a user (admin)
 */
export async function addCredits(
  userId: string,
  amountCents: number,
  reason: string
): Promise<boolean> {
  if (amountCents <= 0) return false;

  // Get current balance
  const { data: current } = await supabaseAdmin
    .from("user_credits")
    .select("credits_cents")
    .eq("user_id", userId)
    .single();

  if (!current) return false;

  // Update credits
  const { error: updateError } = await supabaseAdmin
    .from("user_credits")
    .update({
      credits_cents: current.credits_cents + amountCents,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Error adding credits:", updateError);
    return false;
  }

  // Record transaction
  await supabaseAdmin.from("credit_transactions").insert({
    user_id: userId,
    amount_cents: amountCents,
    reason,
  });

  return true;
}

/**
 * Reset user credits to monthly allowance (admin)
 */
export async function resetMonthlyCredits(userId: string): Promise<void> {
  await supabaseAdmin.rpc("reset_monthly_credits", {
    target_user_id: userId,
  });
}

/**
 * Handle trial expiry for a user (admin)
 */
export async function handleTrialExpiry(userId: string): Promise<void> {
  await supabaseAdmin.rpc("handle_trial_expiry", {
    target_user_id: userId,
  });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format credits for display
 */
export function formatCredits(cents: number): string {
  const dollars = cents / 100;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Convert USD cost to cents
 */
export function usdToCents(usd: number): number {
  return Math.round(usd * 100);
}
