-- Update expenditure_sources RLS policies to allow all authenticated users
-- (not just admins) to manage their own expenditures

-- Drop existing admin-only policies
DROP POLICY IF EXISTS "Admins can view own expenditure sources" ON public.expenditure_sources;
DROP POLICY IF EXISTS "Admins can insert own expenditure sources" ON public.expenditure_sources;
DROP POLICY IF EXISTS "Admins can update own expenditure sources" ON public.expenditure_sources;
DROP POLICY IF EXISTS "Admins can delete own expenditure sources" ON public.expenditure_sources;

-- Create new policies for all authenticated users
CREATE POLICY "Users can view own expenditure sources" ON public.expenditure_sources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenditure sources" ON public.expenditure_sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenditure sources" ON public.expenditure_sources
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenditure sources" ON public.expenditure_sources
  FOR DELETE USING (auth.uid() = user_id);
