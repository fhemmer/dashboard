-- Create timers table for countdown timer functionality
-- Adapted from tickdown desktop app for web dashboard

CREATE TABLE IF NOT EXISTS public.timers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'New Timer',
  duration_seconds integer NOT NULL DEFAULT 300,
  remaining_seconds integer NOT NULL DEFAULT 300,
  state text NOT NULL DEFAULT 'stopped' CHECK (state IN ('stopped', 'running', 'paused', 'completed')),
  end_time timestamptz,
  enable_completion_color boolean NOT NULL DEFAULT true,
  completion_color text NOT NULL DEFAULT '#4CAF50',
  enable_alarm boolean NOT NULL DEFAULT true,
  alarm_sound text NOT NULL DEFAULT 'default',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS timers_user_id_idx ON public.timers(user_id);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS timers_display_order_idx ON public.timers(user_id, display_order);

-- Enable RLS
ALTER TABLE public.timers ENABLE ROW LEVEL SECURITY;

-- RLS policies: Users can only access their own timers
-- Drop existing policies to make migration idempotent
DROP POLICY IF EXISTS "Users can view own timers" ON public.timers;
DROP POLICY IF EXISTS "Users can insert own timers" ON public.timers;
DROP POLICY IF EXISTS "Users can update own timers" ON public.timers;
DROP POLICY IF EXISTS "Users can delete own timers" ON public.timers;

CREATE POLICY "Users can view own timers" ON public.timers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own timers" ON public.timers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own timers" ON public.timers
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own timers" ON public.timers
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_timers_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_timers_updated ON public.timers;
CREATE TRIGGER on_timers_updated
  BEFORE UPDATE ON public.timers
  FOR EACH ROW EXECUTE FUNCTION public.handle_timers_updated_at();
