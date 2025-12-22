-- Add sidebar_width column to profiles table for persisting user's sidebar width preference
ALTER TABLE public.profiles
ADD COLUMN sidebar_width integer DEFAULT 256 CHECK (sidebar_width >= 200 AND sidebar_width <= 400);
