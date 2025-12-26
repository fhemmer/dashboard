-- Add brightness intensity settings for foreground and background colors
-- Separate settings for light and dark modes
-- Values are percentages: 0-200 where 100 is default/normal intensity

ALTER TABLE public.profiles
ADD COLUMN fg_brightness_light numeric DEFAULT 100 CHECK (fg_brightness_light >= 0 AND fg_brightness_light <= 200),
ADD COLUMN bg_brightness_light numeric DEFAULT 100 CHECK (bg_brightness_light >= 0 AND bg_brightness_light <= 200),
ADD COLUMN fg_brightness_dark numeric DEFAULT 100 CHECK (fg_brightness_dark >= 0 AND fg_brightness_dark <= 200),
ADD COLUMN bg_brightness_dark numeric DEFAULT 100 CHECK (bg_brightness_dark >= 0 AND bg_brightness_dark <= 200);
