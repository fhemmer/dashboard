import { createClient } from "@/lib/supabase/server";
import { getCachedMessages, cacheMessages } from "@/modules/mail/lib/cache";
import { checkRateLimit } from "@/modules/mail/lib/rate-limiter";
import { getGmailMessages } from "@/modules/mail/lib/gmail-client";
import { getImapMessages } from "@/modules/mail/lib/imap-client";
import { getOutlookMessages } from "@/modules/mail/lib/outlook-client";
import type { MailProvider } from "@/modules/mail/types";
import { NextResponse } from "next/server";

/**
 * GET /api/mail/messages?accountId={id}&folder={folder}&maxResults={num}
 * Returns messages for a specific account and folder
 * Cached for 5 minutes
 */
export async function GET(request: Request) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const folder = searchParams.get("folder") || "inbox";
    const maxResults = Number.parseInt(searchParams.get("maxResults") || "50", 10);

    if (!accountId) {
      return NextResponse.json(
        { error: "Missing accountId parameter" },
        { status: 400 }
      );
    }

    // Rate limiting
    const rateLimitKey = `mail:messages:${user.id}:${accountId}`;
    const rateLimit = checkRateLimit(rateLimitKey);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // Verify account ownership
    const { data: account, error: accountError } = await supabase
      .from("mail_account_settings")
      .select("provider")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { error: "Account not found or access denied" },
        { status: 404 }
      );
    }

    // Try cache first
    const cached = await getCachedMessages(accountId, folder);
    if (cached) {
      return NextResponse.json({
        messages: cached,
        hasMore: false,
      });
    }

    // Fetch fresh data based on provider
    let messages = [];
    const provider = account.provider as MailProvider;

    switch (provider) {
      case "outlook":
        messages = await getOutlookMessages(accountId, folder, maxResults);
        break;
      case "gmail":
        messages = await getGmailMessages(accountId, folder, maxResults);
        break;
      case "imap":
        messages = await getImapMessages(accountId, folder, maxResults);
        break;
    }

    // Cache the result
    await cacheMessages(accountId, folder, messages);

    return NextResponse.json({
      messages,
      hasMore: messages.length >= maxResults,
    });
  } catch (error) {
    console.error("Error in /api/mail/messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
