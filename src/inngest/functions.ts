/**
 * Inngest Functions
 * Background task definitions for agent runs and subscription management
 */

import { runAgent } from "@/lib/agent";
import { handleTrialExpiry, resetMonthlyCredits } from "@/lib/credits";
import { sendEmail } from "@/lib/resend";
import { supabaseAdmin } from "@/lib/supabase/admin";

import { inngest } from "./client";

export interface AgentRunEventData {
  taskId: string;
  prompt: string;
  model?: string;
  userId: string;
  systemPrompt?: string;
}

// Define agent_runs table type until migration is applied
interface AgentRunRow {
  id: string;
  status: string;
  result?: string;
  input_tokens?: number;
  output_tokens?: number;
  completed_at?: string;
}

export const agentRun = inngest.createFunction(
  {
    id: "agent-run",
    retries: 3,
  },
  { event: "agent/run" },
  async ({ event, step }) => {
    // Note: userId is intentionally not destructured - it's stored with the task record for auditing
    const { taskId, prompt, model, systemPrompt } = event.data as AgentRunEventData;

    // Update status to running (using admin client for background tasks)
    await step.run("update-status-running", async () => {
      await supabaseAdmin
        .from("agent_runs" as "demo")
        .update({ status: "running" } as unknown as AgentRunRow)
        .eq("id", taskId);
    });

    // Execute agent
    const result = await step.run("execute-agent", async () => {
      return runAgent({ prompt, model, systemPrompt });
    });

    // Save results
    await step.run("save-results", async () => {
      await supabaseAdmin
        .from("agent_runs" as "demo")
        .update({
          status: "completed",
          result: result.text,
          input_tokens: result.usage?.promptTokens ?? 0,
          output_tokens: result.usage?.completionTokens ?? 0,
          completed_at: new Date().toISOString(),
        } as unknown as AgentRunRow)
        .eq("id", taskId);
    });

    return { success: true, text: result.text };
  }
);

// ============================================================================
// Subscription & Credits Background Jobs
// ============================================================================

/**
 * Check for expired trials and reset to free tier
 * Runs daily at midnight UTC
 */
export const checkTrialExpiry = inngest.createFunction(
  {
    id: "check-trial-expiry",
    retries: 2,
  },
  { cron: "0 0 * * *" }, // Daily at midnight UTC
  async ({ step }) => {
    // Find users with expired trials
    const expiredTrials = await step.run("find-expired-trials", async () => {
      const { data } = await supabaseAdmin
        .from("user_credits")
        .select("user_id")
        .lt("trial_ends_at", new Date().toISOString())
        .not("trial_ends_at", "is", null);
      return data ?? [];
    });

    // Process each expired trial
    for (const { user_id } of expiredTrials) {
      await step.run(`expire-trial-${user_id}`, async () => {
        await handleTrialExpiry(user_id);
      });

      // Get user email for notification
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", user_id)
        .single();

      if (profile?.email) {
        await step.run(`notify-trial-ended-${user_id}`, async () => {
          await sendEmail({
            to: profile.email!,
            subject: "Your Dashboard trial has ended",
            html: `
              <h2>Your trial period has ended</h2>
              <p>Your 7-day trial has expired. You've been moved to our Free plan with $1.00/month in AI credits.</p>
              <p>Free AI models (Llama 3.3, DeepSeek R1:free, etc.) are still available to you.</p>
              <p>To access premium AI models like Claude and GPT-4o, upgrade to Pro or Pro+.</p>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing">View Plans</a></p>
            `,
          });
        });
      }
    }

    return { processed: expiredTrials.length };
  }
);

/**
 * Send trial ending soon reminder
 * Runs daily, checks for trials ending in 1 day
 */
