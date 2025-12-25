"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createMailAccount,
  deleteMailAccount,
  getMailAccounts,
  updateMailAccount,
} from "@/modules/mail/actions";
import { AccountCard } from "@/modules/mail/components/account-card";
import type { MailAccount, MailProvider } from "@/modules/mail/types";
import { AlertCircle, ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

/**
 * Mail Settings Page
 * Manage mail accounts and configurations
 */
export default function MailSettingsPage() {
  const [accounts, setAccounts] = useState<MailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MailAccount | null>(null);

  // Add form state
  const [provider, setProvider] = useState<MailProvider>("gmail");
  const [accountName, setAccountName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [syncFrequency, setSyncFrequency] = useState("5");

  // Load accounts - wrapped in useCallback to prevent infinite loops
  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMailAccounts();
      setAccounts(result.accounts || []);
    } catch (err) {
      console.error("Failed to load mail accounts:", err);
      setError("Failed to load mail accounts. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  async function handleAddAccount() {
    if (!accountName || !emailAddress) {
      setError("Please fill in all required fields");
      return;
    }

    setError(null);
    const result = await createMailAccount({
      provider,
      accountName,
      emailAddress,
      syncFrequencyMinutes: Number.parseInt(syncFrequency, 10),
    });

    if (result.success) {
      setShowAddForm(false);
      setAccountName("");
      setEmailAddress("");
      setSyncFrequency("5");
      loadAccounts();
    } else {
      setError(result.error || "Failed to create account");
    }
  }

  async function handleToggleAccount(account: MailAccount) {
    setError(null);
    const result = await updateMailAccount(account.id, {
      isEnabled: !account.isEnabled,
    });

    if (result.success) {
      loadAccounts();
    } else {
      setError(result.error || "Failed to update account");
    }
  }

  async function handleDeleteAccount(account: MailAccount) {
    setDeleteConfirm(account);
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;

    setError(null);
    const result = await deleteMailAccount(deleteConfirm.id);

    if (result.success) {
      setDeleteConfirm(null);
      loadAccounts();
    } else {
      setError(result.error || "Failed to delete account");
      setDeleteConfirm(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/mail">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Mail Settings</h1>
          <p className="text-muted-foreground">
            Manage your mail accounts and preferences
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showAddForm && (
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Add Mail Account</h2>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select
                value={provider}
                onValueChange={(v) => setProvider(v as MailProvider)}
              >
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">Gmail</SelectItem>
                  <SelectItem value="outlook">Outlook</SelectItem>
                  <SelectItem value="imap">IMAP (hemmer.us)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                placeholder="e.g., Personal Gmail"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailAddress">Email Address</Label>
              <Input
                id="emailAddress"
                type="email"
                placeholder="your@email.com"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="syncFrequency">Sync Frequency (minutes)</Label>
              <Input
                id="syncFrequency"
                type="number"
                min="1"
                value={syncFrequency}
                onChange={(e) => setSyncFrequency(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAddAccount}>Create Account</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Loading accounts...</p>
          </div>
        ) : (
          <>
            {accounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No accounts configured. Click &ldquo;Add Account&rdquo; to get
                  started.
                </p>
              </div>
            ) : (
              accounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onToggle={handleToggleAccount}
                  onDelete={handleDeleteAccount}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.accountName}
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
