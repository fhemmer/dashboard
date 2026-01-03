/**
 * Subscription Management
 * Functions for managing user subscription tiers
 */

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// ============================================================================
// Types
// ============================================================================

type TierFree = "free";
type TierPro = "pro";
type TierProPlus = "pro_plus";
export type SubscriptionTier = TierFree | TierPro | TierProPlus;

type StatusActive = "active";
type StatusCanceled = "canceled";
type StatusPastDue = "past_due";
type StatusTrialing = "trialing";
export type SubscriptionStatus = StatusActive | StatusCanceled | StatusPastDue | StatusTrialing;

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  tier: SubscriptionTier;
  billingCycle: BillingCycle | null;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

type BillingCycleMonthly = "monthly";
type BillingCycleAnnual = "annual";
type BillingCycle = BillingCycleMonthly | BillingCycleAnnual;

// ============================================================================
// Constants
// ============================================================================

/**
 * Monthly credit allowance by tier (in cents)
 */
export const TIER_CREDITS: Record<SubscriptionTier, number> = {
  free: 100,      // $1.00
  pro: 1500,      // $15.00
  pro_plus: 3500, // $35.00
};

/**
 * Tier pricing (monthly)
 */
export const TIER_PRICING: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 10,       // $10/month
  pro_plus: 20,  // $20/month
};

/**
 * Tier display names
 */
export const TIER_NAMES: Record<SubscriptionTier, string> = {
  free: "Free",
  pro: "Pro",
  pro_plus: "Pro+",
};

// ============================================================================
// Server Functions (require auth)
// ============================================================================

/**
 * Get the current user's subscription
 */
export async function getSubscription(): Promise<Subscription | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    tier: data.tier as SubscriptionTier,
    billingCycle: data.billing_cycle as "monthly" | "annual" | null,
    status: data.status as SubscriptionStatus,
    currentPeriodStart: data.current_period_start ? new Date(data.current_period_start) : null,
    currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Get the current user's tier
 */
export async function getTier(): Promise<SubscriptionTier> {
  const subscription = await getSubscription();
  return subscription?.tier ?? "free";
}

/**
 * Get monthly credit allowance for a tier
 */
export function getMonthlyAllowance(tier: SubscriptionTier): number {
  return TIER_CREDITS[tier];
}

// ============================================================================
// Admin Functions (bypass RLS)
// ============================================================================

/**
 * Get subscription by user ID (admin)
 */
export async function getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    stripeCustomerId: data.stripe_customer_id,
    stripeSubscriptionId: data.stripe_subscription_id,
    tier: data.tier as SubscriptionTier,
    billingCycle: data.billing_cycle as "monthly" | "annual" | null,
    status: data.status as SubscriptionStatus,
    currentPeriodStart: data.current_period_start ? new Date(data.current_period_start) : null,
    currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

/**
 * Update subscription tier (admin - called by webhooks)
 */
export async function updateSubscriptionTier(
  userId: string,
  tier: SubscriptionTier,
  status: SubscriptionStatus = "active"
): Promise<void> {
  await supabaseAdmin
    .from("subscriptions")
    .update({
      tier,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}
