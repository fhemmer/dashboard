import { BrightnessControls } from "@/components/brightness-controls";
import { FontPicker } from "@/components/font-picker";
import { ThemePicker } from "@/components/theme-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { getUserChatSpending } from "@/modules/chat/actions";
import {
    AdminSettingsForm,
    getCurrentUserRole,
    getSystemSettings,
} from "@/modules/news-sources";
import { ArrowLeft, Bot, Check } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { changePassword, getProfile, updateProfile } from "./actions";

export default async function AccountPage({
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

  const profile = await getProfile();
  const params = await searchParams;
  const role = await getCurrentUserRole();
  const isAdmin = role === "admin";
  const chatSpending = await getUserChatSpending();

  // Fetch system settings for admin users
  const systemSettings = isAdmin ? await getSystemSettings() : null;

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your profile and preferences.
          </p>
        </div>
      </div>

      {params.error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {params.error}
        </div>
      )}

      {params.success && (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
          <Check className="h-4 w-4" />
          Settings saved successfully.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your display name and preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Your email cannot be changed.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">
                Display Name
              </label>
              <Input
                id="displayName"
                name="displayName"
                placeholder="Enter your display name..."
                defaultValue={profile?.display_name || ""}
              />
              <p className="text-xs text-muted-foreground">
                This is how your name will appear in the sidebar.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="theme" className="text-sm font-medium">
                Theme
              </label>
              <ThemePicker defaultValue={profile?.theme} />
              <p className="text-xs text-muted-foreground">
                Choose your preferred color palette. Works with both light and dark modes.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="font" className="text-sm font-medium">
                Font
              </label>
              <FontPicker defaultValue={profile?.font} />
              <p className="text-xs text-muted-foreground">
                Choose your preferred typeface for the interface.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Color Brightness
              </label>
              <BrightnessControls
                defaultValues={{
                  fgLight: profile?.fg_brightness_light ?? 100,
                  bgLight: profile?.bg_brightness_light ?? 100,
                  fgDark: profile?.fg_brightness_dark ?? 100,
                  bgDark: profile?.bg_brightness_dark ?? 100,
                }}
              />
              <p className="text-xs text-muted-foreground">
                Adjust foreground and background brightness for light and dark modes.
              </p>
            </div>

            <Button type="submit">Save Changes</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-muted-foreground" />
            <CardTitle>AI Usage</CardTitle>
          </div>
          <CardDescription>Your AI chat consumption and spending.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Total Spent</p>
            <p className="text-3xl font-bold">
              ${chatSpending.totalSpent.toFixed(4)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Accumulated from all AI chat conversations
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="flex-1">
              <Link href="/chat">View Chats</Link>
            </Button>
            <Button variant="outline" asChild className="flex-1">
              <Link href="/chat/new">New Chat</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={changePassword} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="currentPassword" className="text-sm font-medium">
                Current Password
              </label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="newPassword" className="text-sm font-medium">
                New Password
              </label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                aria-describedby="newPasswordHint"
              />
              <p id="newPasswordHint" className="text-xs text-muted-foreground">
                Use at least 6 characters with a mix of letters and numbers.
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirmNewPassword" className="text-sm font-medium">
                Confirm New Password
              </label>
              <Input
                id="confirmNewPassword"
                name="confirmNewPassword"
                type="password"
                required
              />
            </div>

            <Button type="submit">Change Password</Button>
          </form>
        </CardContent>
      </Card>

      {isAdmin && systemSettings && !systemSettings.error && (
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>
              Configure news fetching and notification retention (admin only).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminSettingsForm
              fetchIntervalMinutes={systemSettings.fetchIntervalMinutes}
              notificationRetentionDays={systemSettings.notificationRetentionDays}
              lastFetchAt={systemSettings.lastFetchAt}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
