import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, GitPullRequest } from "lucide-react";
import Link from "next/link";
import { getPullRequests } from "../actions";
import { PRTree } from "./pr-tree";

export async function PRWidget() {
  const { accounts, errors } = await getPullRequests();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-start gap-2">
          <GitPullRequest className="h-4 w-4 text-muted-foreground mt-1" />
          <div>
            <CardTitle>Pull Requests</CardTitle>
            <CardDescription className="text-xs">GitHub PRs across your accounts</CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/prs">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {errors.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-destructive mb-4">
            <AlertTriangle className="h-4 w-4" />
            <span>{errors.length} account(s) failed to load</span>
          </div>
        )}
        {accounts.length === 0 && errors.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              No GitHub accounts connected
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/account/github">Connect Account</Link>
            </Button>
          </div>
        ) : (
          <PRTree accounts={accounts} defaultExpanded={false} />
        )}
      </CardContent>
    </Card>
  );
}
