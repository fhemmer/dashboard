/**
 * Agent Tools
 * Available tools for the AI agent to use
 */

import { tool } from "ai";
import { z } from "zod";

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilyResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string;
}

async function executeTavilySearch(query: string): Promise<TavilyResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY environment variable is not set");
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 5,
      include_answer: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<TavilyResponse>;
}

export const webSearch = tool({
  description: "Search the web for current information. Use this when you need up-to-date information or facts.",
  inputSchema: z.object({
    query: z.string().describe("The search query to find information about"),
  }),
  execute: async ({ query }) => {
    return executeTavilySearch(query);
  },
});

export const allTools = {
  webSearch,
};
