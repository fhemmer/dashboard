import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/modules/mail/lib/rate-limiter";
import { searchGmailMessages } from "@/modules/mail/lib/gmail-client";
import { searchImapMessages } from "@/modules/mail/lib/imap-client";
import { searchOutlookMessages } from "@/modules/mail/lib/outlook-client";
import type { MailProvider, SearchRequest } from "@/modules/mail/types";
import { NextResponse } from "next/server";

/**
 * POST /api/mail/search
 * Searches messages using provider-side search capabilities
 */
export async function POST(request: Request) {
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

    // Parse request body
    const body: SearchRequest = await request.json();
    const { accountId, query, folder, maxResults } = body;

    if (!accountId || !query) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Rate limiting
    const rateLimitKey = `mail:search:${user.id}:${accountId}`;
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

    // Perform search based on provider
    const provider = account.provider as MailProvider;
    let result;

    switch (provider) {
      case "outlook":
        result = await searchOutlookMessages({ accountId, query, folder, maxResults });
        break;
      case "gmail":
        result = await searchGmailMessages({ accountId, query, folder, maxResults });
        break;
      case "imap":
        result = await searchImapMessages({ accountId, query, folder, maxResults });
        break;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/mail/search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
