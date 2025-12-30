/**
 * OpenRouter Client Configuration
 * Provides access to various AI models via OpenRouter API
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider";

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  return createOpenRouter({
    apiKey,
  });
}

let _openrouter: ReturnType<typeof createOpenRouter> | null = null;

export function getOpenRouter() {
  if (!_openrouter) {
    _openrouter = getOpenRouterClient();
  }
  return _openrouter;
}

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4";

export interface ModelPricing {
  input: number;
  output: number;
  contextWindow: number;
}

export const MODEL_PRICES: Record<string, ModelPricing> = {
  "anthropic/claude-sonnet-4": { input: 0.003, output: 0.015, contextWindow: 1000000 },
  "anthropic/claude-opus-4": { input: 0.015, output: 0.075, contextWindow: 200000 },
  "openai/gpt-4o": { input: 0.005, output: 0.015, contextWindow: 128000 },
  "openai/gpt-4o-mini": { input: 0.00015, output: 0.0006, contextWindow: 128000 },
  "google/gemini-2.0-flash-001": { input: 0.0001, output: 0.0004, contextWindow: 1000000 },
  // Free models
  "meta-llama/llama-3.3-70b-instruct:free": { input: 0, output: 0, contextWindow: 128000 },
  "meta-llama/llama-3.1-8b-instruct:free": { input: 0, output: 0, contextWindow: 128000 },
  "google/gemini-2.0-flash-exp:free": { input: 0, output: 0, contextWindow: 1000000 },
  "deepseek/deepseek-r1:free": { input: 0, output: 0, contextWindow: 64000 },
  "deepseek/deepseek-r1-0528:free": { input: 0, output: 0, contextWindow: 64000 },
};

/**
 * Check if a model is free based on its ID
 */
function isModelFree(modelId: string): boolean {
  return modelId.endsWith(":free");
}

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Free models have zero cost
  if (isModelFree(model)) {
    return 0;
  }
  const prices = MODEL_PRICES[model] ?? { input: 0.001, output: 0.002, contextWindow: 128000 };
  return (inputTokens * prices.input + outputTokens * prices.output) / 1000;
}

export function getContextWindow(model: string): number {
  return MODEL_PRICES[model]?.contextWindow ?? 128000;
}

export function getAvailableModels(): Array<{ id: string; name: string }> {
  return [
    { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
    { id: "anthropic/claude-opus-4", name: "Claude Opus 4" },
    { id: "openai/gpt-4o", name: "GPT-4o" },
    { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
    { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash" },
  ];
}
