-- Add last_login column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- Allow users to update their own last_login
CREATE POLICY "Users can update own last_login" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
