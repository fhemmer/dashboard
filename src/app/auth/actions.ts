"use server";

import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirect("/login?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    const userFriendlyMessage = getSignUpErrorMessage(error.message);
    return redirect("/signup?error=" + encodeURIComponent(userFriendlyMessage));
  }

  return redirect("/login?message=" + encodeURIComponent("Check your email to confirm your account."));
}

function getSignUpErrorMessage(errorMessage: string): string {
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes("email") && lowerMessage.includes("confirmation")) {
    return "Unable to send confirmation email. Please try again later or contact support.";
  }
  if (lowerMessage.includes("already registered") || lowerMessage.includes("already been registered")) {
    return "This email is already registered. Try logging in instead.";
  }
  if (lowerMessage.includes("password") && lowerMessage.includes("weak")) {
    return "Password is too weak. Use at least 6 characters with a mix of letters and numbers.";
  }
  if (lowerMessage.includes("invalid email")) {
    return "Please enter a valid email address.";
  }
  if (lowerMessage.includes("rate limit") || lowerMessage.includes("too many")) {
    return "Too many signup attempts. Please wait a few minutes and try again.";
  }

  return errorMessage;
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
