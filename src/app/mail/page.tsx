"use client";

import { Button } from "@/components/ui/button";
import { getMailAccounts } from "@/modules/mail/actions";
import { MailList } from "@/modules/mail/components/mail-list";
import { AccountTabs } from "@/modules/mail/components/account-tabs";
import { BulkActionBar } from "@/modules/mail/components/bulk-action-bar";
import type { MailMessage, MailAccount, BulkActionType } from "@/modules/mail/types";
import { Mail, Settings } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

/**
 * Mail Page (Client Component)
 * Displays emails with unified inbox and bulk actions
 */
export default function MailPageClient() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load accounts on mount
  useEffect(() => {
    async function loadAccounts() {
      const result = await getMailAccounts();
      if (result.accounts && result.accounts.length > 0) {
        setAccounts(result.accounts);
        setActiveAccountId(result.accounts[0].id);
      }
      setLoading(false);
    }
    loadAccounts();
  }, []);

  // Load messages when account changes
  useEffect(() => {
    async function loadMessages() {
      if (!activeAccountId) {
        setMessages([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/mail/messages?accountId=${activeAccountId}`);
        const data = await response.json();
        setMessages(data.messages || []);
      } catch (error) {
        console.error("Error loading messages:", error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    }
    loadMessages();
  }, [activeAccountId]);

  const handleBulkAction = async (action: BulkActionType) => {
    if (!activeAccountId || selectedIds.length === 0) return;

    try {
      const response = await fetch("/api/mail/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: activeAccountId,
          messageIds: selectedIds,
          action,
        }),
      });

      if (response.ok) {
        // Reload messages
        const messagesResponse = await fetch(`/api/mail/messages?accountId=${activeAccountId}`);
        const data = await messagesResponse.json();
        setMessages(data.messages || []);
        setSelectedIds([]);
      }
    } catch (error) {
      console.error("Error performing bulk action:", error);
    }
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mail</h1>
            <p className="text-muted-foreground">Loading accounts...</p>
          </div>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mail</h1>
            <p className="text-muted-foreground">No mail accounts configured</p>
          </div>
          <Button asChild>
            <Link href="/mail/settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
        <div className="text-center py-12">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            Get started by adding your first mail account
          </p>
          <Button variant="outline" asChild>
            <Link href="/mail/settings">Add Account</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mail</h1>
          <p className="text-muted-foreground">
            View and manage your emails
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/mail/settings">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </Button>
      </div>

      <AccountTabs
        accounts={accounts}
        activeAccountId={activeAccountId}
        onSelectAccount={setActiveAccountId}
      />

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          </div>
        ) : (
          <MailList messages={messages} />
        )}
      </div>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onAction={handleBulkAction}
        onClearSelection={() => setSelectedIds([])}
      />
    </div>
  );
}
