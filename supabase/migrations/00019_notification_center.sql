-- Migration: Notification Center + News System Overhaul
-- Creates system_settings, news_sources, news_items, user_news_source_exclusions, and notifications tables
-- Adds news_manager role option to profiles

-- ============================================================================
-- SYSTEM SETTINGS TABLE
-- Key-value store for admin-configurable settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write system settings
CREATE POLICY "Admins can read system settings"
    ON public.system_settings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can insert system settings"
    ON public.system_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update system settings"
    ON public.system_settings
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Service role bypass for the fetcher script
CREATE POLICY "Service role can access system settings"
    ON public.system_settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Seed default settings
INSERT INTO public.system_settings (key, value) VALUES
    ('fetch_interval_minutes', '30'::jsonb),
    ('notification_retention_days', '30'::jsonb),
    ('last_fetch_at', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- NEWS SOURCES TABLE
-- RSS feed sources managed by admins and news managers
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.news_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('tech', 'general', 'ai', 'dev')),
    icon_name TEXT NOT NULL DEFAULT 'blocks',
    brand_color TEXT NOT NULL DEFAULT 'gray',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.news_sources ENABLE ROW LEVEL SECURITY;

-- Everyone can read active news sources
CREATE POLICY "Anyone can read active news sources"
    ON public.news_sources
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Admins can read all sources (including inactive)
CREATE POLICY "Admins can read all news sources"
    ON public.news_sources
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins can insert news sources
CREATE POLICY "Admins can insert news sources"
    ON public.news_sources
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- News managers can insert news sources (created_by must be themselves)
CREATE POLICY "News managers can insert own news sources"
    ON public.news_sources
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'news_manager'
        )
        AND created_by = auth.uid()
    );

-- Admins can update any news source
CREATE POLICY "Admins can update news sources"
    ON public.news_sources
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins can delete any news source
CREATE POLICY "Admins can delete news sources"
    ON public.news_sources
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- News managers can delete their own sources
CREATE POLICY "News managers can delete own news sources"
    ON public.news_sources
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'news_manager'
        )
        AND created_by = auth.uid()
    );

-- Service role bypass for the fetcher script
CREATE POLICY "Service role can access news sources"
    ON public.news_sources
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Index for active sources lookup
CREATE INDEX IF NOT EXISTS idx_news_sources_active ON public.news_sources(is_active) WHERE is_active = true;

-- Seed existing RSS sources
INSERT INTO public.news_sources (url, name, category, icon_name, brand_color, is_active) VALUES
    ('https://news.ycombinator.com/rss', 'Hacker News', 'tech', 'rocket', 'orange', true),
    ('https://feedx.net/rss/ap.xml', 'AP', 'general', 'newspaper', 'red', true),
    ('https://feeds.bbci.co.uk/news/technology/rss.xml', 'BBC Tech', 'tech', 'tv', 'rose', true),
    ('https://feeds.npr.org/1001/rss.xml', 'NPR News', 'general', 'radio', 'blue', true),
    ('https://feeds.npr.org/1019/rss.xml', 'NPR Tech', 'tech', 'mic', 'sky', true),
    ('https://www.dr.dk/nyheder/service/feeds/allenyheder', 'DR Nyheder', 'general', 'globe', 'emerald', true),
    ('https://www.technologyreview.com/topic/artificial-intelligence/feed', 'MIT Tech AI', 'ai', 'brain', 'violet', true),
    ('https://venturebeat.com/category/ai/feed/', 'VentureBeat AI', 'ai', 'binary', 'fuchsia', true),
    ('https://code.visualstudio.com/feed.xml', 'VS Code', 'dev', 'code-2', 'cyan', true)
ON CONFLICT (url) DO NOTHING;

-- ============================================================================
-- NEWS ITEMS TABLE
-- Fetched news articles from RSS feeds
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.news_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES public.news_sources(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    summary TEXT,
    link TEXT NOT NULL,
    image_url TEXT,
    published_at TIMESTAMPTZ NOT NULL,
    guid_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read news items
CREATE POLICY "Anyone can read news items"
    ON public.news_items
    FOR SELECT
    TO authenticated
    USING (true);

-- Only service role can insert/update/delete news items (via fetcher script)
CREATE POLICY "Service role can manage news items"
    ON public.news_items
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_news_items_source ON public.news_items(source_id);
CREATE INDEX IF NOT EXISTS idx_news_items_published ON public.news_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_created ON public.news_items(created_at DESC);

-- ============================================================================
-- USER NEWS SOURCE EXCLUSIONS TABLE
-- Opt-out tracking for users who don't want certain sources
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_news_source_exclusions (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES public.news_sources(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, source_id)
);

-- Enable RLS
ALTER TABLE public.user_news_source_exclusions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own exclusions
CREATE POLICY "Users can read own exclusions"
    ON public.user_news_source_exclusions
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own exclusions"
    ON public.user_news_source_exclusions
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own exclusions"
    ON public.user_news_source_exclusions
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Service role bypass for the fetcher script
CREATE POLICY "Service role can access exclusions"
    ON public.user_news_source_exclusions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Index for efficient exclusion lookups
CREATE INDEX IF NOT EXISTS idx_user_news_exclusions_user ON public.user_news_source_exclusions(user_id);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- Unified notifications for news, PRs, expenditures, system announcements
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('news', 'pr', 'expenditure', 'system')),
    title TEXT NOT NULL,
    message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Users can delete (dismiss) their own notifications
CREATE POLICY "Users can delete own notifications"
    ON public.notifications
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Service role can manage all notifications (for fetcher script and system announcements)
CREATE POLICY "Service role can manage notifications"
    ON public.notifications
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Admins can insert system notifications for any user
CREATE POLICY "Admins can insert notifications"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- ============================================================================
-- UPDATE PROFILES ROLE CONSTRAINT
-- Add news_manager as a valid role option
-- ============================================================================

-- First, drop the existing constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint with news_manager role
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('user', 'admin', 'news_manager'));
