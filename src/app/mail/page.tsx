"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getMailAccounts } from "@/modules/mail/actions";
import { MailList } from "@/modules/mail/components/mail-list";
import { AccountTabs } from "@/modules/mail/components/account-tabs";
import { BulkActionBar } from "@/modules/mail/components/bulk-action-bar";
import type { MailMessage, MailAccount, BulkActionType } from "@/modules/mail/types";
import { AlertCircle, Loader2, Mail, Settings } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

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
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load accounts on mount with proper cleanup
  useEffect(() => {
    let isCancelled = false;

    async function loadAccounts() {
      try {
        const result = await getMailAccounts();
        if (isCancelled) return;

        if (result.accounts && result.accounts.length > 0) {
          setAccounts(result.accounts);
          setActiveAccountId(result.accounts[0].id);
        }
      } catch (err) {
        if (isCancelled) return;
        console.error("Error loading accounts:", err);
        setError("Failed to load mail accounts.");
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadAccounts();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Load messages when account changes with abort controller
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadMessages() {
      if (!activeAccountId) {
        if (!cancelled) {
          setMessages([]);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setLoading(true);
        setError(null);
      }

      try {
        const response = await fetch(
          `/api/mail/messages?accountId=${activeAccountId}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch messages");
        }

        const data = await response.json();

        if (!cancelled) {
          setMessages(data.messages || []);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Error loading messages:", err);
        if (!cancelled) {
          setError("Failed to load messages. Please try again.");
          setMessages([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeAccountId]);

  // Handle message selection toggle
  const handleSelectMessage = useCallback((messageId: string) => {
    setSelectedIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  }, []);

  const handleBulkAction = async (action: BulkActionType) => {
    if (!activeAccountId || selectedIds.length === 0) return;

    setActionLoading(true);
    setError(null);

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

      if (!response.ok) {
        throw new Error("Failed to perform action");
      }

      // Reload messages
      const messagesResponse = await fetch(
        `/api/mail/messages?accountId=${activeAccountId}`
      );
      const data = await messagesResponse.json();
      setMessages(data.messages || []);
      setSelectedIds([]);
    } catch (err) {
      console.error("Error performing bulk action:", err);
      setError("Failed to perform action. Please try again.");
    } finally {
      setActionLoading(false);
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

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <AccountTabs
        accounts={accounts}
        activeAccountId={activeAccountId}
        onSelectAccount={setActiveAccountId}
      />

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          </div>
        ) : (
          <MailList
            messages={messages}
            selectedIds={selectedIds}
            onSelectMessage={handleSelectMessage}
          />
        )}
      </div>

      <BulkActionBar
        selectedCount={selectedIds.length}
        onAction={handleBulkAction}
        onClearSelection={() => setSelectedIds([])}
        loading={actionLoading}
      />
    </div>
  );
}
