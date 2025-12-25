# Plan: Refactor News Module to Database-Backed System

Migrate the news module from direct RSS fetching to the new database-backed architecture, with database-level exclusion filtering and source preference toggles on the news page.

## Steps

### Step 1: Extract icon utilities to news-sources module
Create `src/modules/news-sources/icons.ts` with `sourceIconComponents` map and `getSourceIcon()` helper. Update `src/modules/news-sources/components/source-list.tsx` to import from new location.

### Step 2: Update types to match DB schema
Refactor `src/modules/news/types.ts`: replace `NewsItem` with embedded `source` object (contains `id`, `name`, `iconName`, `brandColor`, `category`), remove `RssSource`, `FeedError`, `FetchNewsResult`.

### Step 3: Rewrite actions with DB-level exclusion filtering
Update `src/modules/news/actions.ts`: replace `fetchNews()` with `getNewsItems()` using a query that LEFT JOINs `user_news_source_exclusions` and filters with `WHERE exclusion.user_id IS NULL`. Add `getUserExcludedSources()`, `toggleSourceExclusion()`, `excludeSource()`, `includeSource()`.

### Step 4: Refactor news-item component
Update `src/modules/news/components/news-item.tsx` to accept source object with `iconName`/`brandColor` instead of string `source`. Import `getSourceIcon` from news-sources icons, remove deprecated `getSourceBrand()` import.

### Step 5: Update widget, page, and add exclusion UI
Modify `src/modules/news/components/news-widget.tsx` to call `getNewsItems()`. Create `src/modules/news/components/source-exclusion-settings.tsx` as a sheet/modal triggered from news page header. Update `src/app/news/page.tsx` with new data flow and "Manage Sources" button.

### Step 6: Update tests and delete deprecated files
Update test files for `actions.ts`, `news-item.tsx`, `news-widget.tsx`, `page.tsx`. Add tests for new `icons.ts` and `source-exclusion-settings.tsx`. Delete deprecated `lib/` folder: `fetcher.ts`, `rss-parser.ts`, `sources.ts`, `source-branding.tsx` and their tests. Update `src/modules/news/index.ts` exports.

## Files to Create
- `src/modules/news-sources/icons.ts`
- `src/modules/news-sources/icons.test.ts`
- `src/modules/news/components/source-exclusion-settings.tsx`
- `src/modules/news/components/source-exclusion-settings.test.tsx`

## Files to Delete
- `src/modules/news/lib/fetcher.ts`
- `src/modules/news/lib/fetcher.test.ts`
- `src/modules/news/lib/rss-parser.ts`
- `src/modules/news/lib/rss-parser.test.ts`
- `src/modules/news/lib/sources.ts`
- `src/modules/news/lib/sources.test.ts`
- `src/modules/news/lib/source-branding.tsx`
- `src/modules/news/lib/source-branding.test.tsx`
- `src/modules/news/data.ts` (mock data no longer needed)
- `src/modules/news/data.test.ts`

## Files to Modify
- `src/modules/news-sources/components/source-list.tsx` (import icons from new location)
- `src/modules/news/types.ts`
- `src/modules/news/actions.ts`
- `src/modules/news/actions.test.ts`
- `src/modules/news/components/news-item.tsx`
- `src/modules/news/components/news-item.test.tsx`
- `src/modules/news/components/news-widget.tsx`
- `src/modules/news/components/news-widget.test.tsx`
- `src/app/news/page.tsx`
- `src/app/news/page.test.tsx`
- `src/modules/news/index.ts`
- `src/modules/news/index.test.ts`
