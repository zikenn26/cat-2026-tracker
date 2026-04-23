-- ============================================================
-- FINAL SOCIAL SCHEMA FIX
-- Adds last_read_at to group_members (for unread counts)
-- Adds deleteGroup/leaveGroup support via RLS
-- Ensures realtime is enabled on all chat tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add last_read_at to track unread messages per user per group
ALTER TABLE public.group_members
  ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Allow members to update their own last_read_at
DROP POLICY IF EXISTS "members_update_own" ON public.group_members;
CREATE POLICY "members_update_own" ON public.group_members FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. Allow admin to delete a group
DROP POLICY IF EXISTS "admin_delete_group" ON public.study_groups;
CREATE POLICY "admin_delete_group" ON public.study_groups FOR DELETE
  USING (created_by = auth.uid());

-- 4. Allow members to remove themselves (leave group)
DROP POLICY IF EXISTS "members_leave_group" ON public.group_members;
CREATE POLICY "members_leave_group" ON public.group_members FOR DELETE
  USING (user_id = auth.uid());

-- 5. Allow admin to remove any member
DROP POLICY IF EXISTS "admin_remove_member" ON public.group_members;
CREATE POLICY "admin_remove_member" ON public.group_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_members gm
      WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- 6. Ensure realtime publication includes all needed tables
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'group_messages already in publication'; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'friendships already in publication'; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'group_members already in publication'; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.study_groups;
  EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'study_groups already in publication'; END;
END $$;

-- 7. Verify
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
