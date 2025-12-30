/**
 * OpenRouter Models API Client
 * Fetches model information and pricing from OpenRouter with Redis caching
 */

import { getCache, setCache } from "@/lib/redis";

// ============================================================================
// Environment Configuration
// ============================================================================

/**
 * Profit margin applied to all model pricing (default 10%)
 * This covers operational costs and free trial subsidies
 */
export function getProfitMargin(): number {
  const margin = process.env.OPENROUTER_PROFIT_MARGIN;
  if (!margin) return 0.1; // Default 10%
  const parsed = parseFloat(margin);
  if (isNaN(parsed) || parsed < 0 || parsed > 1) return 0.1;
  return parsed;
}

// ============================================================================
// Types
// ============================================================================

export interface OpenRouterModelPricing {
  prompt: string;
  completion: string;
  request: string;
  image: string;
  web_search: string;
  internal_reasoning: string;
  input_cache_read: string;
  input_cache_write: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: OpenRouterModelPricing;
  architecture: {
    input_modalities: string[];
    output_modalities: string[];
    tokenizer: string;
    instruct_type: string | null;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number;
    is_moderated: boolean;
  };
  supported_parameters?: string[];
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

/**
 * Provider information for grouping models
 */
export interface ModelProvider {
  id: string;
  name: string;
  icon?: string;
}

/**
 * Well-known providers for the model picker
 */
export const MODEL_PROVIDERS: Record<string, ModelProvider> = {
  anthropic: { id: "anthropic", name: "Anthropic" },
  openai: { id: "openai", name: "OpenAI" },
  google: { id: "google", name: "Google" },
  meta: { id: "meta-llama", name: "Meta" },
  mistral: { id: "mistralai", name: "Mistral" },
  deepseek: { id: "deepseek", name: "DeepSeek" },
  cohere: { id: "cohere", name: "Cohere" },
  xai: { id: "x-ai", name: "xAI" },
  perplexity: { id: "perplexity", name: "Perplexity" },
};

/**
 * Simplified model for UI consumption with margin-adjusted pricing
 */
export interface ModelWithPricing {
  id: string;
  name: string;
  description: string;
  contextLength: number;
  /** Price per 1M input tokens in USD (with margin) */
  inputPricePerMillion: number;
  /** Price per 1M output tokens in USD (with margin) */
  outputPricePerMillion: number;
  /** Price per 1M internal reasoning tokens in USD (with margin) */
  reasoningPricePerMillion: number;
  inputModalities: string[];
  outputModalities: string[];
  /** Provider ID extracted from model ID */
  providerId: string;
  /** Whether the model is free to use */
  isFree: boolean;
  /** Whether the model supports tools/function calling */
  supportsTools: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_KEY = "openrouter:models:v2"; // v2: fixed isFree pricing for reliable free providers
const CACHE_TTL_SECONDS = 3600; // 1 hour
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/models";

/**
 * Curated list of models to show in the picker
 * Comprehensive list from well-known providers including free models
 * Model IDs must exactly match OpenRouter API response
 */
export const CURATED_MODEL_IDS = [
  // Anthropic (IDs from OpenRouter API - no date suffixes on newer models)
  "anthropic/claude-opus-4.5",
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-haiku-4.5",
  "anthropic/claude-opus-4.1",
  "anthropic/claude-opus-4",
  "anthropic/claude-sonnet-4",
  "anthropic/claude-3.7-sonnet",
  "anthropic/claude-3.5-haiku",
  "anthropic/claude-3.5-sonnet",
  // OpenAI
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/o1",
  "openai/o1-mini",
  "openai/o3-mini",
  "openai/gpt-4-turbo",
  // Google
  "google/gemini-2.0-flash-001",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.0-flash-exp:free",
  // Meta
  "meta-llama/llama-4-maverick",
  "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  // Mistral
  "mistralai/mistral-large",
  "mistralai/mistral-nemo",
  "mistralai/mistral-small-24b-instruct-2501",
  "mistralai/codestral-2508",
  // DeepSeek
  "deepseek/deepseek-r1",
  "deepseek/deepseek-chat",
  "deepseek/deepseek-r1:free",
  "deepseek/deepseek-r1-0528:free",
  // Cohere
  "cohere/command-r-plus-08-2024",
  "cohere/command-r-08-2024",
  "cohere/command-a",
  // xAI
  "x-ai/grok-4",
  "x-ai/grok-3",
  "x-ai/grok-3-mini",
  // Perplexity
  "perplexity/sonar-pro",
  "perplexity/sonar",
  "perplexity/sonar-reasoning-pro",
  "perplexity/sonar-deep-research",
];

// ============================================================================
// API Functions
// ============================================================================

/**
 * Fetches models from OpenRouter API
 */
async function fetchModelsFromApi(): Promise<OpenRouterModel[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set");
  }

