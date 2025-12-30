/**
 * Inngest API Route
 * Handles Inngest webhook callbacks for background function execution
 */

import { serve } from "inngest/next";

import { allFunctions, inngest } from "@/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: allFunctions,
});
