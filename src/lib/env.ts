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
  GITHUB_DASHBOARD_CLIENT_ID: z.string().min(1).optional(),
  GITHUB_DASHBOARD_CLIENT_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
});

let _serverEnv: z.infer<typeof serverEnvSchema> | null = null;

export function getServerEnv() {
  if (_serverEnv === null) {
    _serverEnv = serverEnvSchema.parse({
      SUPABASE_SECRET_SERVICE_ROLE_KEY: process.env.SUPABASE_SECRET_SERVICE_ROLE_KEY,
      GITHUB_DASHBOARD_CLIENT_ID: process.env.GITHUB_DASHBOARD_CLIENT_ID,
      GITHUB_DASHBOARD_CLIENT_SECRET: process.env.GITHUB_DASHBOARD_CLIENT_SECRET,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      CRON_SECRET: process.env.CRON_SECRET,
    });
  }
  return _serverEnv;
}
