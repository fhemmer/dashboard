import { createClient } from "@/lib/supabase/server";
import { invalidateMessagesCache, invalidateSummaryCache } from "@/modules/mail/lib/cache";
import { checkRateLimit } from "@/modules/mail/lib/rate-limiter";
import { performGmailBulkAction } from "@/modules/mail/lib/gmail-client";
import { performImapBulkAction } from "@/modules/mail/lib/imap-client";
import { performOutlookBulkAction } from "@/modules/mail/lib/outlook-client";
import type { BulkActionRequest, MailProvider } from "@/modules/mail/types";
import { NextResponse } from "next/server";

/**
 * POST /api/mail/bulk-action
 * Performs bulk actions on messages (markRead, markUnread, moveToJunk, delete)
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
    const body: BulkActionRequest = await request.json();
    const { accountId, messageIds, action } = body;

    if (!accountId || !messageIds || messageIds.length === 0 || !action) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Rate limiting
    const rateLimitKey = `mail:bulk-action:${user.id}:${accountId}`;
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

    // Perform bulk action based on provider
    const provider = account.provider as MailProvider;
    let result = { success: false, processedCount: 0 };

    switch (provider) {
      case "outlook":
        result = await performOutlookBulkAction(accountId, messageIds, action);
        break;
      case "gmail":
        result = await performGmailBulkAction(accountId, messageIds, action);
        break;
      case "imap":
        result = await performImapBulkAction(accountId, messageIds, action);
        break;
    }

    // Invalidate caches
    await invalidateMessagesCache(accountId);
    await invalidateSummaryCache(user.id);

    return NextResponse.json({
      success: result.success,
      processedCount: result.processedCount,
      failedCount: messageIds.length - result.processedCount,
    });
  } catch (error) {
    console.error("Error in /api/mail/bulk-action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
