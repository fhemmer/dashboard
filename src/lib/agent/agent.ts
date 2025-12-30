/**
 * Agent Runner
 * Core agent execution with tool usage and step limits
 */

import { generateText, stepCountIs } from "ai";

import { DEFAULT_MODEL, getOpenRouter } from "./client";
import { allTools, type TavilyResponse } from "./tools";

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
Be concise and helpful in your responses.
IMPORTANT: After using tools, you MUST provide a final text response summarizing the results for the user.`;

/**
 * Formats search results into a readable summary
 */
function formatSearchResults(results: TavilyResponse["results"]): string {
  const summaries = results.slice(0, 3).map(r => 
    `**${r.title}**: ${r.content.slice(0, 200)}...`
  );
  return `Here's what I found:\n\n${summaries.join("\n\n")}`;
}

/**
 * Extracts a response from a single tool result
 */
function extractFromToolResult(result: TavilyResponse | undefined): string | null {
  if (!result) return null;
  if (result.answer) return result.answer;
  if (result.results?.length > 0) return formatSearchResults(result.results);
  return null;
}

/**
 * Extracts a response from tool results when the model doesn't provide text
 */
function extractToolResultsSummary(steps: unknown[]): string {
  if (!Array.isArray(steps)) return "";
  
  for (const step of steps) {
    const stepObj = step as { toolResults?: unknown[] };
    const toolResults = stepObj.toolResults ?? [];
    for (const toolResult of toolResults) {
      const resultObj = toolResult as { result?: unknown };
      const extracted = extractFromToolResult(resultObj.result as TavilyResponse | undefined);
      if (extracted) return extracted;
    }
  }
  return "";
}

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

  // If the model didn't provide text but used tools, extract from tool results
  let responseText = result.text;
  if (!responseText && result.steps && result.steps.length > 0) {
    responseText = extractToolResultsSummary(result.steps);
  }
  
  // Fallback message if still empty
  if (!responseText) {
    responseText = "I processed your request but couldn't generate a response. Please try again.";
  }

  return {
    text: responseText,
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

