import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchNews } from "@/lib/news-fetcher";

/**
 * POST /api/cron/fetch-news
 * Triggered by GitHub Actions to fetch news from all active sources.
 * Secured with CRON_SECRET header.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const cronSecret = getServerEnv().CRON_SECRET;

    if (!cronSecret) {
      return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run the news fetcher
    const supabase = getSupabaseAdmin();
    const result = await fetchNews(supabase);

    // Return result
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error("Fetch news cron error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/fetch-news
 * Health check endpoint.
 */
export async function GET(): Promise<Response> {
  return NextResponse.json({ status: "ok", endpoint: "fetch-news" });
}
