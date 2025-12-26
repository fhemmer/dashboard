/**
 * Inngest Functions
 * Background task definitions for agent runs
 */

import { runAgent } from "@/lib/agent";
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

export const allFunctions = [agentRun];
