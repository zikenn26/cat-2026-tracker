-- ============================================================
-- CAT 2026 Study Tracker — SOCIAL FIXES V2
-- ============================================================

-- 1. Fix study_materials foreign keys
ALTER TABLE public.study_materials 
  DROP CONSTRAINT IF EXISTS study_materials_user_id_fkey;

ALTER TABLE public.study_materials 
  ADD CONSTRAINT study_materials_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.study_materials 
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.study_groups(id) ON DELETE SET NULL;

-- 2. Fix study_materials RLS for group members
DROP POLICY IF EXISTS "Users can view materials shared with their groups" ON public.study_materials;
CREATE POLICY "Users can view materials shared with their groups" ON public.study_materials FOR SELECT 
USING (
  group_id IS NOT NULL AND 
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = public.study_materials.group_id 
    AND user_id = auth.uid()
  )
);

-- 3. Fix sessions foreign keys (for group activity stats)
ALTER TABLE public.sessions 
  DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;

ALTER TABLE public.sessions 
  ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Re-enforce profile visibility
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);

-- 5. Fix group_members select policy (ensure it works for everyone to join)
DROP POLICY IF EXISTS "members_select" ON public.group_members;
CREATE POLICY "members_select" ON public.group_members FOR SELECT USING (true);
