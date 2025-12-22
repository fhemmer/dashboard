import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getGitHubAccounts } from "@/modules/github-prs";
import { Github, Settings } from "lucide-react";
import { redirect } from "next/navigation";
import { GitHubAccountsList } from "./github-accounts-list";

export default async function GitHubAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const accounts = await getGitHubAccounts();

  // Build GitHub OAuth URL
  const githubAuthUrl = new URL("https://github.com/login/oauth/authorize");
  githubAuthUrl.searchParams.set("client_id", process.env.GITHUB_DASHBOARD_CLIENT_ID ?? "");
  githubAuthUrl.searchParams.set(
    "redirect_uri",
    `${env.NEXT_PUBLIC_SITE_URL}/auth/github/callback`
  );
  githubAuthUrl.searchParams.set("scope", "repo read:user");

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-muted-foreground" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">GitHub Accounts</h1>
          <p className="text-muted-foreground">
            Manage your connected GitHub accounts
          </p>
        </div>
      </div>

      {params.error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive font-medium">
            Failed to connect GitHub account
          </p>
          <p className="text-sm text-destructive/80 mt-1">
            Error: {params.error}
          </p>
        </div>
      )}

      {params.success === "connected" && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
          <p className="text-sm text-green-600 dark:text-green-400 font-medium">
            GitHub account connected successfully!
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Your GitHub accounts linked to this dashboard. You can connect
            multiple accounts (e.g., personal and work).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No GitHub accounts connected yet
            </p>
          ) : (
            <GitHubAccountsList accounts={accounts} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connect New Account</CardTitle>
          <CardDescription>
            Link another GitHub account to see pull requests from different
            organizations or personal projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href={githubAuthUrl.toString()}>
              <Github className="mr-2 h-4 w-4" />
              Connect GitHub Account
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
