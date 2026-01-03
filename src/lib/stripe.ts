/**
 * Stripe Integration
 * Handles checkout sessions, customer portal, and subscription management
 */

import Stripe from "stripe";

import { supabaseAdmin } from "@/lib/supabase/admin";

// ============================================================================
// Types
// ============================================================================

export type SubscriptionTier = "free" | "pro" | "pro_plus";

export interface CreateCheckoutParams {
  userId: string;
  userEmail: string;
  tier: "pro" | "pro_plus";
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePortalParams {
  userId: string;
  returnUrl: string;
}

// ============================================================================
// Stripe Client
// ============================================================================

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(secretKey, {
    typescript: true,
  });
}

// ============================================================================
// Price ID Helpers
// ============================================================================

/**
 * Get Stripe Price ID for a given tier
 */
export function getPriceId(tier: "pro" | "pro_plus"): string {
  const priceIds = {
    pro: process.env.STRIPE_PRICE_PRO_MONTHLY,
    pro_plus: process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY,
  };

  const priceId = priceIds[tier];
  if (!priceId) {
    throw new Error(`STRIPE_PRICE_${tier.toUpperCase()}_MONTHLY environment variable is not set`);
  }
  return priceId;
}

/**
 * Get tier from Stripe Price ID
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier {
  const proPriceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
  const proPlusPriceId = process.env.STRIPE_PRICE_PRO_PLUS_MONTHLY;

  if (priceId === proPriceId) return "pro";
  if (priceId === proPlusPriceId) return "pro_plus";
  return "free";
}

// ============================================================================
// Customer Management
// ============================================================================

/**
 * Get or create a Stripe customer for a user
 */
export async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  const stripe = getStripeClient();

  // Check if user already has a Stripe customer ID
  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .single();

  if (subscription?.stripe_customer_id) {
    return subscription.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      user_id: userId,
    },
  });

  // Update subscription record with customer ID
  await supabaseAdmin
    .from("subscriptions")
    .update({ stripe_customer_id: customer.id, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return customer.id;
}

// ============================================================================
// Checkout Session
// ============================================================================

/**
 * Create a Stripe Checkout session for subscription upgrade
 */
export async function createCheckoutSession(params: CreateCheckoutParams): Promise<string> {
  const stripe = getStripeClient();

  const customerId = await getOrCreateCustomer(params.userId, params.userEmail);
  const priceId = getPriceId(params.tier);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    subscription_data: {
      metadata: {
        user_id: params.userId,
        tier: params.tier,
      },
    },
    automatic_tax: {
      enabled: true,
    },
    customer_update: {
      address: "auto",
    },
    metadata: {
      user_id: params.userId,
      tier: params.tier,
    },
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session URL");
  }

  return session.url;
}

// ============================================================================
// Customer Portal
// ============================================================================

/**
 * Create a Stripe Customer Portal session for subscription management
 */
export async function createPortalSession(params: CreatePortalParams): Promise<string> {
  const stripe = getStripeClient();

  // Get customer ID from subscription
  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", params.userId)
    .single();

  if (!subscription?.stripe_customer_id) {
    throw new Error("No Stripe customer found for this user");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: params.returnUrl,
  });

  return session.url;
}

// ============================================================================
// Webhook Event Handlers
// ============================================================================

/**
 * Handle successful checkout completion
 */
export async function handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.user_id;
  const tier = session.metadata?.tier as SubscriptionTier | undefined;

  if (!userId || !tier) {
    console.error("Missing user_id or tier in checkout session metadata");
    return;
  }

  const subscriptionId = session.subscription as string;

  // Update subscription record
  await supabaseAdmin
    .from("subscriptions")
    .update({
      stripe_subscription_id: subscriptionId,
      tier,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Update credits based on new tier
  const creditAmount = tier === "pro_plus" ? 3500 : 1500; // $35 or $15

  await supabaseAdmin
    .from("user_credits")
    .update({
      credits_cents: creditAmount,
      trial_ends_at: null, // Clear trial when upgrading
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  // Record credit transaction
  await supabaseAdmin.from("credit_transactions").insert({
    user_id: userId,
    amount_cents: creditAmount,
    reason: "subscription_upgrade",
  });
}

/**
 * Handle subscription update (plan change, renewal)
 */
export async function handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.error("Missing user_id in subscription metadata");
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  const tier = priceId ? getTierFromPriceId(priceId) : "free";

  let status: "active" | "past_due" | "canceled" = "canceled";
  if (subscription.status === "active") {
    status = "active";
  } else if (subscription.status === "past_due") {
    status = "past_due";
  }

  // Cast to access billing period dates (Stripe SDK v20+ changed types)
  const subData = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };

  const updateData: Record<string, unknown> = {
    tier,
    status,
    updated_at: new Date().toISOString(),
  };

  if (subData.current_period_start) {
    updateData.current_period_start = new Date(subData.current_period_start * 1000).toISOString();
  }
  if (subData.current_period_end) {
    updateData.current_period_end = new Date(subData.current_period_end * 1000).toISOString();
  }

  await supabaseAdmin
    .from("subscriptions")
    .update(updateData)
    .eq("stripe_subscription_id", subscription.id);
}

/**
 * Handle subscription deletion (cancellation)
 */
export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  // Find user by subscription ID and downgrade to free tier
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (!sub) {
    console.error("Subscription not found:", subscription.id);
    return;
  }

  await supabaseAdmin
    .from("subscriptions")
    .update({
      tier: "free",
      status: "canceled",
      stripe_subscription_id: null,
      current_period_start: null,
      current_period_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", sub.user_id);

  // Reset to free tier credits
  await supabaseAdmin
    .from("user_credits")
    .update({
      credits_cents: 100, // $1.00
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", sub.user_id);

  await supabaseAdmin.from("credit_transactions").insert({
    user_id: sub.user_id,
    amount_cents: 100,
    reason: "subscription_canceled_free_credit",
  });
}

/**
 * Handle invoice payment success (monthly renewal)
 */
export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  // Cast to access subscription ID (Stripe SDK v20+ changed types)
  const invoiceData = invoice as unknown as { subscription?: string; billing_reason?: string };
  const subscriptionId = invoiceData.subscription;
  
  if (!subscriptionId || invoiceData.billing_reason !== "subscription_cycle") {
    return; // Only handle recurring payments
  }

  // Find user by subscription ID
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id, tier")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (!sub) {
    console.error("Subscription not found for invoice:", subscriptionId);
    return;
  }

  // Reset monthly credits based on tier
  let creditAmount = 100;
  if (sub.tier === "pro_plus") {
    creditAmount = 3500;
  } else if (sub.tier === "pro") {
    creditAmount = 1500;
  }

  await supabaseAdmin
    .from("user_credits")
    .update({
      credits_cents: creditAmount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", sub.user_id);

  await supabaseAdmin.from("credit_transactions").insert({
    user_id: sub.user_id,
    amount_cents: creditAmount,
    reason: "monthly_credit",
  });
}

// ============================================================================
// Webhook Verification
// ============================================================================

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