export const trialEndingReminder = inngest.createFunction(
  {
    id: "trial-ending-reminder",
    retries: 2,
  },
  { cron: "0 12 * * *" }, // Daily at noon UTC
  async ({ step }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date();
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    // Find users with trials ending in ~1 day
    const endingSoon = await step.run("find-trials-ending-soon", async () => {
      const { data } = await supabaseAdmin
        .from("user_credits")
        .select("user_id")
        .gte("trial_ends_at", tomorrow.toISOString())
        .lt("trial_ends_at", dayAfterTomorrow.toISOString());
      return data ?? [];
    });

    for (const { user_id } of endingSoon) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", user_id)
        .single();

      if (profile?.email) {
        await step.run(`notify-trial-ending-${user_id}`, async () => {
          await sendEmail({
            to: profile.email!,
            subject: "Your Dashboard trial ends tomorrow",
            html: `
              <h2>Your trial ends tomorrow!</h2>
              <p>Your 7-day trial expires in about 24 hours.</p>
              <p>After your trial ends, you'll be moved to our Free plan with $1.00/month in AI credits.</p>
              <p>Upgrade now to keep your premium AI model access:</p>
              <ul>
                <li><strong>Pro ($10/mo)</strong> - $15.00 AI credits, all models</li>
                <li><strong>Pro+ ($20/mo)</strong> - $35.00 AI credits, all models, priority support</li>
              </ul>
              <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing">Upgrade Now</a></p>
            `,
          });
        });
      }
    }

    return { notified: endingSoon.length };
  }
);

/**
 * Send low credits warning
 * Runs hourly, checks for users with < $1.00 remaining
 */
export const lowCreditsWarning = inngest.createFunction(
  {
    id: "low-credits-warning",
    retries: 2,
  },
  { cron: "0 * * * *" }, // Every hour
  async ({ step }) => {
    // Find users with low credits (< 100 cents = $1.00) but not zero
    const lowCredits = await step.run("find-low-credits", async () => {
      const { data } = await supabaseAdmin
        .from("user_credits")
        .select("user_id, credits_cents")
        .gt("credits_cents", 0)
        .lt("credits_cents", 100);
      return data ?? [];
    });

    // Only notify users who haven't been notified recently
    // (We could track this in a separate table, but for simplicity we'll just notify)
    for (const { user_id, credits_cents } of lowCredits) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", user_id)
        .single();

      if (profile?.email) {
        await step.run(`notify-low-credits-${user_id}`, async () => {
          const remaining = (credits_cents / 100).toFixed(2);
          await sendEmail({
            to: profile.email!,
            subject: `Low credits: $${remaining} remaining`,
            html: `
              <h2>Your AI credits are running low</h2>
              <p>You have <strong>$${remaining}</strong> in AI credits remaining this month.</p>
              <p>Free AI models are always available, but paid models (Claude, GPT-4o, etc.) require credits.</p>
              <p>Your credits will reset at the start of your next billing period.</p>
              <p>Need more credits? <a href="${process.env.NEXT_PUBLIC_APP_URL}/pricing">Upgrade your plan</a></p>
            `,
          });
        });
      }
    }

    return { notified: lowCredits.length };
  }
);

/**
 * Monthly credit reset for free users
 * Paid users get credits reset via Stripe webhook on invoice.paid
 * This handles free tier users on the 1st of each month
 */
export const monthlyFreeCreditsReset = inngest.createFunction(
  {
    id: "monthly-free-credits-reset",
    retries: 2,
  },
  { cron: "0 0 1 * *" }, // 1st of each month at midnight UTC
  async ({ step }) => {
    // Find all free tier users
    const freeUsers = await step.run("find-free-users", async () => {
      const { data } = await supabaseAdmin
        .from("subscriptions")
        .select("user_id")
        .eq("tier", "free")
        .eq("status", "active");
      return data ?? [];
    });

    for (const { user_id } of freeUsers) {
      await step.run(`reset-credits-${user_id}`, async () => {
        await resetMonthlyCredits(user_id);
      });
    }

    return { reset: freeUsers.length };
  }
);

export const allFunctions = [
  agentRun,
  checkTrialExpiry,
  trialEndingReminder,
  lowCreditsWarning,
  monthlyFreeCreditsReset,
];
