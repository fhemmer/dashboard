-- Update theme constraint to allow gold theme
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_theme_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_theme_check
CHECK (theme IN ('default', 'ocean', 'forest', 'sunset', 'gold'));
