import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Mail, Settings } from "lucide-react";
import Link from "next/link";
import { getMailSummary } from "../actions";
import { getProviderDisplayName } from "../types";

/**
 * Mail Widget
 * Displays unread email counts per account on the dashboard
 */
export async function MailWidget() {
  const summary = await getMailSummary();

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-start gap-2">
          <Mail className="h-4 w-4 text-muted-foreground mt-1" />
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Mail</CardTitle>
              {summary.totalUnread > 0 && (
                <Badge variant="secondary" className="text-xs tabular-nums">
                  {summary.totalUnread}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Email across all accounts
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/mail/settings" aria-label="Mail settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/mail">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {summary.error && (
          <div className="flex items-center gap-2 text-sm text-destructive mb-4">
            <AlertTriangle className="h-4 w-4" />
            <span>{summary.error}</span>
          </div>
        )}
        {summary.accounts.length === 0 && !summary.error ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              No mail accounts configured
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/mail/settings">Add Account</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {summary.accounts.map((account) => (
              <div
                key={account.accountId}
                className="flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium">{account.accountName}</div>
                    <div className="text-xs text-muted-foreground">
                      {getProviderDisplayName(account.provider)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {account.unreadCount > 0 ? (
                    <Badge variant="default" className="text-xs tabular-nums">
                      {account.unreadCount}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
