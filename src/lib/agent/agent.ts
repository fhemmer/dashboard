/**
 * Agent Runner
 * Core agent execution with tool usage and step limits
 */

import { generateText, stepCountIs } from "ai";

import { DEFAULT_MODEL, getOpenRouter } from "./client";
import { allTools } from "./tools";

export interface AgentOptions {
  prompt: string;
  model?: string;
  systemPrompt?: string;
  maxSteps?: number;
}

export interface AgentResult {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  steps: number;
}

const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant with access to web search capabilities.
When asked about current events, recent information, or facts you're unsure about, use the web search tool.
Be concise and helpful in your responses.`;

export async function runAgent(options: AgentOptions): Promise<AgentResult> {
  const openrouter = getOpenRouter();
  const maxSteps = options.maxSteps ?? 10;

  const result = await generateText({
    model: openrouter.chat(options.model ?? DEFAULT_MODEL),
    system: options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
    tools: allTools,
    stopWhen: stepCountIs(maxSteps),
    prompt: options.prompt,
  });

  return {
    text: result.text,
    usage: result.usage
      ? {
          promptTokens: result.usage.inputTokens ?? 0,
          completionTokens: result.usage.outputTokens ?? 0,
          totalTokens: result.usage.totalTokens ?? 0,
        }
      : undefined,
    finishReason: result.finishReason,
    steps: result.steps?.length ?? 1,
  };
}

