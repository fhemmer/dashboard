import { createClient } from "@/lib/supabase/server";
import { storeAccountCredentials } from "@/modules/mail/actions";
import { NextResponse } from "next/server";

interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

/**
 * GET /api/mail/oauth/callback?code={code}&state={state}&provider={provider}
 * Handles OAuth callback from Gmail/Outlook
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL("/login?error=not_authenticated", request.url)
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const provider = searchParams.get("provider");

    if (!code || !state || !provider) {
      return NextResponse.redirect(
        new URL("/mail/settings?error=missing_parameters", request.url)
      );
    }

    // Validate provider
    if (provider !== "outlook" && provider !== "gmail") {
      return NextResponse.redirect(
        new URL("/mail/settings?error=invalid_provider", request.url)
      );
    }

    // Decode state (should contain accountId)
    let accountId: string;
    try {
      const stateData = JSON.parse(Buffer.from(state, "base64").toString());
      accountId = stateData.accountId;
    } catch {
      return NextResponse.redirect(
        new URL("/mail/settings?error=invalid_state", request.url)
      );
    }

    // Verify account ownership
    const { data: account, error: accountError } = await supabase
      .from("mail_account_settings")
      .select("id")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.redirect(
        new URL("/mail/settings?error=account_not_found", request.url)
      );
    }

    // Exchange authorization code for tokens
    const callbackBaseUrl = new URL(request.url).origin;
    let tokenEndpoint: string;
    let tokenParams: URLSearchParams;

    if (provider === "gmail") {
      tokenEndpoint = "https://oauth2.googleapis.com/token";
      tokenParams = new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri:
          process.env.GOOGLE_REDIRECT_URI ??
          `${callbackBaseUrl}/api/mail/oauth/callback?provider=gmail`,
        grant_type: "authorization_code",
      });
    } else {
      tokenEndpoint =
        "https://login.microsoftonline.com/common/oauth2/v2.0/token";
      tokenParams = new URLSearchParams({
        code,
        client_id: process.env.OUTLOOK_CLIENT_ID ?? "",
        client_secret: process.env.OUTLOOK_CLIENT_SECRET ?? "",
        redirect_uri:
          process.env.OUTLOOK_REDIRECT_URI ??
          `${callbackBaseUrl}/api/mail/oauth/callback?provider=outlook`,
        grant_type: "authorization_code",
      });
    }

    // Perform token exchange with the provider
    const tokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(
        new URL(
          `/mail/settings?error=${encodeURIComponent("token_exchange_failed")}`,
          request.url
        )
      );
    }

    const tokenData = (await tokenResponse.json()) as OAuthTokenResponse;

    if (!tokenData.access_token || !tokenData.refresh_token) {
      return NextResponse.redirect(
        new URL(
          `/mail/settings?error=${encodeURIComponent("invalid_token_response")}`,
          request.url
        )
      );
    }

    const expiresInSeconds =
      typeof tokenData.expires_in === "number" && tokenData.expires_in > 0
        ? tokenData.expires_in
        : 3600;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const result = await storeAccountCredentials(
      accountId,
      tokenData.access_token,
      tokenData.refresh_token,
      expiresAt
    );

    if (!result.success) {
      return NextResponse.redirect(
        new URL(`/mail/settings?error=${encodeURIComponent(result.error || "token_storage_failed")}`, request.url)
      );
    }

    // Success - redirect to settings page
    return NextResponse.redirect(
      new URL("/mail/settings?success=account_connected", request.url)
    );
  } catch (error) {
    console.error("Error in /api/mail/oauth/callback:", error);
    return NextResponse.redirect(
      new URL("/mail/settings?error=internal_error", request.url)
    );
  }
}
