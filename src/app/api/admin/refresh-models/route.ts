import { NextResponse } from "next/server";

import { refreshModelsCache } from "@/lib/openrouter/models";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/refresh-models
 * Forces a refresh of the cached OpenRouter models.
 * Requires admin authentication.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const models = await refreshModelsCache();
    return NextResponse.json({
      success: true,
      modelsCount: models.length,
      freeModels: models.filter((m) => m.isFree).map((m) => ({ id: m.id, isFree: m.isFree })),
    });
  } catch (error) {
    console.error("Failed to refresh models cache:", error);
    return NextResponse.json({ error: "Failed to refresh cache" }, { status: 500 });
  }
}
