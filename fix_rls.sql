-- Fix RLS policies — add WITH CHECK for INSERT operations
-- Run in: Supabase Dashboard → SQL Editor → New Query

-- Drop and recreate all policies with proper INSERT support
DROP POLICY IF EXISTS "Users can manage own profile"     ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own topic stats" ON public.topic_stats;
DROP POLICY IF EXISTS "Users can manage own sessions"    ON public.sessions;
DROP POLICY IF EXISTS "Users can manage own streaks"     ON public.streaks;
DROP POLICY IF EXISTS "Users can manage own plans"       ON public.daily_plans;
DROP POLICY IF EXISTS "Users can manage own mocks"       ON public.mock_tests;
DROP POLICY IF EXISTS "Users can manage own errors"      ON public.error_log;
DROP POLICY IF EXISTS "Users can manage own revision"    ON public.revision_queue;
DROP POLICY IF EXISTS "Users can manage own notes"       ON public.notes;

-- Recreate with WITH CHECK (fixes INSERT being blocked)
CREATE POLICY "profiles_policy"       ON public.profiles
  FOR ALL USING (auth.uid() = id)        WITH CHECK (auth.uid() = id);

CREATE POLICY "topic_stats_policy"    ON public.topic_stats
  FOR ALL USING (auth.uid() = user_id)   WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_policy"       ON public.sessions
  FOR ALL USING (auth.uid() = user_id)   WITH CHECK (auth.uid() = user_id);

CREATE POLICY "streaks_policy"        ON public.streaks
  FOR ALL USING (auth.uid() = user_id)   WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_plans_policy"    ON public.daily_plans
  FOR ALL USING (auth.uid() = user_id)   WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mock_tests_policy"     ON public.mock_tests
  FOR ALL USING (auth.uid() = user_id)   WITH CHECK (auth.uid() = user_id);

CREATE POLICY "error_log_policy"      ON public.error_log
  FOR ALL USING (auth.uid() = user_id)   WITH CHECK (auth.uid() = user_id);

CREATE POLICY "revision_queue_policy" ON public.revision_queue
  FOR ALL USING (auth.uid() = user_id)   WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notes_policy"          ON public.notes
  FOR ALL USING (auth.uid() = user_id)   WITH CHECK (auth.uid() = user_id);

-- Verify
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
