-- Add news_last_seen_at column to track when user last viewed news
ALTER TABLE public.profiles
ADD COLUMN news_last_seen_at timestamptz DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.news_last_seen_at IS 'Timestamp of when the user last marked news as read';
