-- ============================================================
-- CAT 2026 Study Tracker — Social Fixes & Group Sharing
-- ============================================================

-- ── 1. Fix Friendships RLS ──────────────────────────────────
-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "friendships_policy" ON public.friendships;

-- New Policies: 
-- 1. View: Both participants can see the record
CREATE POLICY "friendships_select" ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 2. Insert: Only the sender can create the record
CREATE POLICY "friendships_insert" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Update: Only the recipient can accept/reject
CREATE POLICY "friendships_update" ON public.friendships
  FOR UPDATE USING (auth.uid() = friend_id)
  WITH CHECK (auth.uid() = friend_id);

-- 4. Delete: Either user can remove the friendship
CREATE POLICY "friendships_delete" ON public.friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);


-- ── 2. Group-Specific Materials ─────────────────────────────
-- Add group_id to study_materials to allow sharing within groups
ALTER TABLE public.study_materials 
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.study_groups(id) ON DELETE SET NULL;

-- Update RLS for study_materials to include group member access
DROP POLICY IF EXISTS "View Shared Materials" ON public.study_materials;

CREATE POLICY "study_materials_view_policy" 
ON public.study_materials FOR SELECT 
USING (
  auth.uid() = user_id -- Owner
  OR is_shared = true -- Global share
  OR (
    group_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.group_members 
      WHERE group_id = public.study_materials.group_id 
      AND user_id = auth.uid()
    ) -- Group members
  )
);
