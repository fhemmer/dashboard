-- Update font constraint to include Agave Nerd Font Mono
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_font_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_font_check
CHECK (font IN (
  'geist',
  'inter',
  'roboto',
  'nunito',
  'open-sans',
  'lato',
  'playfair',
  'jetbrains',
  'fira-code',
  'source-serif',
  'merriweather',
  'agave'
));
