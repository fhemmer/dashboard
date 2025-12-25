"use client";

import { Button } from "@/components/ui/button";
import type { MailAccount } from "../types";
import { getProviderDisplayName } from "../types";

interface AccountTabsProps {
  accounts: MailAccount[];
  activeAccountId: string | null;
  onSelectAccount: (accountId: string) => void;
}

/**
 * Account Tabs Component
 * Allows switching between different mail accounts
 */
export function AccountTabs({
  accounts,
  activeAccountId,
  onSelectAccount,
}: AccountTabsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {accounts.map((account) => (
        <Button
          key={account.id}
          variant={activeAccountId === account.id ? "default" : "outline"}
          size="sm"
          onClick={() => onSelectAccount(account.id)}
        >
          {account.accountName}
          <span className="ml-2 text-xs opacity-70">
            ({getProviderDisplayName(account.provider)})
          </span>
        </Button>
      ))}
    </div>
  );
}
