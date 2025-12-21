import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
  env.SUPABASE_SECRET_SERVICE_ROLE_KEY
);
