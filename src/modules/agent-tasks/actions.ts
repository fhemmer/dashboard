"use server";

/**
 * Agent Tasks Module Server Actions
 * Server-side functions for managing background agent tasks
 * 
 * NOTE: Uses type assertions for agent_runs table until migration is applied
 * and database types are regenerated.
 */

import { calculateCost, DEFAULT_MODEL } from "@/lib/agent";
import { inngest } from "@/inngest";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

import type {
  AgentRun,
  AgentRunInput,
  AgentRunResult,
  AgentRunsResult,
  AgentTasksSummary,
  CreateAgentRunResult,
} from "./types";

// Temporary type for agent_runs table rows until migration is applied
interface AgentRunRow {
  id: string;
  user_id: string;
  prompt: string;
  system_prompt: string | null;
  model: string;
  status: string;
  result: string | null;
  error: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  created_at: string;
  completed_at: string | null;
}

/**
 * Get all agent runs for the current user
 */
export async function getAgentRuns(): Promise<AgentRunsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { runs: [], error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("agent_runs" as "demo")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching agent runs:", error);
    return { runs: [], error: error.message };
  }

  const runs: AgentRun[] = ((data as unknown as AgentRunRow[]) ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    prompt: row.prompt,
    systemPrompt: row.system_prompt,
    model: row.model,
    status: row.status as AgentRun["status"],
    result: row.result,
    error: row.error,
    inputTokens: row.input_tokens ?? 0,
    outputTokens: row.output_tokens ?? 0,
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
  }));

  return { runs };
}

/**
 * Get a single agent run
 */
export async function getAgentRun(id: string): Promise<AgentRunResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { run: null, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("agent_runs" as "demo")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { run: null, error: "Agent run not found" };
    }
    console.error("Error fetching agent run:", error);
    return { run: null, error: error.message };
  }

  const row = data as unknown as AgentRunRow;
  const run: AgentRun = {
    id: row.id,
    userId: row.user_id,
    prompt: row.prompt,
    systemPrompt: row.system_prompt,
    model: row.model,
    status: row.status as AgentRun["status"],
    result: row.result,
    error: row.error,
    inputTokens: row.input_tokens ?? 0,
    outputTokens: row.output_tokens ?? 0,
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
  };

  return { run };
}

/**
 * Queue a new agent run via Inngest
 */
export async function queueAgentRun(input: AgentRunInput): Promise<CreateAgentRunResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Create the database record first
  const { data, error } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("agent_runs" as "demo") as any)
    .insert({
      user_id: user.id,
      prompt: input.prompt,
      system_prompt: input.systemPrompt ?? null,
      model: input.model ?? DEFAULT_MODEL,
      status: "queued",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error creating agent run:", error);
    return { success: false, error: error.message };
  }

  const insertedRow = data as unknown as { id: string };

  // Send event to Inngest
  try {
    await inngest.send({
      name: "agent/run",
      data: {
        taskId: insertedRow.id,
        prompt: input.prompt,
        model: input.model ?? DEFAULT_MODEL,
        systemPrompt: input.systemPrompt,
        userId: user.id,
      },
    });
  } catch (inngestError) {
    // Mark as failed if Inngest fails
    await supabase
      .from("agent_runs" as "demo")
      .update({
        status: "failed",
        error: "Failed to queue task",
      } as Record<string, unknown>)
      .eq("id", insertedRow.id);

    console.error("Error sending to Inngest:", inngestError);
    return { success: false, error: "Failed to queue task" };
  }

  revalidatePath("/agent-tasks");
  revalidatePath("/");
  return { success: true, id: insertedRow.id };
}

/**
 * Get agent tasks summary for widget
 */
export async function getAgentTasksSummary(): Promise<AgentTasksSummary> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { recentRuns: [], totalRuns: 0, runningCount: 0, totalCost: 0 };
  }

  // Get total count
  const { count: totalCount } = await supabase
    .from("agent_runs" as "demo")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Get running count
  const { count: runningCount } = await supabase
    .from("agent_runs" as "demo")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("status", ["queued", "running"]);

  // Get recent runs
  const { data: recentData } = await supabase
    .from("agent_runs" as "demo")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Get all runs for total cost calculation
  const { data: allData } = await supabase
    .from("agent_runs" as "demo")
    .select("model, input_tokens, output_tokens")
    .eq("user_id", user.id)
    .eq("status", "completed");

  const recentRuns: AgentRun[] = ((recentData as unknown as AgentRunRow[]) ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    prompt: row.prompt,
    systemPrompt: row.system_prompt,
    model: row.model,
    status: row.status as AgentRun["status"],
    result: row.result,
    error: row.error,
    inputTokens: row.input_tokens ?? 0,
    outputTokens: row.output_tokens ?? 0,
    createdAt: new Date(row.created_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
  }));

  interface CostRow { model: string; input_tokens: number | null; output_tokens: number | null }
  const totalCost = ((allData as unknown as CostRow[]) ?? []).reduce((sum, row) => {
    return sum + calculateCost(row.model, row.input_tokens ?? 0, row.output_tokens ?? 0);
  }, 0);

  return {
    recentRuns,
    totalRuns: totalCount ?? 0,
    runningCount: runningCount ?? 0,
    totalCost,
  };
}
