-- ============================================================
-- CAT 2026 Study Tracker — Social Features Migration
-- ============================================================

-- ── 1. Friendships ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.friendships (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status              TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- ── 2. Study Groups ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_groups (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT NOT NULL,
  description         TEXT,
  created_by          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. Group Members ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_members (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id            UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  joined_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ── 4. Group Messages ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_messages (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id            UUID NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content             TEXT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS Policies ──

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Friendships: Users can only see or manage their own friendships
CREATE POLICY "friendships_policy" ON public.friendships
  FOR ALL USING (auth.uid() = user_id OR auth.uid() = friend_id)
  WITH CHECK (auth.uid() = user_id);

-- Groups: Anyone logged in can see groups, but maybe only members for private ones? 
-- For now, let's allow all authenticated users to see groups and create them.
CREATE POLICY "groups_view_policy" ON public.study_groups
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "groups_create_policy" ON public.study_groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Group Members: Members can see other members
CREATE POLICY "group_members_policy" ON public.group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.group_members WHERE group_id = public.group_members.group_id AND user_id = auth.uid()
    ) OR auth.uid() = user_id
  );

-- Group Messages: Only members can read/write messages
CREATE POLICY "group_messages_read_policy" ON public.group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_members WHERE group_id = public.group_messages.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "group_messages_insert_policy" ON public.group_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.group_members WHERE group_id = public.group_messages.group_id AND user_id = auth.uid()
    )
  );

-- Realtime for the chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
