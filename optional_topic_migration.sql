-- ── MIGRATION: Optional Session Topics ───────────────────────
-- Allow users to start a session without a specific topic.
ALTER TABLE public.sessions ALTER COLUMN topic_id DROP NOT NULL;

-- ── NOTE ON STORAGE ──
-- Ensure you have created the 'study-materials' bucket in the Storage tab.
-- RLS for the bucket:
--   INSERT: authenticated users
--   SELECT: authenticated users (or public if bucket is set to public)
--   DELETE: only the owner (owner field in metadata)
