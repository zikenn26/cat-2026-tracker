-- ── 10. Study Materials ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.study_materials (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id            TEXT,
  title               TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type IN ('pdf', 'url')),
  file_path           TEXT, -- Path in Supabase Storage for PDFs
  url                 TEXT, -- For links
  is_shared           BOOLEAN DEFAULT FALSE,
  original_owner_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- For references
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;

-- Owner can do everything
CREATE POLICY "Users can manage own materials" 
  ON public.study_materials FOR ALL 
  USING (auth.uid() = user_id);

-- Others can READ if shared AND (Friend OR Group Member)
CREATE POLICY "Users can view shared materials from friends/groups"
  ON public.study_materials FOR SELECT
  USING (
    is_shared = true AND (
      EXISTS (
        SELECT 1 FROM public.friendships 
        WHERE status = 'accepted' AND (
          (user_id = auth.uid() AND friend_id = study_materials.user_id) OR
          (friend_id = auth.uid() AND user_id = study_materials.user_id)
        )
      ) OR
      EXISTS (
        SELECT 1 FROM public.group_members gm1
        JOIN public.group_members gm2 ON gm1.group_id = gm2.group_id
        WHERE gm1.user_id = auth.uid() AND gm2.user_id = study_materials.user_id
      )
    )
  );
