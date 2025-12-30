-- Create user_themes table for custom theme storage
CREATE TABLE public.user_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  light_variables JSONB NOT NULL,
  dark_variables JSONB NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create index for faster user lookups
CREATE INDEX idx_user_themes_user_id ON public.user_themes(user_id);
CREATE INDEX idx_user_themes_user_active ON public.user_themes(user_id, is_active) WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;

-- Users can view their own themes
CREATE POLICY "Users can view own themes"
  ON public.user_themes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own themes
CREATE POLICY "Users can create own themes"
  ON public.user_themes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own themes
CREATE POLICY "Users can update own themes"
  ON public.user_themes FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own themes
CREATE POLICY "Users can delete own themes"
  ON public.user_themes FOR DELETE
  USING (auth.uid() = user_id);

-- Function to ensure only one active theme per user
CREATE OR REPLACE FUNCTION ensure_single_active_theme()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.user_themes
    SET is_active = false
    WHERE user_id = NEW.user_id AND id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to enforce single active theme
CREATE TRIGGER enforce_single_active_theme
  BEFORE INSERT OR UPDATE ON public.user_themes
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_theme();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_theme_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Revoke direct execute from trigger functions
REVOKE ALL ON FUNCTION ensure_single_active_theme() FROM PUBLIC;
REVOKE ALL ON FUNCTION ensure_single_active_theme() FROM anon;
REVOKE ALL ON FUNCTION ensure_single_active_theme() FROM authenticated;

REVOKE ALL ON FUNCTION update_user_theme_timestamp() FROM PUBLIC;
REVOKE ALL ON FUNCTION update_user_theme_timestamp() FROM anon;
REVOKE ALL ON FUNCTION update_user_theme_timestamp() FROM authenticated;

-- Trigger to auto-update timestamp
CREATE TRIGGER update_user_themes_updated_at
  BEFORE UPDATE ON public.user_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_user_theme_timestamp();
