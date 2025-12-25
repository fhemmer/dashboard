"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MailAccount } from "../types";
import { getProviderDisplayName } from "../types";
import { Mail, Settings, Trash2 } from "lucide-react";

interface AccountCardProps {
  account: MailAccount;
  onEdit?: (account: MailAccount) => void;
  onDelete?: (account: MailAccount) => void;
  onToggle?: (account: MailAccount) => void;
}

/**
 * Account Card Component
 * Displays a mail account in the settings page
 */
export function AccountCard({
  account,
  onEdit,
  onDelete,
  onToggle,
}: AccountCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-muted-foreground mt-1" />
            <div>
              <CardTitle className="text-lg">{account.accountName}</CardTitle>
              <CardDescription className="text-sm">
                {account.emailAddress}
              </CardDescription>
            </div>
          </div>
          <Badge variant={account.isEnabled ? "default" : "secondary"}>
            {account.isEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">{getProviderDisplayName(account.provider)}</span>
            {" • "}
            <span>Sync every {account.syncFrequencyMinutes} minutes</span>
          </div>
          <div className="flex gap-2">
            {onToggle && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggle(account)}
              >
                {account.isEnabled ? "Disable" : "Enable"}
              </Button>
            )}
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(account)}
              >
                <Settings className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(account)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
