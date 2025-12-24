"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fetchAllNews } from "./lib/fetcher";
import type { FetchNewsResult } from "./types";

export async function fetchNews(): Promise<FetchNewsResult> {
  return fetchAllNews();
}

export async function revalidateNews(): Promise<void> {
  revalidatePath("/news");
}

export async function getNewsLastSeenAt(): Promise<Date | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select("news_last_seen_at")
    .eq("id", user.id)
    .single();

  return data?.news_last_seen_at ? new Date(data.news_last_seen_at) : null;
}

export async function markNewsAsRead(): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ news_last_seen_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to mark news as read:", error);
    return { success: false };
  }

  revalidatePath("/news");
  return { success: true };
}
