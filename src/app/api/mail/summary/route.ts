import { createClient } from "@/lib/supabase/server";
import { getCachedSummary, cacheSummary } from "@/modules/mail/lib/cache";
import { getMailSummary } from "@/modules/mail/actions";
import { NextResponse } from "next/server";

/**
 * GET /api/mail/summary
 * Returns unread counts for all enabled mail accounts
 * Cached for 5 minutes
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Try cache first
    const cached = await getCachedSummary(user.id);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch fresh data
    const summary = await getMailSummary();
    
    // Cache the result
    if (!summary.error) {
      await cacheSummary(user.id, summary);
    }

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error in /api/mail/summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
