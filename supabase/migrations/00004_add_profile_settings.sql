-- Add display_name and theme columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN display_name text,
ADD COLUMN theme text DEFAULT 'default' CHECK (theme IN ('default'));

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
