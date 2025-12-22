import { env } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fetchGitHubUser } from "@/modules/github-prs/lib/github-client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const redirectUrl = new URL("/account/github", env.NEXT_PUBLIC_SITE_URL);

  // Handle OAuth errors
  if (error) {
    redirectUrl.searchParams.set("error", error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    redirectUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(redirectUrl);
  }

  // Verify user is authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirectUrl.searchParams.set("error", "not_authenticated");
    return NextResponse.redirect(redirectUrl);
  }

  // Exchange code for access token
  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_DASHBOARD_CLIENT_ID,
        client_secret: process.env.GITHUB_DASHBOARD_CLIENT_SECRET,
        code,
      }),
    }
  );

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    redirectUrl.searchParams.set("error", tokenData.error);
    return NextResponse.redirect(redirectUrl);
  }

  const accessToken = tokenData.access_token;

  // Fetch GitHub user info
  let githubUser;
  try {
    githubUser = await fetchGitHubUser(accessToken);
  } catch {
    redirectUrl.searchParams.set("error", "github_user_fetch_failed");
    return NextResponse.redirect(redirectUrl);
  }

  // Create/update account record using admin client
  try {
    // Check if account already exists
    const { data: existing } = await supabaseAdmin
      .from("github_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("github_user_id", githubUser.id)
      .single();

    if (existing) {
      // Update existing account
      await supabaseAdmin
        .from("github_accounts")
        .update({
          github_username: githubUser.login,
          avatar_url: githubUser.avatar_url,
          access_token: accessToken,
        })
        .eq("id", existing.id);
    } else {
      // Determine label based on existing accounts
      const { count } = await supabaseAdmin
        .from("github_accounts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const label = count === 0 ? "Personal" : `Account ${(count ?? 0) + 1}`;

      // Insert new account
      await supabaseAdmin.from("github_accounts").insert({
        user_id: user.id,
        github_user_id: githubUser.id,
        github_username: githubUser.login,
        avatar_url: githubUser.avatar_url,
        account_label: label,
        access_token: accessToken,
      });
    }

    redirectUrl.searchParams.set("success", "connected");
    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    console.error("Failed to create GitHub account:", err);
    redirectUrl.searchParams.set("error", "database_error");
    return NextResponse.redirect(redirectUrl);
  }
}
