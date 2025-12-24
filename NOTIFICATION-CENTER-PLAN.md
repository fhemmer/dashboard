# Notification Center + News System Overhaul

A unified notification system with database-backed news, role-based source management, batched notifications, and extensible types. External PowerShell script handles fetching with configurable retention cleanup. Source branding stored in database for full admin control.

## Database Schema

```
system_settings: key (PK), value (jsonb), updated_at
news_sources: id, url, name, category, icon_name, brand_color, is_active, created_by (FK profiles), created_at
news_items: id, source_id (FK), title, summary, link, image_url, published_at, guid_hash (unique), created_at
user_news_source_exclusions: user_id (FK), source_id (FK), created_at [composite PK]
notifications: id, user_id (FK), type, title, message, metadata (jsonb), created_at
```

## Implementation Steps

### Step 1: Database Migrations + Seed Data ✅ COMPLETE
- [x] Create `system_settings` table (key/value for fetch_interval_minutes default 30, notification_retention_days default 30, last_fetch_at)
- [x] Create `news_sources` table (url, name, category, icon_name, brand_color, is_active, created_by FK profiles, created_at)
- [x] Create `news_items` table (source_id FK, title, summary, link, image_url, published_at, guid_hash unique, created_at)
- [x] Create `user_news_source_exclusions` table (user_id FK, source_id FK, composite PK)
- [x] Create `notifications` table (id, user_id FK, type text, title, message, metadata jsonb, created_at)
- [x] Seed 9 existing RSS sources with icons/colors from sources.ts
- [x] Add `news_manager` to profiles role constraint
- [x] Set up RLS policies for all tables

**Migration file:** `supabase/migrations/00019_notification_center.sql`

### Step 2: Notifications Module ✅ COMPLETE
- [x] Create `src/modules/notifications/types.ts` with NotificationType enum (news, pr, expenditure, system)
- [x] Create `src/modules/notifications/actions.ts` with getNotifications, getUnreadCount, dismissNotification, dismissAll
- [x] Create `src/modules/notifications/components/notification-item.tsx`
- [x] Create `src/modules/notifications/components/notification-bell.tsx` (count badge + 10-item dropdown + "View all")
- [x] Create `src/modules/notifications/components/notification-bell-wrapper.tsx` (client wrapper with optimistic updates)
- [x] Create `src/modules/notifications/components/notification-bell-server.tsx` (server component for data fetching)
- [x] Create `src/modules/notifications/components/notification-list.tsx`
- [x] Create `src/modules/notifications/index.ts` barrel export
- [x] Create `src/app/notifications/page.tsx` full notifications page
- [x] Integrate NotificationBell into header.tsx next to user menu
- [x] Write tests for all components and actions (100% coverage)

### Step 3: News Source Management ✅ COMPLETE
- [x] Create `src/modules/news-sources/types.ts`
- [x] Create `src/modules/news-sources/actions.ts` with CRUD (admin: full, news_manager: own only)
- [x] Create `src/modules/news-sources/components/source-list.tsx`
- [x] Create `src/modules/news-sources/components/source-form.tsx` with icon picker + color picker
- [x] Create `src/modules/news-sources/components/category-badge.tsx`
- [x] Create `src/modules/news-sources/components/admin-settings-form.tsx`
- [x] Create `src/modules/news-sources/index.ts` barrel export
- [x] Create `src/app/news-sources/page.tsx` with role guard
- [x] Add admin settings UI for fetch interval + retention in account page
- [x] Write tests for all components and actions (100% coverage)

### Step 4: News Fetcher (GitHub Actions) ✅ COMPLETE
- [x] Create `.github/workflows/fetch-news.yml` scheduled workflow (every 15 min)
- [x] Create `src/lib/news-fetcher/index.ts` core fetcher logic:
  - Reads settings from system_settings
  - Fetches all active news_sources
  - Parses RSS feeds (RSS 2.0 + Atom support)
  - Upserts news_items by guid_hash (deduplication)
  - Creates batched notifications per source per subscribed user
  - Deletes notifications older than retention_days
  - Updates last_fetch_at timestamp
- [x] Create `src/app/api/cron/fetch-news/route.ts` API endpoint (secured with CRON_SECRET)
- [x] Write tests for fetcher logic (100% coverage)

### Step 5: Refactor News Module
- [ ] Update `src/modules/news/types.ts` to match new DB schema
- [ ] Update `src/modules/news/actions.ts` to query news_items joined with news_sources
- [ ] Update `src/modules/news/components/news-widget.tsx` to use DB data + dynamic branding
- [ ] Update `src/modules/news/components/news-item.tsx` to use source record for branding
- [ ] Update `src/app/news/page.tsx` to use new data source
- [ ] Add source exclusion toggles (user preferences)
- [ ] Delete deprecated files:
  - `src/modules/news/lib/fetcher.ts`
  - `src/modules/news/lib/rss-parser.ts`
  - `src/modules/news/lib/sources.ts`
  - `src/modules/news/lib/source-branding.tsx`
- [ ] Update tests for refactored components

### Step 6: Extend Notification Types
- [ ] Add notification creation to `github-prs` for PR merges/comments
- [ ] Add notification creation to `expenditures` for budget threshold alerts
- [ ] Add system announcement capability for admins
- [ ] Update NotificationItem to render different types with appropriate icons/styling

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Notification storage | Option C: Unified notifications table | Single source of truth for bell icon, one query for dropdown |
| User source subscription | Opt-out model | Better discovery, users see all sources by default |
| Notification batching | Batched per source | "5 new items from Hacker News" reduces noise |
| Notifications lifecycle | Ephemeral (deleted on dismiss) | Simpler, no need for read/unread state |
| Fetcher execution | GitHub Actions cron | Public repo = unlimited free minutes, runs every 15 min |
| Supabase access for fetcher | Service role key | Stored as GitHub secret, bypass RLS for cron job |
| Source branding | Stored in database (icon_name, brand_color) | Full admin control without code changes |
| News sources page location | `/news-sources` with role guard | Both admin and news_manager access, simpler routing |
| Notification dropdown limit | 10 most recent | Balance between usefulness and performance |
| Notification retention | Configurable (default 30 days) | Prevents unbounded growth, admin-controlled |

## Roles

| Role | News Sources | Notifications | System Settings |
|------|--------------|---------------|-----------------|
| user | View only | Own notifications | None |
| news_manager | Create own, delete own | Own notifications | None |
| admin | Full CRUD all | All notifications | Full access |
