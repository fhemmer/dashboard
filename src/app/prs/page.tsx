import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getPullRequests, PRTree } from "@/modules/github-prs";
import { GitPullRequest, Settings } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function PullRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { accounts, errors } = await getPullRequests();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitPullRequest className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pull Requests</h1>
            <p className="text-muted-foreground">
              View PRs across all your connected GitHub accounts
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/account/github">
            <Settings className="mr-2 h-4 w-4" />
            Manage Accounts
          </Link>
        </Button>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-sm text-destructive font-medium">
            Failed to load {errors.length} account(s)
          </p>
          <ul className="mt-2 text-sm text-destructive/80">
            {errors.map((err) => (
              <li key={err.accountId}>• {err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {accounts.length === 0 && errors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GitPullRequest className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No GitHub accounts connected</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Connect your GitHub accounts to see pull requests that need your
            attention.
          </p>
          <Button asChild>
            <Link href="/account/github">Connect GitHub Account</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-4">
          <PRTree accounts={accounts} defaultExpanded />
        </div>
      )}
    </div>
  );
}
