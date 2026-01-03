# Project Protocol: Dashboard

This project follows the **StackProbe** protocol. All agents and contributors must adhere to these standards.

## Quality Standards
- **Clean Lint Requirement**: ALL changes must result in a clean `bun lint` result. No code should be committed unless linting passes with zero errors and zero warnings.
- **Test Coverage Requirement**: ALL changes must result in a clean `bun test:coverage` result. No code should be committed unless test coverage passes the 90% threshold for statements, branches, functions, and lines.
- **Type Safety**: Strict TypeScript mode is enabled. No `any` types allowed (except in test mocks where unavoidable).
- **Pre-Commit Validation**: Run `bun check` before committing. This runs lint, typecheck, and tests in sequence.

## Build Scripts
| Script | Command | Purpose |
|--------|---------|---------|
| `bun dev` | `next dev --port 5001` | **Dev server runs on port 5001** (NOT the default 3000) |
| `bun check` | `lint && typecheck && test:run` | **Run before every commit** - validates all quality gates |
| `bun lint` | `eslint` | ESLint + SonarQube rules |
| `bun typecheck` | `tsc --noEmit` | TypeScript type checking |
| `bun test:run` | `vitest run` | Run tests once |
| `bun test:coverage` | `vitest run --coverage` | Tests with 90% coverage requirement |

## Visual System: "Finesse"
- **Theme**: Mesh/Grid/Glass aesthetic.
- **Colors**: OKLCH-based color system.
- **Components**: shadcn/ui (Tailwind CSS 4).
- **Layout**: Responsive, mobile-first, with subtle glassmorphism effects.
- **Theming**: Multiple theme palettes (default, ocean, forest, sunset) with light/dark mode support. See `.claude/skills/theming/SKILL.md` for expert guidance on creating and modifying themes.
- **Debugging**: For visual/UI debugging issues, use the `.claude/skills/frontend-debugging/SKILL.md` skill with browser DevTools to inspect computed styles and spacing.

## Tech Stack
- **Runtime**: Bun
- **Frontend**: Next.js 16+ (App Router)
- **Database/Auth**: Supabase Cloud (@supabase/ssr)
- **Email**: Resend (SMTP provider, account linked to fphemmer@gmail.com, API key in `RESEND_API_KEY`)
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

## Database Queries
- **Use `db.ps1`**: For ad-hoc database queries, use the `.\db.ps1` PowerShell script at the project root.
- **Syntax**: `.\db.ps1 "select * from tablename"` or `.\db.ps1 "tablename"` for simple selects.
- **Auth Users**: Use `.\db.ps1 "select * from auth.users"` to query the auth schema (uses Supabase Admin API).
- **Do NOT** use `npx supabase sql` or `supabase db execute` — these commands don't exist.

## Database Migrations
- **Push Migrations**: Use `npx supabase db push --yes` to push migrations non-interactively.
- **Generate Types**: Run `bun db:types` after schema changes to regenerate `src/lib/supabase/database.types.ts`.

## Subscription Tiers & Cost Management

The Dashboard uses a tiered subscription system to manage AI feature costs (Chat & Agent modules).

### Tier Structure
| Tier | Price | Monthly Credit | Notes |
|------|-------|----------------|-------|
| **Free** | $0 | $1.00 | New users get 7-day trial with $10 credit |
| **Pro** | $10/mo | $15.00 | — |
| **Pro+** | $20/mo | $35.00 | — |

### Cost Enforcement Rules
- **Credits do NOT roll over** month-to-month
- **When credits exhausted**:
  - Paid models (Claude, GPT-4, etc.) → **Blocked** with upgrade prompt
  - Free models (Llama 3.3:free, DeepSeek R1:free, etc.) → **Always available**
- **Profit margin**: 10% applied to OpenRouter pricing (configurable via `OPENROUTER_PROFIT_MARGIN`)

### Related Tables
- `subscriptions` - User tier and Stripe subscription info
- `user_credits` - Current credit balance (in cents) and trial expiry
- `credit_transactions` - Audit trail of all credit changes
- `chat_costs` - Per-message cost tracking with `total_chat_spent` on profiles

### Implementation Reference
See [GitHub Issue #18](https://github.com/HemSoft/dashboard/issues/18) for full implementation details.

## Module Architecture

Dashboard features are organized as **Modules**. Each module provides both a **Widget** (compact dashboard card) and a **Page** (full-screen view).

### Vocabulary
| Term | Definition |
|------|------------|
| **Widget** | Compact dashboard component showing summarized data |
| **Page** | Dedicated route with full feature experience |
| **Insight** | Informational module (read-only) |
| **Action** | Utility module (interactive/mutating) |
| **Module** | Complete feature encompassing widget + page |

### Module Structure
```
src/modules/<module-name>/
  components/           # Module-specific components
    <name>-widget.tsx   # Widget for dashboard
  page.tsx              # Full page component
  actions.ts            # Server actions
  types.ts              # TypeScript types
```

See `VISION.md` for the full roadmap.

## Agentic Workflow
- **Plan-First**: Always present a plan before making modifications.
- **Consent**: Wait for explicit user approval before executing non-trivial tool calls.
- **Non-Interactive**: Use non-interactive flags for all CLI commands (e.g., `--yes`, `supabase db push --yes`).
- **Frontend Verification**: After ANY frontend change, use Playwright (`mcp_playwright_mc_browser_*` tools) to visually verify the changes work correctly. Navigate to the affected page, take a snapshot, and confirm the UI renders as expected.
