import { z } from "zod";

// Client-safe env vars (can be used in browser)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_PROJECT_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional().default("http://localhost:5001"),
});

export const env = clientEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_PROJECT_URL: process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

// Server-only env vars (lazy-loaded to avoid client-side errors)
const serverEnvSchema = z.object({
  SUPABASE_SECRET_SERVICE_ROLE_KEY: z.string().min(1),
});

let _serverEnv: z.infer<typeof serverEnvSchema> | null = null;

export function getServerEnv() {
  if (_serverEnv === null) {
    _serverEnv = serverEnvSchema.parse({
      SUPABASE_SECRET_SERVICE_ROLE_KEY: process.env.SUPABASE_SECRET_SERVICE_ROLE_KEY,
    });
  }
  return _serverEnv;
}
