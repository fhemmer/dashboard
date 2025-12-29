-- Add hidden_chat_models column to profiles table
-- Allows users to filter out models they don't want to see in the model picker

ALTER TABLE public.profiles
ADD COLUMN hidden_chat_models TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.hidden_chat_models IS 'Array of model IDs the user has chosen to hide from the model picker';
