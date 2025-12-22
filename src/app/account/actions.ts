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
