"use server";

import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type Profile = Tables<"profiles">;

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}

export async function updateProfile(formData: FormData) {
  const displayName = formData.get("displayName") as string;
  const theme = formData.get("theme") as string;
  const font = formData.get("font") as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      theme: theme || "default",
      font: font || "geist",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return redirect("/account?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/", "layout");
  redirect("/account?success=true");
}

export async function updateSidebarWidth(width: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Clamp width to valid range
  const clampedWidth = Math.min(400, Math.max(200, width));

  const { error } = await supabase
    .from("profiles")
    .update({
      sidebar_width: clampedWidth,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  return {};
}

export async function changePassword(formData: FormData) {
  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmNewPassword = formData.get("confirmNewPassword") as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
  }

  if (!user.email) {
    return redirect("/account?error=" + encodeURIComponent("User email not found."));
  }

  // Validate new password confirmation
  if (newPassword !== confirmNewPassword) {
    return redirect("/account?error=" + encodeURIComponent("New passwords do not match."));
  }

  // Verify current password by attempting to sign in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return redirect("/account?error=" + encodeURIComponent("Current password is incorrect."));
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return redirect("/account?error=" + encodeURIComponent(updateError.message));
  }

  revalidatePath("/", "layout");
  redirect("/account?success=true");
}
