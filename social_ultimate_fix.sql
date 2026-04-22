-- ============================================================
-- CAT 2026 Study Tracker — ULTIMATE SOCIAL FIX
-- ============================================================

-- 1. Drop existing tables to clear wrong foreign keys
DROP TABLE IF EXISTS public.group_messages CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.study_groups CASCADE;
DROP TABLE IF EXISTS public.friendships CASCADE;

-- 2. Re-create Friendships with correct references to public.profiles
CREATE TABLE public.friendships (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- 3. Re-create Study Groups
CREATE TABLE public.study_groups (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  description         TEXT,
  created_by          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Re-create Group Members
CREATE TABLE public.group_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role                TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 5. Re-create Group Messages
CREATE TABLE public.group_messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id            UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content             TEXT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS POLICIES ──────────────────────────────────────────────

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Friendships
CREATE POLICY "friendships_select" ON public.friendships FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "friendships_insert" ON public.friendships FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "friendships_update" ON public.friendships FOR UPDATE 
USING (auth.uid() = friend_id);

CREATE POLICY "friendships_delete" ON public.friendships FOR DELETE 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Groups
CREATE POLICY "groups_select" ON public.study_groups FOR SELECT 
USING (true); -- Publicly viewable for join discovery

CREATE POLICY "groups_insert" ON public.study_groups FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Group Members
CREATE POLICY "members_select" ON public.group_members FOR SELECT 
USING (true);

CREATE POLICY "members_manage" ON public.group_members FOR ALL 
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.study_groups WHERE id = group_id AND created_by = auth.uid()
));

-- Group Messages
CREATE POLICY "messages_select" ON public.group_messages FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.group_members WHERE group_id = public.group_messages.group_id AND user_id = auth.uid()
));

CREATE POLICY "messages_insert" ON public.group_messages FOR INSERT 
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.group_members WHERE group_id = public.group_messages.group_id AND user_id = auth.uid()
));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
