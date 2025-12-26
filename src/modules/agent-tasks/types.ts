/**
 * Agent Tasks Module Types
 * Type definitions for background agent task execution
 */

import { calculateCost } from "@/lib/agent";

// ============================================================================
// Status Types
// ============================================================================

export type AgentRunStatus = "queued" | "running" | "completed" | "failed";

// ============================================================================
// Agent Run Types
// ============================================================================

export interface AgentRun {
  id: string;
  userId: string;
  prompt: string;
  systemPrompt: string | null;
  model: string;
  status: AgentRunStatus;
  result: string | null;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
  createdAt: Date;
  completedAt: Date | null;
}

export interface AgentRunInput {
  prompt: string;
  model?: string;
  systemPrompt?: string;
}

// ============================================================================
// Summary Types
// ============================================================================

export interface AgentTasksSummary {
  recentRuns: AgentRun[];
  totalRuns: number;
  runningCount: number;
  totalCost: number;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AgentRunsResult {
  runs: AgentRun[];
  error?: string;
}

export interface AgentRunResult {
  run: AgentRun | null;
  error?: string;
}

export interface CreateAgentRunResult {
  id?: string;
  success: boolean;
  error?: string;
}

export interface UpdateResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

export function getStatusColor(status: AgentRunStatus): string {
  switch (status) {
    case "queued":
      return "bg-yellow-500";
    case "running":
      return "bg-blue-500";
    case "completed":
      return "bg-green-500";
    case "failed":
      return "bg-red-500";
  }
}

export function getStatusLabel(status: AgentRunStatus): string {
  switch (status) {
    case "queued":
      return "Queued";
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
  }
}

export function formatCost(costUsd: number): string {
  if (costUsd < 0.01) {
    return `$${costUsd.toFixed(4)}`;
  }
  return `$${costUsd.toFixed(2)}`;
}

export function calculateRunCost(run: AgentRun): number {
  return calculateCost(run.model, run.inputTokens, run.outputTokens);
}

export function formatDuration(startDate: Date, endDate: Date | null): string {
  if (!endDate) return "—";

  const diffMs = endDate.getTime() - startDate.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return `${diffSecs}s`;
  const diffMins = Math.floor(diffSecs / 60);
  const remainingSecs = diffSecs % 60;
  return `${diffMins}m ${remainingSecs}s`;
}
