"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    disconnectGitHubAccount,
    updateAccountLabel,
    type GitHubAccount,
} from "@/modules/github-prs";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState, useTransition } from "react";

interface GitHubAccountsListProps {
  accounts: GitHubAccount[];
}

interface AccountRowProps {
  account: GitHubAccount;
}

function AccountRow({ account }: AccountRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(account.accountLabel);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateAccountLabel(account.id, label);
      if (result.success) {
        setIsEditing(false);
      }
    });
  };

  const handleDisconnect = () => {
    if (confirm(`Disconnect @${account.githubUsername}?`)) {
      startTransition(async () => {
        await disconnectGitHubAccount(account.id);
      });
    }
  };

  return (
    <div className="flex items-center gap-4 py-3 px-2 rounded-lg hover:bg-accent/50 transition-colors">
      <Avatar className="h-10 w-10">
        <AvatarImage src={account.avatarUrl ?? undefined} alt={account.githubUsername} />
        <AvatarFallback>
          {account.githubUsername[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-8 w-40"
              disabled={isPending}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleSave}
              disabled={isPending}
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setLabel(account.accountLabel);
                setIsEditing(false);
              }}
              disabled={isPending}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{account.accountLabel}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        )}
        <p className="text-sm text-muted-foreground truncate">
          @{account.githubUsername}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleDisconnect}
        disabled={isPending}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function GitHubAccountsList({ accounts }: GitHubAccountsListProps) {
  return (
    <div className="divide-y">
      {accounts.map((account) => (
        <AccountRow key={account.id} account={account} />
      ))}
    </div>
  );
}
