# Project Protocol: Dashboard

This project follows the **StackProbe** protocol. All agents and contributors must adhere to these standards.

## Quality Standards
- **Clean Lint Requirement**: ALL changes must result in a clean `bun lint` result. No code should be committed unless linting passes with zero errors and zero warnings.
- **Test Coverage Requirement**: ALL changes must result in a clean `bun test:coverage` result. No code should be committed unless test coverage passes the 100% threshold for statements, branches, functions, and lines.
- **Type Safety**: Strict TypeScript mode is enabled. No `any` types allowed.

## Visual System: "Finesse"
- **Theme**: Mesh/Grid/Glass aesthetic.
- **Colors**: OKLCH-based color system.
- **Components**: shadcn/ui (Tailwind CSS 4).
- **Layout**: Responsive, mobile-first, with subtle glassmorphism effects.
- **Theming**: Multiple theme palettes (default, ocean, forest, sunset) with light/dark mode support. See `.claude/skills/theming/SKILL.md` for expert guidance on creating and modifying themes.

## Tech Stack
- **Runtime**: Bun
- **Frontend**: Next.js 16+ (App Router)
- **Database/Auth**: Supabase Cloud (@supabase/ssr)
- **Deployment**: Vercel

## Authentication Protocol
- **Client Creation**:
  - Use `createClient` from `@/lib/supabase/server` for Server Components, Actions, and Route Handlers.
  - Use `createClient` from `@/lib/supabase/client` for Client Components.
  - Use `supabaseAdmin` from `@/lib/supabase/admin` ONLY for bypass-RLS administrative tasks (Server-side only).
- **Session Management**: Handled via `src/middleware.ts`. Do not remove or bypass unless explicitly required.
- **Route Protection**: Prefer server-side redirects in Server Components or Middleware for protected routes.
- **Authorization**:
  - User roles are stored in the `public.profiles` table.
  - `fphemmer@gmail.com` is the default administrator.
  - Use RLS policies on tables to restrict access based on `auth.uid()` and the `profiles.role` column.

## Database Migrations
- **Push Migrations**: Use `npx supabase db push --yes` to push migrations non-interactively.
- **Generate Types**: Run `bun db:types` after schema changes to regenerate `src/lib/supabase/database.types.ts`.

## Agentic Workflow
- **Plan-First**: Always present a plan before making modifications.
- **Consent**: Wait for explicit user approval before executing non-trivial tool calls.
- **Non-Interactive**: Use non-interactive flags for all CLI commands (e.g., `--yes`, `supabase db push --yes`).
