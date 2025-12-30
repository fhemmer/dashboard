-- Fix agent_runs RLS policy
-- The UPDATE policy for agent_runs blocks Inngest background workers from updating task status.
-- Since Inngest uses supabaseAdmin (service role) which bypasses RLS, 
-- we don't need an UPDATE policy - the INSERT policy already restricts user_id.

DROP POLICY IF EXISTS "Users can update own agent runs" ON public.agent_runs;

-- Add comment explaining why no UPDATE policy exists
COMMENT ON TABLE public.agent_runs IS 
'Background agent task executions. No UPDATE RLS policy because background workers use service role (bypasses RLS).';
