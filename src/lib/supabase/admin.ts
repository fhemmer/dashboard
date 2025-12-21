import { createClient } from "@supabase/supabase-js";
import { env, getServerEnv } from "../env";
import type { Database } from "./database.types";

export const supabaseAdmin = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
  getServerEnv().SUPABASE_SECRET_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