  const response = await fetch(OPENROUTER_API_URL, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OpenRouterModelsResponse;
  return data.data;
}

/**
 * Applies profit margin to pricing
 * @param pricePerToken - Price per token as string from OpenRouter
 * @returns Price per 1M tokens with margin applied
 */
function applyMarginToPrice(pricePerToken: string): number {
  const price = parseFloat(pricePerToken);
  if (isNaN(price) || price === 0) return 0;
  const margin = getProfitMargin();
  // Convert per-token price to per-1M tokens and apply margin
  return price * 1_000_000 * (1 + margin);
}

/**
 * Extracts provider ID from model ID (e.g., "anthropic/claude-3" -> "anthropic")
 */
function extractProviderId(modelId: string): string {
  return modelId.split("/")[0];
}

/**
 * Checks if a model is free based on its ID suffix or pricing
 */
function isModelFree(modelId: string, pricing: OpenRouterModelPricing): boolean {
  if (modelId.endsWith(":free")) return true;
  const promptPrice = parseFloat(pricing.prompt);
  const completionPrice = parseFloat(pricing.completion);
  return promptPrice === 0 && completionPrice === 0;
}

/**
 * Free model providers known to have unreliable tool support
 * - Google: Aggressive rate limits on free tier cause tool calls to fail
 * - DeepSeek R1: Reasoning models that don't support standard tool calling
 */
const UNRELIABLE_FREE_TOOL_PROVIDERS = ["google", "deepseek"];

/**
 * Checks if a model supports tools/function calling reliably
 * Excludes free models from providers known to have issues with tools
 */
function modelSupportsTools(model: OpenRouterModel): boolean {
  const supportsTools = model.supported_parameters?.includes("tools") ?? false;
  if (!supportsTools) return false;

  const isFree = isModelFree(model.id, model.pricing);
  if (!isFree) return true;

  // Allow free models from reliable providers (e.g., Meta Llama)
  const providerId = extractProviderId(model.id);
  return !UNRELIABLE_FREE_TOOL_PROVIDERS.includes(providerId);
}

/**
 * Transforms OpenRouter model to simplified format with margin-adjusted pricing
 */
function transformModel(model: OpenRouterModel): ModelWithPricing {
  const isFree = isModelFree(model.id, model.pricing);
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    contextLength: model.context_length,
    inputPricePerMillion: isFree ? 0 : applyMarginToPrice(model.pricing.prompt),
    outputPricePerMillion: isFree ? 0 : applyMarginToPrice(model.pricing.completion),
    reasoningPricePerMillion: isFree ? 0 : applyMarginToPrice(model.pricing.internal_reasoning),
    inputModalities: model.architecture?.input_modalities ?? ["text"],
    outputModalities: model.architecture?.output_modalities ?? ["text"],
    providerId: extractProviderId(model.id),
    isFree,
    supportsTools: modelSupportsTools(model),
  };
}

/**
 * Gets all available models with pricing from cache or API
 * Returns curated list of supported models
 */
export async function getModelsWithPricing(): Promise<ModelWithPricing[]> {
  // Try cache first
  const cached = await getCache<ModelWithPricing[]>(CACHE_KEY);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const allModels = await fetchModelsFromApi();

  // Filter to curated models that support tools and transform
  const curatedModels = allModels
    .filter((m) => CURATED_MODEL_IDS.includes(m.id) && modelSupportsTools(m))
    .map(transformModel)
    .sort((a, b) => {
      // Sort by curated order
      const aIndex = CURATED_MODEL_IDS.indexOf(a.id);
      const bIndex = CURATED_MODEL_IDS.indexOf(b.id);
      return aIndex - bIndex;
    });

  // Cache the result
  await setCache(CACHE_KEY, curatedModels, CACHE_TTL_SECONDS);

  return curatedModels;
}

/**
 * Gets a single model by ID with pricing
 */
export async function getModelWithPricing(modelId: string): Promise<ModelWithPricing | null> {
  const models = await getModelsWithPricing();
  return models.find((m) => m.id === modelId) ?? null;
}

/**
 * Calculates the cost for a given number of tokens with margin applied
 * @param modelId - The model ID
 * @param inputTokens - Number of input/prompt tokens
 * @param outputTokens - Number of output/completion tokens
 * @param reasoningTokens - Number of internal reasoning tokens (optional)
 * @returns Total cost in USD
 */
export async function calculateCostWithMargin(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  reasoningTokens: number = 0
): Promise<number> {
  const model = await getModelWithPricing(modelId);
  if (!model) {
    // Fallback pricing for unknown models (with margin already considered)
    const margin = 1 + getProfitMargin();
    return ((inputTokens * 0.001 + outputTokens * 0.002) / 1000) * margin;
  }

  // Prices are per 1M tokens, convert to actual cost
  const inputCost = (inputTokens / 1_000_000) * model.inputPricePerMillion;
  const outputCost = (outputTokens / 1_000_000) * model.outputPricePerMillion;
  const reasoningCost = (reasoningTokens / 1_000_000) * model.reasoningPricePerMillion;

  return inputCost + outputCost + reasoningCost;
}

/**
 * Forces a refresh of the cached models
 */
export async function refreshModelsCache(): Promise<ModelWithPricing[]> {
  const allModels = await fetchModelsFromApi();
  const curatedModels = allModels
    .filter((m) => CURATED_MODEL_IDS.includes(m.id) && modelSupportsTools(m))
    .map(transformModel)
    .sort((a, b) => {
      const aIndex = CURATED_MODEL_IDS.indexOf(a.id);
      const bIndex = CURATED_MODEL_IDS.indexOf(b.id);
      return aIndex - bIndex;
    });

  await setCache(CACHE_KEY, curatedModels, CACHE_TTL_SECONDS);
  return curatedModels;
}

/**
 * Format price for display (e.g., "$3.00" or "$0.15")
 */
export function formatPrice(pricePerMillion: number): string {
  if (pricePerMillion === 0) return "Free";
  if (pricePerMillion < 0.01) return `$${pricePerMillion.toFixed(4)}`;
  if (pricePerMillion < 1) return `$${pricePerMillion.toFixed(2)}`;
  return `$${pricePerMillion.toFixed(2)}`;
}
