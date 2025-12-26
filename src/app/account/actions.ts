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
  const fgBrightnessLight = formData.get("fgBrightnessLight") as string;
  const bgBrightnessLight = formData.get("bgBrightnessLight") as string;
  const fgBrightnessDark = formData.get("fgBrightnessDark") as string;
  const bgBrightnessDark = formData.get("bgBrightnessDark") as string;

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
      fg_brightness_light: fgBrightnessLight ? parseFloat(fgBrightnessLight) : 100,
      bg_brightness_light: bgBrightnessLight ? parseFloat(bgBrightnessLight) : 100,
      fg_brightness_dark: fgBrightnessDark ? parseFloat(fgBrightnessDark) : 100,
      bg_brightness_dark: bgBrightnessDark ? parseFloat(bgBrightnessDark) : 100,
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

  // Require current password to be provided
  if (!currentPassword) {
    return redirect("/account?error=" + encodeURIComponent("Current password is required."));
  }

  // Validate new password confirmation
  if (newPassword !== confirmNewPassword) {
    return redirect("/account?error=" + encodeURIComponent("New passwords do not match."));
  }

  // Validate new password strength: at least 6 characters, including letters and numbers
  const passwordIsValid = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(newPassword);
  if (!passwordIsValid) {
    return redirect(
      "/account?error=" +
        encodeURIComponent("New password must be at least 6 characters and include letters and numbers.")
    );
  }

  // Update password using the existing authenticated session
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return redirect("/account?error=" + encodeURIComponent(updateError.message));
  }

  revalidatePath("/", "layout");
  redirect("/account?success=true");
}
