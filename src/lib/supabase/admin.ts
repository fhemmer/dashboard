import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env, getServerEnv } from "../env";
import type { Database } from "./database.types";

let _supabaseAdmin: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (_supabaseAdmin === null) {
    _supabaseAdmin = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
      getServerEnv().SUPABASE_SECRET_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return _supabaseAdmin;
}

// Alias for backwards compatibility - calls getSupabaseAdmin() lazily
export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    return (getSupabaseAdmin() as Record<string, unknown>)[prop as string];
  },
});
